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

test("customer creation is a normal form, not a required JSON upload",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#createCard")).toBeVisible();
  await expect(page.locator("#createNow")).toBeDisabled();
  await expect(page.locator("#planJson")).toHaveCount(0);
  await page.locator("#loadDemo").click();
  await expect(page.locator("#jobTitle")).toHaveValue(/PROOFLY Demo/);
  await expect(page.locator("#jobReference")).toHaveValue(/raw.githubusercontent.com/);
  await expect(page.locator("#jobContributor")).toHaveValue("");
  await expect(page.locator("#createNow")).toBeDisabled();
});
test("untrusted reference URL fails closed before hashing or wallet write",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await page.locator("#jobReference").fill("https://evil.example/reference.txt");
  await page.locator("#verifyReference").click();
  await expect(page.locator("#referenceStatus")).toContainText("commit-pinned GitHub");
  await expect(page.locator("#createNow")).toBeDisabled();
});

test("sample contributor button is clearly labeled and fills known demo wallet",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#fillDemoContributor")).toBeVisible();
  await page.locator("#fillDemoContributor").click();
  await expect(page.locator("#jobContributor")).toHaveValue("0xd6b8a3a5eb329410d9504784812b8569afa8c2af");
  await expect(page.locator("#createNow")).toBeDisabled(); // no wallet signature automatically
});

test("share URL panel is hidden before a contract read confirms a work order",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#orderHandoff")).toBeHidden();
  await expect(page.locator("#shareOrderUrl")).toBeAttached();
  await expect(page.locator("#copyOrderLink")).toBeAttached();
});
test("Contributor share link loads order ID automatically, without connecting wallet",async({page})=>{
  await page.goto("/?order=2",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#orderId")).toHaveValue("2");
  await expect(page.locator("#createNow")).toBeDisabled();
});

test("Contributor account connects without installing a MetaMask Snap",async({page})=>{
  await page.addInitScript(()=>{
    window.__walletCalls=[];
    window.ethereum={
      isMetaMask:true,
      on(){},
      request:async({method})=>{
        window.__walletCalls.push(method);
        if(method==="eth_requestAccounts")return ["0xd6b8a3a5eb329410d9504784812b8569afa8c2af"];
        if(method==="eth_chainId")return "0xf22f";
        if(method==="wallet_getSnaps"||method==="wallet_requestSnaps")
          throw new Error("Automatic Snap installation must not happen");
        throw new Error("Unexpected injected wallet method: "+method);
      }
    };
  });
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await page.locator("#connectWallet").click();
  await expect(page.locator("#walletState")).toContainText("Connected / 0xd6b8a3a5eb329410d9504784812b8569afa8c2af / Studionet 61999");
  const calls=await page.evaluate(()=>window.__walletCalls);
  expect(calls).toEqual(["eth_requestAccounts","eth_chainId"]);
});
test("wrong-chain account fails before SDK and never triggers Snap prompts",async({page})=>{
  await page.addInitScript(()=>{
    window.__walletCalls=[];
    window.ethereum={
      isMetaMask:true,on(){},request:async({method})=>{
        window.__walletCalls.push(method);
        if(method==="eth_requestAccounts")return ["0xd6b8a3a5eb329410d9504784812b8569afa8c2af"];
        if(method==="eth_chainId")return "0x1";
        throw Error("Unexpected wallet method");
      }
    };
  });
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await page.locator("#connectWallet").click();
  await expect(page.locator("#walletState")).toContainText("Wrong network");
  await expect(page.locator("#walletState")).toContainText("No Snap installation is needed");
  expect(await page.evaluate(()=>window.__walletCalls)).toEqual(["eth_requestAccounts","eth_chainId"]);
});
