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
  await expect(page.locator("#jobContributor")).toHaveValue("0xd6b8a3a5eb329410d9504784812b8569afa8c2af");
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
        if(method==="eth_accounts")return [];
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
  expect(calls).toContain("eth_requestAccounts");
  expect(calls).toContain("eth_chainId");
  expect(calls).not.toContain("wallet_requestSnaps");
});
test("wrong-chain account fails before SDK and never triggers Snap prompts",async({page})=>{
  await page.addInitScript(()=>{
    window.__walletCalls=[];
    window.ethereum={
      isMetaMask:true,on(){},request:async({method})=>{
        window.__walletCalls.push(method);
        if(method==="eth_accounts")return [];
        if(method==="eth_requestAccounts")return ["0xd6b8a3a5eb329410d9504784812b8569afa8c2af"];
        if(method==="eth_chainId")return "0x1";
        throw Error("Unexpected wallet method");
      }
    };
  });
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await page.locator("#connectWallet").click();
  await expect(page.locator("#walletState")).toContainText("Wrong network");
  await expect(page.locator("#walletState")).toContainText("GenLayer Studionet");
  const calls=await page.evaluate(()=>window.__walletCalls);
  expect(calls).toContain("eth_requestAccounts");
  expect(calls).not.toContain("wallet_requestSnaps");
});

test("My Work section is visible but requires connected wallet, no fabricated jobs",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#myWorkCard")).toBeVisible();
  await expect(page.locator("#myWorkStatus")).toContainText("Connect your wallet");
  await expect(page.locator("#myWorkList .my-work-row")).toHaveCount(0);
  await expect(page.locator("#refreshMyWork")).toBeVisible();
});

test("MetaMask accountChanged switches Owner to Contributor without another connection prompt",async({page})=>{
  await page.addInitScript(()=>{
    window.__walletCalls=[];
    const owner="0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb";
    const contributor="0xd6b8a3a5eb329410d9504784812b8569afa8c2af";
    window.__account=owner;
    window.__listeners={};
    window.ethereum={
      isMetaMask:true,
      on(event,handler){window.__listeners[event]=handler;},
      async request({method}){
        window.__walletCalls.push(method);
        if(method==="eth_accounts")return [window.__account];
        if(method==="eth_chainId")return "0xf22f";
        throw Error("Unexpected wallet method: "+method);
      }
    };
    window.__switchToContributor=()=>{
      window.__account=contributor;
      window.__listeners.accountsChanged?.([contributor]);
    };
  });
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#walletState")).toContainText("0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb");
  await page.evaluate(()=>window.__switchToContributor());
  await expect(page.locator("#walletState")).toContainText("0xd6b8a3a5eb329410d9504784812b8569afa8c2af");
  const calls=await page.evaluate(()=>window.__walletCalls);
  expect(calls).not.toContain("eth_requestAccounts");
  expect(calls).not.toContain("eth_sendTransaction");
  expect(calls).not.toContain("wallet_requestSnaps");
});

test("normal-user workspace puts wallet and next-step first and hides technical console",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.locator("main.app-shell > #walletActionsCard")).toBeVisible();
  await expect(page.locator("#nextStepTitle")).toContainText("Connect your wallet");
  await expect(page.locator("#myWorkCard")).toBeVisible();
  await expect(page.locator("#currentOrderCard")).toBeVisible();
  await expect(page.locator("#createCard")).toBeVisible();
  await expect(page.locator("#technicalTransaction")).toBeHidden();
  await page.locator("#advancedTools > summary").click();
  await expect(page.locator("#technicalTransaction")).toBeVisible();
  await expect(page.locator("#writeAction")).toBeDisabled();
});
test("manual order lookup is optional and collapsed by default",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#orderId")).toBeHidden();
  await page.locator(".manual-lookup > summary").click();
  await expect(page.locator("#orderId")).toBeVisible();
});
test("paste of a pinned document auto-verifies when field loses focus",async({page})=>{
  await page.route("**/fixtures/evidence/reference.txt",r=>r.fulfill({
    status:200,contentType:"text/plain",
    headers:{"access-control-allow-origin":"*"},
    body:"A public trial environment guide. No real money is accepted."
  }));
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await page.locator("#jobReference").fill(
    "https://raw.githubusercontent.com/bearbaba/PROOFLY/fa4d29b0e6f8efb50e2472530aff1d0ab7aca77e/fixtures/evidence/reference.txt");
  await page.locator("#jobReference").press("Tab");
  await expect(page.locator("#referenceStatus")).toContainText("Reference verified", {timeout:12000});
  await expect(page.locator("#createNow")).toBeDisabled(); // wallet signature is still required
});

test("normal wallet screen avoids scary default transaction status before any wallet write",async({page})=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#transactionNotice")).toBeHidden();
  await expect(page.locator("#technicalTransaction")).toBeHidden();
  await expect(page.locator("#writeAction")).toBeDisabled();
});
