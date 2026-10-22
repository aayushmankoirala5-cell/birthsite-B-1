import { test, expect } from "@playwright/test";

test("Pages serves assets under the repository path without a backend", async ({ page, request }) => {
  test.skip(!process.env.BIRTHSITE_TEST_HOME, "Static deployment check only");
  const home = process.env.BIRTHSITE_TEST_HOME!;
  const failures: string[] = [];
  const backendCalls: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText;
    // Next can cancel a speculative route prefetch as the page state changes.
    if (request.resourceType() === "fetch" && reason === "net::ERR_ABORTED") return;
    failures.push(`${reason} ${request.url()}`);
  });
  page.on("request", (request) => {
    if (/\/api\/|\/_next\/image/.test(request.url())) backendCalls.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(home);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "DM Sans"'))).toBe(true);
  expect(await page.locator(".hero-photo img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: "BirthSite home", exact: true })).toHaveAttribute("href", home);
  await page.getByRole("button", { name: "Open your surprise" }).click();
  await page.getByLabel("Your birth year").fill("2006");
  await page.getByRole("button", { name: "Let the magic in" }).click();
  await expect(page.locator(".celebration-hero h1")).toContainText("Olivia");
  for (const image of await page.locator(".memory-polaroid img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty("complete", true);
    expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
  expect(failures).toEqual([]);
  expect(backendCalls).toEqual([]);
  for (const path of ["admin/", "api/admin/session/", ".env.example", "README.md"]) {
    expect((await request.get(`${home}${path}`)).status()).toBe(404);
  }
});
