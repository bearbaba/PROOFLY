import {test,expect} from "@playwright/test";

test("Indexed workspace is explicit about contract and no payments",async({page})=>{
 await page.goto("/milestones.html");
 await expect(page).toHaveTitle(/Indexed Milestone Workspace/);
 await expect(page.getByRole("heading",{name:"Verified work. Provable release."})).toBeVisible();
 await expect(page.getByText("0xb8305F15336a79761157b86e214d3d3DeaDFc1ce")).toBeVisible();
 await expect(page.getByText(/NOT a token transfer, escrow, payment/)).toBeVisible();
 await expect(page.getByText(/No wallet connected/)).toBeVisible();
 await expect(page.getByRole("heading",{name:"Proof receipt"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Milestone release"})).toBeVisible();
});

test("No write offered until public read and assigned wallet",async({page})=>{
 await page.goto("/milestones.html");
 await expect(page.getByText(/Load a work order to see (the next )?eligible action/)).toBeVisible();
 await expect(page.getByText(/Awaiting order selection/)).toHaveCount(2);
 await expect(page.getByRole("button",{name:/Claim on-chain release authorization/})).toHaveCount(0);
});

test("New milestone form displays immutable-reference and three-criterion checks",async({page})=>{
 await page.goto("/milestones.html");
 await page.getByText("+ Configure new milestone").click();
 await expect(page.getByLabel("PINNED AGREED REFERENCE URL")).toBeVisible();
 await expect(page.getByRole("button",{name:/Fetch & hash reference/})).toBeVisible();
 await expect(page.getByLabel("ACCEPTANCE CRITERION R1")).toBeVisible();
 await expect(page.getByLabel("ACCEPTANCE CRITERION R2")).toBeVisible();
 await expect(page.getByLabel("ACCEPTANCE CRITERION R3")).toBeVisible();
 await expect(page.getByText(/The latest checked hash is recomputed before signing/)).toBeVisible();
});

test("Negative template prefills rubric but does not sign or bypass reference verification",async({page})=>{
 await page.goto("/milestones.html");
 await page.getByText("+ Configure new milestone").click();
 await page.getByRole("button",{name:/Fill negative-test milestone template/}).click();
 await expect(page.locator("#v2Title")).toHaveValue("Sandbox Integration Negative Acceptance Test");
 await expect(page.locator("#v2Contributor")).toHaveValue("0xd6b8a3a5eb329410d9504784812b8569afa8c2af");
 await expect(page.locator("#v2R3")).toHaveValue(/AUTH_401/);
 await expect(page.locator("#v2ReferenceStatus")).toContainText("Click Fetch & hash");
 await expect(page.locator("#milestoneTx")).toContainText("without submitting anything");
});

test("V2 has a visible transaction status surface and persistent MetaMask connect action",async({page})=>{
 await page.goto("/milestones.html");
 await expect(page.locator("#v2LiveStatus")).toBeHidden();
 await expect(page.locator("#v2LiveTitle")).toHaveCount(1);
 await expect(page.locator("#v2LiveLinks")).toHaveCount(1);
 await expect(page.locator("#milestoneConnect")).toHaveText("Connect Wallet");
});

test("V2 landing page exposes the real create workflow and positive demo without signing",async({page})=>{
 await page.goto("/milestones.html");
 await page.getByRole("link",{name:/Create a real milestone/}).click();
 await expect(page.locator("#v2CreateDetails")).toHaveAttribute("open","");
 await page.getByRole("button",{name:/Fill accepted-demo milestone template/}).click();
 await expect(page.locator("#v2Title")).toHaveValue("Sandbox API Integration Handoff — Live Demonstration");
 await expect(page.locator("#v2R3")).toHaveValue(/Retry-After/);
 await expect(page.locator("#v2ReferenceStatus")).toContainText("Fetch & hash");
 await expect(page.locator("#milestoneTx")).toContainText("no wallet request or on-chain write");
});

test("Preview homepage is indexed and never renders legacy contract",async({page})=>{
 await page.goto("/",{waitUntil:"domcontentloaded"});
 await expect(page).toHaveTitle(/Indexed Milestone Workspace/);
 await expect(page.locator("#milestoneId")).toBeVisible();
 await expect(page.locator("#v2CreateDetails")).toBeAttached();
 await expect(page.getByRole("link",{name:/Contract source/})).toHaveAttribute("href","https://github.com/bearbaba/PROOFLY/blob/main/contracts/proofly/milestone_gate_v3_indexed.py");
 await expect(page.locator("#connectWallet")).toHaveCount(0);
});

test("V2 shows discoverable milestone list with safe read-only refresh",async({page})=>{
 await page.goto("/",{waitUntil:"domcontentloaded"});
 await expect(page.getByText("Recent milestones",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:/Refresh list/})).not.toBeVisible();
 await page.locator("#v2MyWorkDrawer summary").click();
 await expect(page.getByRole("button",{name:/Refresh list/})).toBeVisible();
 await expect(page.locator("#v2RecentOrders")).toBeAttached();
 await expect(page.locator("#milestoneId")).toHaveValue("1");
});

test("Discovery has wallet-linked My work heading and can open assigned work",async({page})=>{
 await page.goto("/");
 await expect(page.locator("#v2DiscoveryTitle")).toHaveText("Recent milestones");
 await expect(page.locator("#v2RecentOrders")).toBeAttached();
});

test("V2 historical discovery exposes pagination and wallet scan controls",async({page})=>{
 await page.goto("/");
 await expect(page.locator("#v2DiscoveryProgress")).toBeAttached();
 await expect(page.locator("#v2LoadOlder")).toBeAttached();
 await expect(page.locator("#v2FindMyWork")).toBeAttached();
 await expect(page.locator("#v2DiscoveryTitle")).toBeVisible();
});

test("My Work stays collapsed until opened and is bounded for large lists",async({page})=>{
 await page.goto("/milestones.html");
 const drawer=page.locator("#v2MyWorkDrawer");
 await expect(drawer).not.toHaveAttribute("open","");
 await expect(drawer.locator("summary")).toBeVisible();
 await expect(page.locator("#v2RecentOrders")).not.toBeVisible();
 await drawer.locator("summary").click();
 await expect(drawer).toHaveAttribute("open","");
 await expect(page.locator("#v2RecentOrders")).toBeVisible();
 const maxHeight=await page.locator("#v2RecentOrders").evaluate(node=>getComputedStyle(node).maxHeight);
 expect(maxHeight).toBe("300px");
 await drawer.locator("summary").click();
 await expect(page.locator("#v2RecentOrders")).not.toBeVisible();
});

test("Create shows a visible blocker next to the button when no MetaMask account is connected",async({page})=>{
 await page.goto("/milestones.html");
 await page.locator("#v2CreateDetails").evaluate(el=>{el.open=true;});
 await page.locator("#v2CreateForm").dispatchEvent("submit");
 await expect(page.locator("#v2CreateStatus")).toContainText("Connect the Owner MetaMask wallet");
 await expect(page.locator("#v2CreateStatus")).toHaveClass(/milestone-error/);
});

test("Transaction history stays compact but preserves a saved tx across refreshes",async({page})=>{
 await page.addInitScript(()=>{
  const key="proofly.indexed.61999.b8305f15336a79761157b86e214d3d3deadfc1ce.tx-history.v1";
  localStorage.setItem(key,JSON.stringify([{hash:"0x"+"1".repeat(64),account:"0x"+"a".repeat(40),
   method:"accept_order",orderId:"2",submittedAt:Date.now(),status:"ONCHAIN_VERIFIED"}]));
 });
 await page.goto("/milestones.html");
 await expect(page.locator("#txHistoryDrawer")).not.toHaveAttribute("open","");
 await expect(page.locator("#txHistoryCount")).toHaveText("1");
 await page.locator("#txHistoryToggle").click();
 await expect(page.locator("#txHistoryList")).toContainText("accept order");
 await expect(page.locator("#txHistoryList")).toContainText("Effect verified on-chain");
 await expect(page.locator("#txHistoryList a")).toHaveAttribute("href","https://explorer-studio.genlayer.com/tx/0x"+"1".repeat(64));
 await page.reload();
 await expect(page.locator("#txHistoryCount")).toHaveText("1");
 await expect(page.locator("#txHistoryDrawer")).not.toHaveAttribute("open","");
});

test("Public completion card defaults to hidden and is not fabricated from URL alone",async({page})=>{
 await page.goto("/?order=2",{waitUntil:"domcontentloaded"});
 await expect(page.locator("#milestoneCelebration")).toBeHidden();
 await expect(page.locator("#milestoneSuccessTitle")).toHaveText("Milestone successfully verified");
 await expect(page.locator("#txHistoryToggle")).toBeVisible();
});

test("Connect, switch, and Disconnect are explicit while public records and tx history survive",async({page})=>{
 await page.addInitScript(()=>{
  window.__walletCalls=[];
  window.__walletAccount="0x"+"a".repeat(40);
  window.__walletListeners={};
  const historyKey="proofly.indexed.61999.b8305f15336a79761157b86e214d3d3deadfc1ce.tx-history.v1";
  localStorage.setItem(historyKey,JSON.stringify([{
   hash:"0x"+"9".repeat(64),account:"0x"+"a".repeat(40),method:"create_order",
   orderId:"2",submittedAt:Date.now(),status:"ONCHAIN_VERIFIED"
  }]));
  window.ethereum={
   on:(event,handler)=>{window.__walletListeners[event]=handler;},
   request:async({method})=>{
    window.__walletCalls.push(method);
    if(method==="eth_accounts"||method==="eth_requestAccounts")return [window.__walletAccount];
    if(method==="eth_chainId")return "0xf22f";
    throw Error("Unexpected wallet RPC "+method);
   }
  };
 });
 await page.goto("/milestones.html?order=2");
 await expect(page.locator("#milestoneWallet")).toContainText("Connected");
 await expect(page.locator("#milestoneDisconnect")).toBeVisible();
 await expect(page.locator("#milestoneConnect")).toHaveText("Reconnect / Switch Wallet");
 await page.evaluate(()=>{
  window.__walletAccount="0x"+"b".repeat(40);
  window.__walletListeners.accountsChanged([window.__walletAccount]);
 });
 await expect(page.locator("#milestoneWallet")).toContainText("0xbbbbbb");
 await page.locator("#milestoneDisconnect").click();
 await expect(page.locator("#milestoneWallet")).toContainText("Disconnected from PROOFLY");
 await expect(page.locator("#milestoneDisconnect")).toBeHidden();
 await expect(page.locator("#milestoneConnect")).toHaveText("Connect Wallet");
 await expect(page.locator("#milestoneId")).toHaveValue("2");
 await expect(page.locator("#txHistoryCount")).toHaveText("1");
 await page.evaluate(()=>window.__walletListeners.accountsChanged(["0x"+"a".repeat(40)]));
 await expect(page.locator("#milestoneWallet")).toContainText("Disconnected from PROOFLY");
 await page.reload();
 await expect(page.locator("#milestoneConnect")).toHaveText("Connect Wallet");
 await expect(page.locator("#milestoneDisconnect")).toBeHidden();
 expect(await page.evaluate(()=>window.__walletCalls.filter(x=>x==="eth_accounts"||x==="eth_requestAccounts"))).toEqual([]);
 await expect(page.locator("#txHistoryCount")).toHaveText("1");
 await page.locator("#milestoneConnect").click();
 await expect(page.locator("#milestoneWallet")).toContainText("Connected");
 await expect(page.locator("#milestoneDisconnect")).toBeVisible();
});

test("Disconnected session does not trigger network switches or wallet prompts on refresh",async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem("proofly.indexed.61999.b8305f15336a79761157b86e214d3d3deadfc1ce.wallet-disconnected.v1","1");
  window.__walletCalls=[];
  window.ethereum={on:()=>{},request:async({method})=>{
    window.__walletCalls.push(method);
    if(method==="eth_chainId")return "0x1";
    if(method==="eth_accounts"||method==="eth_requestAccounts")return ["0x"+"a".repeat(40)];
    throw Error("Unexpected wallet request: "+method);
  }};
 });
 await page.goto("/");
 await expect(page.locator("#milestoneConnect")).toHaveText("Connect Wallet");
 await expect(page.locator("#milestoneDisconnect")).toBeHidden();
 const called=await page.evaluate(()=>window.__walletCalls);
 expect(called).not.toContain("eth_accounts");
 expect(called).not.toContain("eth_requestAccounts");
 expect(called).not.toContain("wallet_switchEthereumChain");
 expect(called).not.toContain("wallet_requestSnaps");
});
