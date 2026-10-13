import {test,expect} from "@playwright/test";

test("V2 workspace is explicit about contract and no payments",async({page})=>{
 await page.goto("/milestones.html");
 await expect(page).toHaveTitle(/Milestone Gate V2/);
 await expect(page.getByRole("heading",{name:"Verified work. Provable release."})).toBeVisible();
 await expect(page.getByText("0xD67245387dF5448671235CE00c8969664b5aF8bd")).toBeVisible();
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
