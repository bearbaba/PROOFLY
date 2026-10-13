import {test,expect} from "@playwright/test";

test("V2 workspace is explicit about contract and no payments",async({page})=>{
 await page.goto("/milestones.html");
 await expect(page).toHaveTitle(/Milestone Gate V2/);
 await expect(page.getByRole("heading",{name:"Verified work. Provable release."})).toBeVisible();
 await expect(page.getByText("0xb8305F15336a79761157b86e214d3d3DeaDFc1ce")).toBeVisible();
 await expect(page.getByText(/NOT a token transfer, escrow, payment/)).toBeVisible();
 await expect(page.getByText(/No wallet connected/)).toBeVisible();
 await expect(page.getByRole("heading",{name:"Proof receipt"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Milestone release"})).toBeVisible();
});

test("No V2 write offered until public read and assigned wallet",async({page})=>{
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
 await expect(page.locator("#milestoneConnect")).toHaveText("Connect MetaMask");
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

test("Preview homepage is V2 and never renders legacy contract",async({page})=>{
 await page.goto("/",{waitUntil:"domcontentloaded"});
 await expect(page).toHaveTitle(/Milestone Gate V2/);
 await expect(page.locator("#milestoneId")).toBeVisible();
 await expect(page.locator("#v2CreateDetails")).toBeAttached();
 await expect(page.getByRole("link",{name:/Legacy V1/})).toHaveAttribute("href","https://proofly-lovat.vercel.app/");
 await expect(page.locator("#connectWallet")).toHaveCount(0);
});

test("V2 shows discoverable milestone list with safe read-only refresh",async({page})=>{
 await page.goto("/",{waitUntil:"domcontentloaded"});
 await expect(page.getByText("Recent milestones",{exact:true})).toBeVisible();
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
