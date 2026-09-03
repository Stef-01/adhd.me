// O251 (founder-directed): a live demo to GPs from across the Gold Coast. Every way a person in
// that room would type where they are has to land: a postcode, a suburb with its state, a comma,
// a half-typed name chosen from the list. And the map has to show the coast, with faces.
import { expect, test, type Page } from "@playwright/test";

async function searchFrom(page: Page, place: string) {
  await page.goto("/profile");
  const field = page.getByLabel("Suburb or postcode");
  await field.fill(place);
  await page.keyboard.press("Escape");
  await page.goto("/");
  await page.getByRole("textbox").fill("a GP who takes new patients");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

test("a postcode is a place: 4220 measures from Burleigh Heads and draws the coast", async ({ page }) => {
  await page.goto("/profile");
  await page.getByLabel("Suburb or postcode").fill("4220");
  await expect(page.getByText("Distances are measured from Burleigh Heads (4220).")).toBeVisible();
  await searchFrom(page, "4220");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  const map = page.locator(".nearby-map");
  await expect(map.locator(".leaflet-container")).toBeVisible({ timeout: 20000 });
  const markers = map.locator(".leaflet-marker-icon.nearby-marker:not(.is-you)");
  expect(await markers.count()).toBeGreaterThanOrEqual(3);
  // The rows say how far, as a straight line, from the postcode's suburb.
  await expect(page.locator(".clinician-row").first()).toContainText(/km away|in your suburb|telehealth/);
});

test("a suburb with its state, or a comma and a postcode, resolves", async ({ page }) => {
  await page.goto("/profile");
  const field = page.getByLabel("Suburb or postcode");
  await field.fill("Southport QLD");
  await expect(page.getByText("Distances are measured from Southport (4215).")).toBeVisible();
  await field.fill("Coolangatta, 4225");
  await expect(page.getByText("Distances are measured from Coolangatta (4225).")).toBeVisible();
  await field.fill("Main Beach 4217");
  await expect(page.getByText("Distances are measured from Main Beach (4217).")).toBeVisible();
});

test("a half-typed suburb is offered, never guessed: arrow keys and Enter choose it", async ({ page }) => {
  await page.goto("/profile");
  const field = page.getByLabel("Suburb or postcode");
  await field.fill("burl");
  await expect(page.getByText("We do not cover that location yet.")).toBeVisible();
  const options = page.getByRole("listbox", { name: "Places" }).getByRole("option");
  await expect(options).toHaveText(["Burleigh Heads4220", "Burleigh Waters4220"]);
  await expect(field).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("Burleigh Waters");
  await expect(page.getByText("Distances are measured from Burleigh Waters (4220).")).toBeVisible();
  await expect(page.getByRole("listbox", { name: "Places" })).toBeHidden();
});

test("a tap on a suggestion chooses it, and a postcode prefix suggests postcodes", async ({ page }) => {
  await page.goto("/profile");
  const field = page.getByLabel("Suburb or postcode");
  await field.fill("cool");
  await page.getByRole("option", { name: /Coolangatta/ }).click();
  await expect(field).toHaveValue("Coolangatta");
  await field.fill("422");
  const options = page.getByRole("listbox", { name: "Places" }).getByRole("option");
  expect(await options.count()).toBeGreaterThanOrEqual(4);
  for (const text of await options.allTextContents()) expect(text).toMatch(/422\d$/);
  // Every suggestion is a 44px target — the touch floor holds inside the list.
  const box = await options.first().boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test("the coast is populated, and the markers are faces where the roster has one", async ({ page }) => {
  await searchFrom(page, "Surfers Paradise");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  const map = page.locator(".nearby-map");
  await expect(map.locator(".leaflet-container")).toBeVisible({ timeout: 20000 });
  const markers = map.locator(".leaflet-marker-icon.nearby-marker:not(.is-you)");
  expect(await markers.count()).toBeGreaterThanOrEqual(4);
  // A face where the roster carries a portrait; the row key stays as a badge on it.
  const faces = map.locator(".nearby-marker-pin.has-face img");
  expect(await faces.count()).toBeGreaterThanOrEqual(1);
  await expect(map.locator(".nearby-marker-key").first()).toHaveText(/^\d+\+?$/);
  // Every face is a portrait the tree serves itself — no third-party origin.
  for (const src of await faces.evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src")))) {
    expect(src).toMatch(/^\/(portraits|clinicians)\//);
  }
  // A marker is still a 44px target and still names its rows.
  const box = await markers.first().boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(await markers.first().getAttribute("aria-label")).toMatch(/row/);
});

test("the link form works too: ?place=4217 arrives measured from Surfers Paradise", async ({ page }) => {
  await page.goto("/?place=4217");
  await page.getByRole("textbox").fill("a GP who takes new patients");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Map", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/Surfers Paradise/);
});
