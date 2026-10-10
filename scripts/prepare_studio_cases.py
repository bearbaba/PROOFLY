"""Prepare pinned public fixture URLs after committing and pushing the fixtures.

Does not deploy, sign, connect a wallet or send any blockchain transaction.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, msg, headers, newurl):
        return None


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args])


def main():
    commit = git("rev-parse", "HEAD").decode().strip()
    origin = git("remote", "get-url", "origin").decode().strip()
    if origin not in ("https://github.com/bearbaba/PROOFLY.git", "https://github.com/bearbaba/PROOFLY",
                       "git@github.com:bearbaba/PROOFLY.git"):
        sys.exit("Expected origin bearbaba/PROOFLY.")
    if git("status", "--porcelain", "--", "fixtures/evidence").strip():
        sys.exit("Commit fixture changes first. Parameters must match committed bytes.")
    opener = urllib.request.build_opener(NoRedirect())
    base = f"https://raw.githubusercontent.com/bearbaba/PROOFLY/{commit}/fixtures/evidence/"
    verified = {}
    for name in ("reference", "pass", "changes", "unknown", "injection"):
        committed = git("show", f"HEAD:fixtures/evidence/{name}.txt")
        url = base + name + ".txt"
        try:
            with opener.open(url, timeout=20) as response:
                actual = response.read(16001)
                if response.status != 200:
                    sys.exit(f"HTTP failure for {name}.")
        except (OSError, urllib.error.URLError) as exc:
            sys.exit(f"Cannot fetch public fixture {name}: {exc}. Confirm this commit was pushed. "
                     "Private repositories cannot serve these URLs to validators. "
                     "Do not put access tokens in URLs; a public fixture host is required.")
        if actual != committed or len(actual) > 16000:
            sys.exit(f"Byte mismatch or size limit for {name}. No parameters generated.")
        verified[name] = {"url": url, "sha256": hashlib.sha256(actual).hexdigest()}
        print(f"Verified public bytes: {name}")
    requirements = json.loads(git("show", "HEAD:fixtures/evidence/requirements.json"))
    constructor = {"requirements_json": json.dumps(requirements, ensure_ascii=False, separators=(",", ":")),
                   "reference_url": verified["reference"]["url"],
                   "reference_sha256": verified["reference"]["sha256"]}
    expected = {"pass": "ACCEPTED", "changes": "CHANGES_REQUIRED",
                "unknown": "EVIDENCE_REQUIRED", "injection": "CHANGES_REQUIRED"}
    cases = [{"method": "verify", "args": {"case_id": name + "-v1",
              "artifact_url": verified[name]["url"], "artifact_sha256": verified[name]["sha256"]},
              "expected_outcome_to_measure_not_force": outcome} for name, outcome in expected.items()]
    target = ROOT / "build/proofly-studio-cases.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"commit": commit, "constructor": constructor, "cases": cases},
                                ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Ready: {target}")
    print("No contract has been deployed. Live results have NOT been verified.")


if __name__ == "__main__":
    main()
