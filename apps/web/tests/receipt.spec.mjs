import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { canonicalJson } from "../receipt-model.mjs";

const sha = b => createHash("sha256").update(b).digest("hex");
const BASE = "https://raw.githubusercontent.com/bearbaba/PROOFLY/" +
  "a".repeat(40) + "/fixtures/evidence/";
async function sampleFiles(inject = false) {
  const malicious = "<svg/onload=window.__prooflyXss=1>";
  const artifact = Buffer.from("Artifact content with evidence.", "utf8");
  const reference = Buffer.from("Reference content with citation.", "utf8");
  const criteria = ["R1", "R2", "R3"].map(id => ({
    id, text: (inject && id === "R1") ? malicious + " " + id : "Document objective " + id
  }));
  const spec = {
    policy: "proofly.work-order.v1", criteria, reference_url: BASE + "reference.txt",
    reference_sha256: sha(reference), submit_deadline: 100, revision_deadline: 200
  };
  const order = {
    id: "1", title: "Documentation", owner: "0x" + "1".repeat(40),
    contributor: "0x" + "2".repeat(40), spec, status: "COMPLETED",
    submissions: [{version:1,artifact_url:BASE+"pass.txt",
      artifact_sha256:sha(artifact),submitted_at:120,outcome:"ACCEPTED"}]
  };
  const receipt = {
    schema:"proofly.work-order.v1", order_id:"1", version:1, chain_id:1337,
    contract:"0x"+"4".repeat(40), artifact_url:BASE+"pass.txt",
    artifact_sha256:sha(artifact), reference_url:spec.reference_url,
    reference_sha256:sha(reference), submitted_at:120, outcome:"ACCEPTED",
    results:criteria.map(({id}) => ({
      id,status:"SATISFIED",reason_code:"EVIDENCE_SUPPORTS",
      artifact_quote:"Artifact content",reference_quote:"Reference content"
    }))
  };
  const digest = sha(Buffer.from(canonicalJson({
    policy:"proofly.work-order.v1",chain_id:1337,contract:receipt.contract,
    order_id:order.id,owner:order.owner,contributor:order.contributor,
    title:order.title,spec
  })));
  order.spec_sha256 = receipt.spec_sha256 = digest;
  return {order,receipt,artifact,reference};
}
async function attach(page, data, options = {}) {
  const json = value => Buffer.from(JSON.stringify(value), "utf8");
  await page.locator("#orderFile").setInputFiles({
    name:"order.json",mimeType:"application/json",buffer:json(data.order)
  });
  await page.locator("#receiptFile").setInputFiles({
    name:"receipt.json",mimeType:"application/json",
    buffer:options.receiptBytes || json(data.receipt)
  });
  await page.locator("#artifactFile").setInputFiles({
    name:"artifact.txt",mimeType:"text/plain",buffer:options.artifactBytes || data.artifact
  });
  await page.locator("#referenceFile").setInputFiles({
    name:"reference.txt",mimeType:"text/plain",buffer:data.reference
  });
  await page.locator("#verifyButton").click();
}
test.beforeEach(async ({page}) => {
  await page.route(/https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto("/receipt.html", {waitUntil:"domcontentloaded"});
});
test("shows upfront offline-only boundary", async ({page}) => {
  await expect(page.getByText("Offline integrity is not onchain verification.")).toBeVisible();
  await expect(page.locator("#verdict")).toHaveText("Not checked");
  await expect(page.locator("#findingsSection")).toBeHidden();
});
test("valid four-file bundle renders audit but NOT finality", async ({page}) => {
  await attach(page, await sampleFiles());
  await expect(page.locator("#verdict")).toHaveText("Structurally consistent");
  await expect(page.locator("#errors")).toContainText("does not authenticate onchain data");
  await expect(page.locator(".receipt-requirement")).toHaveCount(3);
  await expect(page.locator("#metadata")).toContainText("NOT VERIFIED");
  await expect(page.locator("#message")).toContainText("Independent network verification");
});
test("tampered evidence triggers a visible cryptographic error", async ({page}) => {
  const bundle = await sampleFiles();
  await attach(page,bundle,{artifactBytes:Buffer.from("Tampered")});
  await expect(page.locator("#verdict")).toHaveText("Integrity check failed");
  await expect(page.locator("#errors")).toContainText("ARTIFACT_BYTE_HASH");
});
test("duplicate JSON field is rejected before audit", async ({page}) => {
  const bundle = await sampleFiles();
  const raw = JSON.stringify(bundle.receipt).replace('"outcome":"ACCEPTED"',
    '"outcome":"ACCEPTED","outcome":"CHANGES_REQUIRED"');
  await attach(page,bundle,{receiptBytes:Buffer.from(raw)});
  await expect(page.locator("#verdict")).toHaveText("Integrity check failed");
  await expect(page.locator("#errors")).toContainText("Duplicate JSON key");
});
test("untrusted criterion text remains inert DOM content", async ({page}) => {
  await page.evaluate(() => {window.__prooflyXss = 0});
  await attach(page,await sampleFiles(true));
  await expect(page.locator("#verdict")).toHaveText("Structurally consistent");
  await expect(page.locator(".receipt-requirement").first()).toContainText("<svg/onload=window.__prooflyXss=1>");
  await expect(page.locator("svg")).toHaveCount(0);
  expect(await page.evaluate(() => window.__prooflyXss)).toBe(0);
});
test("mobile inspector stays within viewport", async ({page}) => {
  await page.setViewportSize({width:375,height:812});
  await attach(page,await sampleFiles());
  const dimensions=await page.evaluate(()=>({
    width:window.innerWidth,content:document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width+2);
});
