// O230 (founder-directed): the app shell, proven in a browser.
//
// The unit's claim is that this site stops being a set of pages with links between them and starts
// being an app. Three things have to be true for that, and each is a test here rather than a
// screenshot: the front door IS the product, one bar moves between the app's four places and knows
// where it is, and the sheet behaves like a sheet — modal, dismissible without a gesture, and
// returning focus to whatever opened it.
//
// The touch floor and the safe-area padding are asserted from real geometry, because both are
// claims about a phone and both are invisible in a desktop capture — the exact failure mode that
// made O225's letterboxing survive a review.

import { expect, test } from "@playwright/test";
import { APP_TABS } from "../src/app-shell/tabs";

test("the front door is the app, not a story", async ({ page }) => {
  await page.goto("/");
  // The finder's own entry field, on the root route. If this ever fails, a landing page came back.
  await expect(page.getByLabel(/Describe the GP you are looking for/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Find a GP" }).or(page.getByRole("button", { name: "Talk instead of typing" }))).toBeVisible();
});

test("the old finder address still lands on the finder, as a redirect", async ({ page }) => {
  const response = await page.goto("/finder");
  expect(new URL(page.url()).pathname).toBe("/");
  // A 308 collapses into the final 200 by the time Playwright reports it; the proof the redirect
  // happened is the address bar above and the chain below.
  expect(response?.status()).toBe(200);
  await expect(page.getByLabel(/Describe the GP you are looking for/i)).toBeVisible();
});

test("the story kept every word it had, at its own address", async ({ page }) => {
  await page.goto("/story");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The figures the compliance-linted stat rail carries, still on the page after the move.
  await expect(page.getByText("6–12 months")).toBeVisible();
  await expect(page.getByText(/Indicative figures pending source confirmation/i)).toBeVisible();
});

test("one bar reaches every place the app has, and says which one you are in", async ({ page }) => {
  await page.goto("/");
  const bar = page.getByRole("navigation", { name: "Sections" });
  await expect(bar).toBeVisible();

  for (const tab of APP_TABS) {
    const link = bar.getByRole("link", { name: tab.label, exact: true });
    await expect(link, `${tab.label} is missing from the bar`).toBeVisible();
    // Icon AND label: the research's one hard rule for health-app navigation.
    await expect(link).toContainText(tab.label);
  }

  for (const tab of APP_TABS) {
    await bar.getByRole("link", { name: tab.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${tab.href === "/" ? "/$" : `${tab.href}$`}`));
    await expect(
      bar.getByRole("link", { name: tab.label, exact: true }),
      `${tab.label} does not mark itself current`,
    ).toHaveAttribute("aria-current", "page");
    // Exactly one tab claims the page at a time.
    await expect(bar.locator('[aria-current="page"]')).toHaveCount(1);
  }
});

test("every tab clears the touch floor and the bar clears the safe area", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "Sections" }).getByRole("link");
  const count = await links.count();
  expect(count).toBe(APP_TABS.length);
  for (let i = 0; i < count; i += 1) {
    const box = await links.nth(i).boundingBox();
    expect(box, `tab ${i} has no box`).not.toBeNull();
    // 44px is the fingertip floor both platforms publish; the bar is built to 56.
    expect(box!.height, `tab ${i} is under the 44px touch floor`).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
  // Nothing the app renders sits under the bar: the last control on the welcome screen is above it.
  const barBox = await page.getByRole("navigation", { name: "Sections" }).boundingBox();
  const lastControl = await page.getByRole("button", { name: "Try an example search" }).boundingBox();
  expect(lastControl!.y + lastControl!.height).toBeLessThanOrEqual(barBox!.y + 1);
});

test("the bar gets out of the way inside a task", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
  await page.getByRole("button", { name: "Try an example search" }).click();
  // A native push hides the tab bar; so does this one, and the way back is the screen's own.
  await expect(page.getByRole("navigation", { name: "Sections" })).toHaveCount(0);
});

test("O233: the bar holds destinations, and what is consulted once lives in settings", async ({ page }) => {
  await page.goto("/");
  const bar = page.getByRole("navigation", { name: "Sections" });
  await expect(bar.getByRole("link")).toHaveCount(3);
  for (const label of ["Find", "Profile", "Learn"]) {
    await expect(bar.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  // The three that left the bar are reachable, and reachable from ONE place.
  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings).toBeVisible();
  for (const name of [/About ADHD\.ME/, /^Questions/, /Worked examples/, /^Privacy/]) {
    await expect(settings.getByRole("link", { name })).toBeVisible();
  }
  // The finder's own switch rides in the same sheet, so there is one settings surface.
  await expect(settings.locator(".finder-demo-toggle input")).toBeVisible();
});

test("O233: settings reaches About, and the bar does not claim it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("link", { name: /About ADHD\.ME/ }).click();
  await expect(page).toHaveURL(/\/story$/);
  // /story is not a tab route any more, so it carries no bar at all.
  await expect(page.getByRole("navigation", { name: "Sections" })).toHaveCount(0);
});

test("O233: the Profile tab shows what the device holds, and can forget it", async ({ page }) => {
  await page.goto("/profile");
  // Before any search the honest state is empty, and the empty state offers the action that fills it.
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await expect(page.getByText(/held on this device only/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Describe what you need/ })).toBeVisible();

  // Search, then come back: the words are there.
  await page.goto("/");
  await page.getByRole("textbox").fill("a woman GP in Epping who speaks Mandarin");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.locator(".me-facts").getByText("a woman GP in Epping who speaks Mandarin")).toBeVisible();

  await page.getByRole("button", { name: /Forget what I typed/ }).click();
  await expect(page.getByText("a woman GP in Epping who speaks Mandarin")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Describe what you need/ })).toBeVisible();
});

test("O233: the welcome screen leads with the question and the box, not a tagline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What kind of GP are you looking for?");
  await expect(page.getByText(/takes you seriously/i)).toHaveCount(0);
  // The box is the subject of the screen: multi-line, and taller than any control on it.
  const box = page.getByRole("textbox");
  await expect(box).toBeVisible();
  const height = (await box.boundingBox())!.height;
  expect(height, "the compose box is not the focus of the screen").toBeGreaterThan(110);
  // Enter searches; Shift+Enter does not.
  await box.fill("a GP near Epping");
  await box.press("Shift+Enter");
  await expect(page.locator(".clinician-list")).toHaveCount(0);
  await box.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
});

test("the sheet is a dialog: it traps focus, closes on Escape and gives focus back", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Settings" });
  await trigger.click();

  const sheet = page.getByRole("dialog", { name: "Settings" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute("aria-modal", "true");
  // Focus moved inside on open — not left on the trigger behind the scrim.
  await expect(sheet.locator(":focus")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);
  // And handed back to what opened it, which is what makes a keyboard walk survive the detour.
  await expect(trigger).toBeFocused();
});

test("the sheet's handle is a control, not an ornament — the drag has a tap equivalent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  const sheet = page.getByRole("dialog", { name: "Settings" });
  const half = (await sheet.boundingBox())!.height;

  // Every gesture needs a tap equivalent: the grabber cycles the detents for anybody who cannot
  // drag, which is Material's own accessibility rule for this exact component.
  const handle = page.getByRole("button", { name: /Expand Settings/i });
  const handleBox = (await handle.boundingBox())!;
  expect(handleBox.height, "the handle is under the 48px floor its own guidance sets").toBeGreaterThanOrEqual(48);
  await handle.click();
  await expect.poll(async () => (await sheet.boundingBox())!.height).toBeGreaterThan(half);

  await page.getByRole("button", { name: /Shrink Settings/i }).click();
  await expect.poll(async () => (await sheet.boundingBox())!.height).toBeLessThan(half + 1);

  // An explicit close control exists, so dismissal is never gesture-only.
  await page.getByRole("button", { name: "Close Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);
});

test("the switch inside the sheet still changes the roster it names", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  const toggle = page.locator(".finder-demo-toggle input");
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
  await page.keyboard.press("Escape");
  // The finder is still operable after a modal detour — the thing a sheet most often breaks.
  await expect(page.getByRole("button", { name: "Try an example search" })).toBeVisible();
});

// O234 (founder-directed): the profile's filters, the place it holds, and the map on results.

test("the profile's filters narrow the finder, are said on the results, and clear from there", async ({ page }) => {
  await page.goto("/profile");
  await page.getByLabel("Suburb or postcode").fill("Beecroft");
  await page.getByRole("switch", { name: /Woman GP/ }).check();
  await page.getByRole("switch", { name: /Taking new patients/ }).check();
  await expect(page.getByText("2 on", { exact: true })).toBeVisible();
  // A language chip is a pressed button whose name stays the language — the tick is not in it.
  await page.getByRole("button", { name: "Tamil", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tamil", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("3 on", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tamil", exact: true }).click();
  await expect(page.getByText("2 on", { exact: true })).toBeVisible();
  // O248: a way of working is a filter like any other, and says so on results.
  await page.getByRole("button", { name: "Open to wearable data", exact: true }).click();
  await expect(page.getByText("3 on", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open to wearable data", exact: true }).click();
  await expect(page.getByText("2 on", { exact: true })).toBeVisible();

  // The place set here is the finder's place, with no ?place= on the link.
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Find", exact: true }).click();
  await page.getByRole("textbox").fill("someone who can do the whole assessment");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Map", exact: true })).toBeVisible();

  const strip = page.getByRole("group", { name: "Your filters" });
  await expect(strip).toContainText("Woman GP");
  await expect(strip).toContainText("Taking new patients");
  // Every row on a narrowed list answers the filters: the roster is narrowed before ranking, so
  // the reasons printed on the rows cannot name a GP the filters excluded.
  const rows = page.locator(".clinician-row");
  expect(await rows.count()).toBeGreaterThan(0);

  await strip.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("group", { name: "Your filters" })).toHaveCount(0);
  // The place survives a clear — it orders, it never excluded anybody.
  await expect(page.getByRole("button", { name: "Map", exact: true })).toBeVisible();
  // And the device agrees with the screen.
  await page.goto("/profile");
  await expect(page.getByText("None on", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Suburb or postcode")).toHaveValue("Beecroft");
});

test("a resolved place draws the nearby map, whose markers key the rows and find them", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("a woman GP who speaks Tamil");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".nearby-map")).toHaveCount(0);
  await expect(page.getByLabel("Where are you?")).toHaveCount(0);

  // The place comes from the profile (or a link), never from a field on results.
  await page.goto("/profile");
  await page.getByLabel("Suburb or postcode").fill("Beecroft");
  await page.goto("/");
  await page.getByRole("textbox").fill("a woman GP who speaks Tamil");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  // O238: the map is behind one control, closed by default — the list is the screen.
  await expect(page.locator(".nearby-map")).toHaveCount(0);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  const map = page.locator(".nearby-map");
  await expect(map).toBeVisible();
  // O235: a real basemap — Leaflet's container, OpenStreetMap's attribution (the licence needs it),
  // and the app's own 44px zoom controls in place of Leaflet's 30px ones.
  await expect(map.locator(".leaflet-container")).toBeVisible({ timeout: 20000 });
  await expect(map.getByRole("link", { name: "OpenStreetMap" })).toBeVisible();
  for (const name of ["Zoom in", "Zoom out"]) {
    const box = await map.getByRole("button", { name, exact: true }).boundingBox();
    expect(box!.width, `${name} is under the touch floor`).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  // Every row shown carries a key, and every marker names rows that exist.
  const keys = page.locator(".row-key");
  await expect(keys.first()).toHaveText("1");
  const markers = map.locator(".leaflet-marker-icon.nearby-marker:not(.is-you)");
  expect(await markers.count()).toBeGreaterThan(0);
  const label = await markers.first().getAttribute("aria-label");
  expect(label).toMatch(/row/);

  // Tapping a marker finds its row: focus lands on the row the marker names.
  await markers.first().click({ force: true });
  const focused = page.locator(".clinician-row:focus");
  await expect(focused).toHaveCount(1);
  const position = await focused.locator(".row-key").textContent();
  expect(label).toContain(`row ${position}`);

  // A place outside coverage takes the map away with it rather than drawing a map of nowhere.
  await page.goto("/profile");
  await page.getByLabel("Suburb or postcode").fill("Nowhere");
  await page.goto("/?place=Nowhere");
  await page.getByRole("textbox").fill("a woman GP who speaks Tamil");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Map", exact: true })).toHaveCount(0);
  await expect(page.locator(".nearby-map")).toHaveCount(0);
  await expect(page.locator(".row-key")).toHaveCount(0);
});

test("filters nobody answers say so and give both ways out", async ({ page }) => {
  await page.goto("/profile");
  for (const name of [/Woman GP/, /telehealth/, /Bulk billing/, /Longer appointments/, /Wheelchair access/]) {
    await page.getByRole("switch", { name }).check();
  }
  for (const language of ["Arabic", "Igbo", "Urdu"]) await page.getByRole("button", { name: language, exact: true }).click();
  await page.goto("/");
  await page.getByRole("textbox").fill("someone who can do the whole assessment");
  await page.keyboard.press("Enter");
  await expect(page.locator("main[data-stage='results']")).toBeVisible();
  await expect(page.getByText("No listed GP answers every filter you set.")).toBeVisible();
  await expect(page.locator(".clinician-row")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Change them" })).toHaveAttribute("href", "/profile");
  await page.getByRole("button", { name: "Clear the filters" }).click();
  await expect(page.locator(".clinician-list .clinician-row").first()).toBeVisible();
  await expect(page.getByText("No listed GP answers every filter you set.")).toHaveCount(0);
});

test("the consent notice, the bar and the finder are one shell at every width", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const notice = page.getByRole("region", { name: "Privacy" });
  await expect(notice).toBeVisible();
  const shell = await page.locator(".care-shell").boundingBox();
  const bar = await page.getByRole("navigation", { name: "Sections" }).boundingBox();
  const card = await notice.boundingBox();
  // The notice never floats past the app it is talking about, and the bar is the shell's width.
  expect(card!.x).toBeGreaterThanOrEqual(shell!.x - 1);
  expect(card!.x + card!.width).toBeLessThanOrEqual(shell!.x + shell!.width + 1);
  expect(Math.abs(bar!.width - shell!.width)).toBeLessThanOrEqual(2);
  // The question, the box and the example link share one left edge.
  const h1 = await page.getByRole("heading", { level: 1 }).boundingBox();
  const box = await page.getByRole("textbox").boundingBox();
  const link = await page.getByRole("button", { name: "Try an example search" }).boundingBox();
  expect(Math.abs(h1!.x - box!.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(link!.x - box!.x)).toBeLessThanOrEqual(3);
});

test("O244: a Learn quiz can be played through, is never about the reader, and remembers being finished", async ({ page }) => {
  await page.goto("/approach");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/What finding ADHD care actually looks like/);
  await page.getByRole("button", { name: /Myth or fact\?/ }).click();
  const total = 6;
  for (let i = 0; i < total; i += 1) {
    await expect(page.locator(".learn-question.is-current")).toHaveCount(1);
    const options = page.locator(".learn-question.is-current .learn-option");
    await options.first().click();
    // The reveal names the outcome and explains; the buttons lock.
    await expect(page.locator(".learn-question.is-current .learn-reveal")).toBeVisible();
    await expect(options.first()).toBeDisabled();
    await page.getByRole("button", { name: i === total - 1 ? "See my score" : "Next", exact: true }).click();
  }
  await expect(page.locator(".learn-score.is-current")).toBeVisible();
  await expect(page.locator(".learn-score")).toContainText(/\d of 6/);
  await expect(page.locator(".learn-score")).toContainText("never about you");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("button", { name: /Myth or fact\?/ })).toContainText("Done");
  // Remembered on this device.
  await page.reload();
  await expect(page.getByRole("button", { name: /Myth or fact\?/ })).toContainText("Done");
});
