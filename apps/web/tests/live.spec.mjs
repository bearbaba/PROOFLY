import { test,expect } from "@playwright/test";
test("live UI labels real Studionet and blocks unsigned writes", async ({page})=>{
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.getByText("GENLAYER STUDIONET · 61999")).toBeVisible();
  await expect(page.locator("#writeAction")).toBeDisabled();
  await expect(page.locator("#walletState")).toContainText("No wallet connected");
  await expect(page.locator("#orderId")).toHaveValue("1");
  await expect(page.locator("#receiptVersion")).toHaveValue("1");
});
test("live UI fits narrow mobile viewport",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await page.setViewportSize({width:375,height:812});
  await expect(page.locator("#connectWallet")).toBeVisible();
  const sizes=await page.evaluate(()=>({inner:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.inner+2);
});
