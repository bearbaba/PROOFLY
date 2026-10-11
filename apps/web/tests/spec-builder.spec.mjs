import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  // Keep the browser suite deterministic even without third-party font CDNs.
  await page.route(/https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto("/builder.html", { waitUntil: "domcontentloaded" });
});

test("loads a visibly offline, structurally valid sample", async ({ page }) => {
  await expect(page.getByText("LOCAL PROTOTYPE")).toBeVisible();
  await expect(page.getByText("Build preview, not a live dApp.")).toBeVisible();
  await expect(page.locator("#healthBadge")).toHaveText("Structure valid");
  await expect(page.locator("#errorCount")).toHaveText("00");
  await expect(page.locator("#exportButton")).toBeEnabled();
  await expect(page.locator("#criteria .criterion")).toHaveCount(3);
});

test("invalid content blocks export until corrected", async ({ page }) => {
  await page.locator("#title").fill("");
  await expect(page.locator("#healthBadge")).toHaveText("Needs review");
  await expect(page.locator("#exportButton")).toBeDisabled();
  await page.locator("#title").fill("Evidence-based guide");
  await expect(page.locator("#healthBadge")).toHaveText("Structure valid");
  await expect(page.locator("#exportButton")).toBeEnabled();
});

test("requirements can be added and removed without losing controls", async ({ page }) => {
  await page.locator("#addCriterion").click();
  await expect(page.locator("#criteria .criterion")).toHaveCount(4);
  await expect(page.locator("#criterionCount")).toHaveText("4 / 5");
  await expect(page.locator("#exportButton")).toBeDisabled();
  await page.locator("#criterion-3").fill("Include a source-supported migration checklist.");
  await expect(page.locator("#exportButton")).toBeEnabled();
  await page.getByRole("button", { name: "Remove requirement 4" }).click();
  await expect(page.locator("#criteria .criterion")).toHaveCount(3);
  await expect(page.locator("#exportButton")).toBeEnabled();
});

test("export is unsigned JSON and never reports an onchain verdict", async ({ page }) => {
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportButton").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("proofly-work-order-draft.json");
  const result = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(result.schema).toBe("proofly.offline-draft.v1");
  expect(result.criteria).toHaveLength(3);
  expect(result.reference_url).toContain("/fixtures/evidence/reference.txt");
  expect(result.disclaimer).toMatch(/Unsigned draft/i);
  expect(result).not.toHaveProperty("outcome");
  expect(result).not.toHaveProperty("finalized");
  await expect(page.locator("#actionMessage")).toContainText("No transaction was submitted");
});

test("HTML-like user input remains inert text", async ({ page }) => {
  await page.evaluate(() => { window.__prooflyXss = 0; });
  await page.locator("#criterion-0").fill("<svg/onload=window.__prooflyXss=1> explain trial environment");
  await page.locator("#title").fill("<img src=x onerror=window.__prooflyXss=2>");
  await expect(page.locator("svg")).toHaveCount(0);
  await expect(page.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__prooflyXss)).toBe(0);
  await expect(page.locator("#exportButton")).toBeEnabled();
});

test("mobile view does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator("#title")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 2);
});

test("bad reference URL and hash cannot be exported", async ({ page }) => {
  await page.locator("#source").fill("https://evil.example/resource.txt");
  await page.locator("#sourceHash").fill("not-a-sha");
  await expect(page.locator("#exportButton")).toBeDisabled();
  await expect(page.locator("#issues")).toContainText("reference_url");
  await expect(page.locator("#issues")).toContainText("reference_sha256");
});

test("exports exact seven-argument Studio call plan without submitting transactions", async ({ page }) => {
  await expect(page.locator("#studioButton")).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#studioButton").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("proofly-studio-create-order-unsigned.json");
  const plan = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(plan.functionName).toBe("create_order");
  expect(plan.schema).toBe("proofly.studio-create-order.v1");
  expect(plan.args).toHaveLength(7);
  expect(typeof plan.args[2]).toBe("string");
  expect(JSON.parse(plan.args[2])).toHaveLength(3);
  expect(plan.stage).toBe("UNSIGNED_CALL_PLAN");
  expect(plan).not.toHaveProperty("transactionHash");
  expect(plan).not.toHaveProperty("contract_address");
  await expect(page.locator("#actionMessage")).toContainText("No wallet was accessed");
});
test("invalid spec blocks Studio call export", async ({ page }) => {
  await page.locator("#sourceHash").fill("nope");
  await expect(page.locator("#studioButton")).toBeDisabled();
});
