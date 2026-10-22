import { test, expect } from "@playwright/test";

test("complete cinematic birthday experience", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto(process.env.BIRTHSITE_TEST_HOME || "/");
  await expect(
    page.getByRole("heading", {
      name: /Some days are made for a little magic/,
    }),
  ).toBeVisible();
  await expect(page.locator(".hero-copy h1")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-photo img")).toHaveJSProperty(
    "complete",
    true,
  );
  await page.getByRole("button", { name: "Sound off" }).click();
  await expect(page.getByRole("button", { name: "Sound on" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Sound on" }).click();
  await page.getByRole("button", { name: "Open your surprise" }).click();
  await expect(page.locator(".countdown-number")).toHaveText("3");
  await expect(page.locator(".countdown-number")).toHaveText("2", {
    timeout: 2000,
  });
  await expect(page.locator(".countdown-number")).toHaveText("1", {
    timeout: 2000,
  });
  await expect(
    page.getByRole("heading", { name: "It’s Your Day, Beautiful!" }),
  ).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".cinematic-reveal")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Come a little closer" }).click();
  await expect(page.locator(".cloud-overlay")).toBeVisible();
  await expect(page.getByLabel("Your birth year")).toBeVisible();
  await page.getByLabel("Your birth year").fill("2005");
  await page.getByRole("button", { name: "Let the magic in" }).click();
  await expect(page.locator("#unlock-error")).toHaveText(
    "Not quite. Try the year you were born.",
  );
  await page.getByLabel("Your birth year").fill("2006");
  await page.getByRole("button", { name: "Let the magic in" }).click();
  await expect(
    page.getByRole("heading", { name: /It’s your day, Olivia/ }),
  ).toBeVisible();
  await expect(page.locator(".memory-polaroid")).toHaveCount(3);
  await page.locator(".memory-polaroid").first().click();
  await expect(
    page.getByRole("dialog", { name: "Birthday photo gallery" }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".lightbox-count")).toHaveText("2 / 3");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open your letter", exact: true })
    .click();
  await expect(page.getByRole("article")).toContainText(
    "Some people make the world feel a little softer",
  );
  await page.getByRole("button", { name: "Blow out the candles" }).click();
  await expect(page.locator(".birthday-cake")).toHaveClass(/candles-out/);
  await expect(
    page.getByRole("button", { name: "Your wish is on its way" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Relight/ }).click();
  await expect(page.locator(".birthday-cake")).not.toHaveClass(/candles-out/);
  await page
    .getByRole("button", { name: "Leave a little note for your future self" })
    .click();
  await page
    .getByLabel("A little reminder for your next chapter")
    .fill("Keep finding the little joys.");
  await page.getByRole("button", { name: "Keep this little note" }).click();
  await expect(
    page.getByRole("button", { name: "Your note is saved on this device" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("birthsite-note-demo")),
  ).toBe("Keep finding the little joys.");
  expect(browserErrors).toEqual([]);
});

test("mobile layout and reduced-motion birthday gate", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(process.env.BIRTHSITE_TEST_HOME || "/");
  await expect(
    page.getByRole("button", { name: "Open your surprise" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open your surprise" }).click();
  await expect(page.getByLabel("Your birth year")).toBeVisible();
  await page.getByLabel("Your birth year").fill("2006");
  await page.getByRole("button", { name: "Let the magic in" }).click();
  await expect(page.locator(".celebration-hero h1")).toContainText("Olivia");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Blow out the candles" }),
  ).toBeEnabled();
});
