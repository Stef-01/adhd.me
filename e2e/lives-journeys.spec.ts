import { expect, test } from "./support/test";
import { pauseNow } from "./support/fake-clock";
import { allowedMs } from "../src/lives/session";
import { game } from "../src/lives/games";
import { layoutGame, SCENE } from "../src/lives/layout";
import { JOURNEYS } from "../src/lives/journeys";
import { expectNoViolations } from "./support/a11y";

// Zoe, Mia and Arjun have dedicated stateful worlds with their own full-flow suites.
for (const journey of JOURNEYS.filter(j => j.who !== "zoe" && j.who !== "mia" && j.who !== "arjun")) {
  test(`${journey.who}: direct entry, every round, practical ending and replay`, async ({ page }) => {
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 900 });
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto("/lives/characters");
    // The fixture's hydration wait is capped and swallowed. On a loaded runner the cast screen can
    // take longer than that cap to become live, and a click that lands first is not the Link's
    // soft navigation: it failed here on a different character each run, with the journey's root
    // never found. Wait for the screen itself, then for the journey's URL, and give the arrival
    // Playwright's own navigation window rather than a shorter one of this spec's.
    await page.waitForFunction(() => Number(document.documentElement.getAttribute("data-hydrated") ?? "0") >= 2, undefined, { timeout: 30000 });
    await page.getByRole("link", { name: `Play ${journey.who.charAt(0).toUpperCase() + journey.who.slice(1)}’s moment →`, exact: true }).click();
    await page.waitForURL(`**/lives/play/${journey.slug}`, { timeout: 30000 });
    const root = page.locator(".character-journey");
    await expect(root).toHaveAttribute("data-phase", "playing", { timeout: 30000 });
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("slider")).toHaveCount(0);
    const counts: number[] = [];
    const capture = async (name: string) => {
      const count = (await root.innerText()).trim().split(/\s+/).length;
      counts.push(count); expect(count, `${journey.who} ${name} words`).toBeLessThanOrEqual(60);
      await page.screenshot({ path: `qa/_runs/${journey.who}-${name}.png`, fullPage: true });
    };
    const before = await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"));
    for (let round = 0; round < journey.rounds.length; round++) {
      await expect(root).toHaveAttribute("data-round", String(round));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(journey.rounds[round]!.title);
      await capture(`round-${round + 1}`);
      await expectNoViolations(page, `${journey.who} round ${round + 1}`);
      if (journey.rounds[round]!.game === "nina_first_line") {
        await expect(page.getByRole("button", { name: "Keep this draft" })).toBeDisabled();
        await page.getByRole("textbox", { name: "First line" }).fill("This is a rough first line.");
      }
      for (let tries = 0; tries < 50 && await root.getAttribute("data-phase") === "playing"; tries++) {
        const target = root.locator('[data-outcome="hit"]:enabled').first();
        await target.focus(); await page.keyboard.press("Enter");
      }
      await expect(root).toHaveAttribute("data-phase", "result");
      await expect(root.getByRole("status")).toHaveText("Got it.");
      await page.getByRole("button", { name: round + 1 < journey.rounds.length ? "Next moment" : "Try a different approach", exact: true }).click();
    }
    for (const step of journey.practice) {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(step.title);
      await capture(`practice-${journey.practice.indexOf(step) + 1}`);
      await expectNoViolations(page, `${journey.who} practice ${journey.practice.indexOf(step) + 1}`);
      await page.getByRole("button", { name: step.choices[step.correct]!, exact: true }).click();
    }
    await expect(root).toHaveAttribute("data-phase", "complete");
    await capture("complete");
    console.log(`${journey.who}: ${counts.join(", ")} visible words; max ${Math.max(...counts)}`);
    await expectNoViolations(page, `${journey.who} completion`);
    await expect(page.getByRole("link", { name: "Try this in my day" })).toHaveAttribute("href", /module=/);
    expect(await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"))).toBe(before);
    await page.getByRole("button", { name: "Play again", exact: true }).click();
    await expect(root).toHaveAttribute("data-phase", "playing", { timeout: 15000 });
    await expect(root).toHaveAttribute("data-round", "0");
    expect(errors).toEqual([]);
  });

  test(`${journey.who}: pause, recoverable miss and responsive scene`, async ({ page }) => {
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/lives/play/${journey.slug}`);
      const root = page.locator(".character-journey");
      await expect(root).toHaveAttribute("data-phase", "playing", { timeout: 15000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (journey.who === "jax") {
        const boxes = await root.locator(".is-intruder").evaluateAll(es => es.map(e => e.getBoundingClientRect().toJSON()));
        for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
          expect(boxes[a]!.right <= boxes[b]!.left || boxes[b]!.right <= boxes[a]!.left || boxes[a]!.bottom <= boxes[b]!.top || boxes[b]!.bottom <= boxes[a]!.top, "shopping targets must not overlap").toBe(true);
        }
      }
      await expectNoViolations(page, `${journey.who} active ${width}`);
      await page.screenshot({ path: `qa/_runs/${journey.who}-${width}.png`, fullPage: true });
      await page.getByRole("button", { name: "Pause game", exact: true }).click();
      await expect(root).toHaveAttribute("data-phase", "paused");
      await expect(root.locator('[data-outcome="hit"]:enabled')).toHaveCount(0);
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      const miss = root.locator('[data-outcome="miss"]:enabled').first();
      if (await miss.count()) {
        await miss.click(); await expect(root).toHaveAttribute("data-phase", "result");
        await page.getByRole("button", { name: "Try again", exact: true }).click();
        await expect(root).toHaveAttribute("data-phase", "playing", { timeout: 15000 });
      }
    }
  });
  test(`${journey.who}: timed mechanics finish through real controls`, async ({ page }) => {
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install();
    await page.goto(`/lives/play/${journey.slug}`, { waitUntil: "load" });
    await expect(page.locator(".character-journey")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    await pauseNow(page);
    const root = page.locator(".character-journey");
    for (let round = 0; round < journey.rounds.length; round++) {
      const definition = game(journey.rounds[round]!.game);
      const scene = layoutGame(definition, round + 1, 4103 + round * 120);
      const duration = allowedMs(definition, round + 1, true);
      if (definition.id === "nina_first_line") {
        await page.clock.runFor(30000);
        await expect(root).toHaveAttribute("data-phase", "playing");
        await page.getByRole("textbox", { name: "First line" }).fill("One small start.");
        await page.getByRole("button", { name: "Keep this draft" }).click();
      } else if (definition.engine === "trace_path") {
        const box = (await page.locator(".lives-trace-surface").boundingBox())!;
        const points = scene.routes!.find(r => r.safe)!.points.map(p => ({ x: box.x + p.x / SCENE.width * box.width, y: box.y + p.y / SCENE.height * box.height }));
        await page.mouse.move(points[0]!.x, points[0]!.y); await page.mouse.down();
        for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 4 });
        await page.mouse.up();
      } else if (definition.engine === "inhibition") {
        await page.clock.runFor(duration + 100);
      } else if (definition.engine === "hold_release") {
        const hold = page.locator(".lives-hold-button");
        await hold.focus(); await page.keyboard.down("Space");
        await page.clock.runFor(duration * (scene.hold!.cueAt + .03));
        await page.keyboard.up("Space");
      } else {
        for (let action = 0; action < 80 && await root.getAttribute("data-phase") === "playing"; action++) {
          const hit = root.locator('[data-outcome="hit"]:enabled').first();
          if (await hit.count()) await hit.click();
          else await page.clock.runFor(250);
        }
      }
      await expect(root).toHaveAttribute("data-phase", "result");
      await expect(root.getByRole("status")).toHaveText("Got it.");
      await page.getByRole("button", { name: round + 1 < journey.rounds.length ? "Next moment" : "Try a different approach", exact: true }).click();
    }
    await expect(root).toHaveAttribute("data-phase", "practice");
  });

}

test("Maya can physically trace the clear route and wipe both sensory layers", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/lives/play/maya-one-thing-at-a-time");
  const scene = layoutGame(game("maya_crossing"), 1, 4103);
  const route = scene.routes!.find(r => r.safe)!;
  const box = (await page.locator(".lives-trace-surface").boundingBox())!;
  const points = route.points.map(p => ({ x: box.x + p.x / SCENE.width * box.width, y: box.y + p.y / SCENE.height * box.height }));
  await page.mouse.move(points[0]!.x, points[0]!.y); await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator(".character-journey")).toHaveAttribute("data-phase", "result");
  await expect(page.getByRole("status")).toHaveText("Got it.");
  for (let round = 1; round < 3; round++) {
    await page.getByRole("button", { name: "Next moment", exact: true }).click();
    const tiles = page.locator('.lives-tile:enabled');
    while (await tiles.count()) await tiles.first().click();
    await expect(page.getByRole("status")).toHaveText("Got it.");
  }
});

test("a timed journey pauses when hidden, resumes and resets after a deadline", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/lives/play/jax-just-the-list", { waitUntil: "load" });
  const root = page.locator(".character-journey");
  await expect(root).toHaveAttribute("data-ready", "true");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole("button", { name: "Pause game" }).click();
  const remaining = await page.getByRole("timer").textContent();
  await page.clock.runFor(30000);
  await expect(page.getByRole("timer")).toHaveText(remaining!);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(root).toHaveAttribute("data-phase", "paused");
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(12000);
  await expect(root).toHaveAttribute("data-phase", "result");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(root).toHaveAttribute("data-phase", "playing");
  await expect(page.getByRole("timer")).not.toHaveText("0s");
});
