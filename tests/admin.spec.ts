import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

const origin = process.env.BIRTHSITE_TEST_BASE_URL ?? "http://127.0.0.1:3102";

test("studio signs in, creates and previews a personalized customer, edits, deletes, and signs out", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const slug = `studio-${randomUUID()}`;
  const recipient = "Studio test recipient";
  const updatedRecipient = "Studio updated recipient";
  const headline = "A birthday full of beautiful possibilities";
  let customerId: string | undefined;

  try {
    await page.goto("/admin");
    await page
      .getByLabel("Studio password")
      .fill(process.env.BIRTHSITE_TEST_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Enter the studio" }).click();
    await expect(
      page.getByRole("heading", { name: "Your little world of celebrations." }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "New celebration", exact: true })
      .click();
    await page.getByLabel("Name", { exact: true }).fill(recipient);
    await page
      .getByLabel("Birthday display", { exact: true })
      .fill("October 22");
    await page.getByLabel("Personal link", { exact: false }).fill(slug);
    await page.getByLabel("Birth year password", { exact: false }).fill("2006");
    await page.getByRole("radio", { name: /Lavender dream/ }).check();
    await page.getByLabel("Reveal headline", { exact: true }).fill(headline);
    await page
      .getByRole("textbox", { name: "Welcome message", exact: true })
      .fill("All your favorite little moments, gathered in one place.");
    await page
      .getByLabel("Photo URL 1", { exact: true })
      .fill("/images/memory-1.jpg");
    await page
      .getByLabel("Caption 1", { exact: true })
      .fill("The road to all our next adventures");
    await page
      .getByRole("textbox", { name: /^Birthday letter/ })
      .fill(
        "Your kindness makes every ordinary day more beautiful.\n\nHere is to another year of memories together.",
      );
    await page
      .getByLabel("With love, from", { exact: true })
      .fill("Your favorite person");
    await page
      .getByRole("textbox", { name: "The final wish", exact: true })
      .fill("May this year bring you joy in all the little things.");

    const [createdResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/admin/customers") &&
          response.request().method() === "POST",
      ),
      page
        .getByRole("button", { name: "Save celebration", exact: true })
        .click(),
    ]);
    expect(createdResponse.status()).toBe(201);
    customerId = (await createdResponse.json()).customer.id;
    await expect(page.getByRole("status")).toContainText(
      "Saved. Your celebration is ready to share.",
    );
    await expect(
      page.locator(".studio-customer-select").filter({ hasText: recipient }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Birth year password", { exact: false }),
    ).toHaveValue("");

    const [preview] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: "Preview", exact: true }).click(),
    ]);
    await preview.emulateMedia({ reducedMotion: "reduce" });
    await expect(
      preview.getByRole("heading", { name: headline, exact: true }),
    ).toBeVisible();
    await expect(preview.locator(".birthsite")).toHaveClass(/theme-lavender/);
    await expect(preview.locator(".hero-description")).toContainText(recipient);
    await preview.close();

    await page.getByLabel("Name", { exact: true }).fill(updatedRecipient);
    const [updatedResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/admin/customers/${customerId}`) &&
          response.request().method() === "PATCH",
      ),
      page
        .getByRole("button", { name: "Save celebration", exact: true })
        .click(),
    ]);
    expect(updatedResponse.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        name: `Made for ${updatedRecipient}`,
        exact: true,
      }),
    ).toBeVisible();

    // Use the real public interface to verify that an empty edit password retained the old year.
    const guest = await context.newPage();
    await guest.emulateMedia({ reducedMotion: "reduce" });
    await guest.goto(`/c/${slug}`);
    await expect(guest.locator(".hero-description")).toContainText(
      updatedRecipient,
    );
    await guest
      .getByRole("button", { name: "Open your surprise", exact: true })
      .click();
    await guest.getByLabel("Your birth year").fill("2006");
    await guest.getByRole("button", { name: "Let the magic in" }).click();
    await expect(guest.locator(".celebration-hero h1")).toContainText(
      updatedRecipient,
    );
    await expect(guest.locator(".memory-polaroid")).toHaveCount(1);
    await expect(guest.locator(".memory-polaroid")).toContainText(
      "The road to all our next adventures",
    );
    await guest.close();

    await page
      .locator(".studio-customer-select")
      .filter({ hasText: updatedRecipient })
      .click();
    await expect(
      page.getByRole("heading", {
        name: `Made for ${updatedRecipient}`,
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".admin-shell").getByRole("alert")).toContainText(
      `Delete ${updatedRecipient}’s celebration?`,
    );
    await page
      .getByRole("button", { name: "Keep celebration", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Yes, delete permanently",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("button", { name: "Yes, delete permanently", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "The celebration has been deleted.",
    );
    await expect(
      page
        .locator(".studio-customer-select")
        .filter({ hasText: updatedRecipient }),
    ).toHaveCount(0);
    customerId = undefined;
    expect((await page.request.get(`/api/celebration/${slug}`)).status()).toBe(
      404,
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.getByLabel("Studio password")).toBeVisible();
    expect((await page.request.get("/api/admin/customers")).status()).toBe(401);
    expect(browserErrors).toEqual([]);
  } finally {
    if (customerId) {
      await page.request
        .delete(`/api/admin/customers/${customerId}`, {
          headers: { Origin: origin },
          timeout: 5000,
        })
        .catch(() => {});
    }
  }
});
