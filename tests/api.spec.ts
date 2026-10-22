import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";

const origin = process.env.BIRTHSITE_TEST_BASE_URL ?? "http://127.0.0.1:3102";
const headers = { Origin: origin };

async function signIn(request: APIRequestContext) {
  const response = await request.post("/api/admin/session", {
    headers,
    data: { password: process.env.BIRTHSITE_TEST_ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["set-cookie"]).toMatch(/httponly/i);
}

test("public responses expose a teaser while private content remains locked", async ({
  request,
}) => {
  const teaser = await request.get("/api/celebration/demo");
  expect(teaser.status()).toBe(200);
  const { celebration } = await teaser.json();
  expect(celebration).toMatchObject({ slug: "demo", name: "Olivia" });
  for (const privateField of [
    "photos",
    "letter",
    "birthYear",
    "passwordHash",
    "passwordVersion",
  ]) {
    expect(celebration).not.toHaveProperty(privateField);
  }
  expect((await request.get("/api/celebration/demo/content")).status()).toBe(
    401,
  );
  expect((await request.get("/api/celebration/does-not-exist")).status()).toBe(
    404,
  );
  expect((await request.get("/api/admin/customers")).status()).toBe(401);
});

test("admin authentication rejects cross-origin requests and signs out correctly", async ({
  request,
  playwright,
}) => {
  expect(
    (await (await request.get("/api/admin/session")).json()).authenticated,
  ).toBe(false);

  const noOrigin = await request.post("/api/admin/session", {
    data: { password: process.env.BIRTHSITE_TEST_ADMIN_PASSWORD },
  });
  expect(noOrigin.status()).toBe(403);

  const crossOrigin = await request.post("/api/admin/session", {
    headers: { Origin: "https://another-site.example" },
    data: { password: process.env.BIRTHSITE_TEST_ADMIN_PASSWORD },
  });
  expect(crossOrigin.status()).toBe(403);

  const incorrect = await request.post("/api/admin/session", {
    headers,
    data: { password: "an-incorrect-password" },
  });
  expect(incorrect.status()).toBe(401);
  await signIn(request);
  expect(
    (await (await request.get("/api/admin/session")).json()).authenticated,
  ).toBe(true);
  expect((await request.get("/api/admin/customers")).status()).toBe(200);

  const state = await request.storageState();
  const session = state.cookies.find(
    (cookie) => cookie.name === "birthsite_admin",
  );
  expect(session).toBeTruthy();
  const [payload, signature] = session!.value.split(".");
  const forgedSignature =
    (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  const forged = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: {
      Cookie: `birthsite_admin=${payload}.${forgedSignature}`,
    },
  });
  try {
    expect((await forged.get("/api/admin/customers")).status()).toBe(401);
    expect(
      (await (await forged.get("/api/admin/session")).json()).authenticated,
    ).toBe(false);
  } finally {
    await forged.dispose();
  }

  expect(
    (await request.delete("/api/admin/session", { headers })).status(),
  ).toBe(200);
  expect(
    (await (await request.get("/api/admin/session")).json()).authenticated,
  ).toBe(false);
  expect((await request.get("/api/admin/customers")).status()).toBe(401);
});

test("repeated password guesses are throttled for admin and birthday unlock", async ({
  request,
}) => {
  // A unique documentation-range IPv6 address keeps this test's limiter buckets isolated.
  // Vercel overwrites this header in production; the local test server accepts it directly.
  const groups = randomUUID()
    .replaceAll("-", "")
    .match(/.{4}/g)!
    .slice(0, 6)
    .join(":");
  const limitedHeaders = {
    ...headers,
    "x-forwarded-for": `2001:db8:${groups}`,
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await request.post("/api/admin/session", {
      headers: limitedHeaders,
      data: { password: "an-incorrect-password" },
    });
    expect(response.status()).toBe(401);
  }
  const limitedAdmin = await request.post("/api/admin/session", {
    headers: limitedHeaders,
    data: { password: process.env.BIRTHSITE_TEST_ADMIN_PASSWORD },
  });
  expect(limitedAdmin.status()).toBe(429);
  expect((await limitedAdmin.json()).error).toContain("Too many attempts");

  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await request.post("/api/celebration/demo/unlock", {
      headers: limitedHeaders,
      data: { birthYear: "2005" },
    });
    expect(response.status()).toBe(401);
  }
  const limitedUnlock = await request.post("/api/celebration/demo/unlock", {
    headers: limitedHeaders,
    data: { birthYear: "2006" },
  });
  expect(limitedUnlock.status()).toBe(429);
  expect((await limitedUnlock.json()).error).toContain("Too many attempts");
});

test("customers persist, unlock privately, rotate passwords, and delete", async ({
  request,
  playwright,
}) => {
  await signIn(request);
  const slug = `e2e-${randomUUID()}`;
  const customer = {
    slug,
    name: "E2E birthday guest",
    birthday: "October 22",
    headline: "A little birthday magic",
    subtitle: "A celebration made just for you.",
    sender: "Your favourite person",
    letter: "Here is to another year of beautiful memories.",
    finalMessage: "The best is still unfolding.",
    theme: "lavender",
    birthYear: "2006",
    photos: [{ url: "/images/memory-1.jpg", caption: "A treasured memory" }],
  };
  let customerId: string | undefined;
  const guest = await playwright.request.newContext({ baseURL: origin });

  try {
    const unsafePhoto = await request.post("/api/admin/customers", {
      headers,
      data: {
        ...customer,
        photos: [{ url: "javascript:alert(1)", caption: "Unsafe" }],
      },
    });
    expect(unsafePhoto.status()).toBe(400);
    const html = await request.post("/api/admin/customers", {
      headers,
      data: { ...customer, letter: "<script>alert(1)</script>" },
    });
    expect(html.status()).toBe(400);

    const created = await request.post("/api/admin/customers", {
      headers,
      data: customer,
    });
    expect(created.status()).toBe(201);
    const createdBody = await created.json();
    customerId = createdBody.customer.id;
    expect(createdBody.customer).toMatchObject({
      name: customer.name,
      slug,
      theme: "lavender",
    });
    for (const sensitive of ["birthYear", "passwordHash", "passwordVersion"]) {
      expect(createdBody.customer).not.toHaveProperty(sensitive);
    }
    const list = await (await request.get("/api/admin/customers")).json();
    expect(
      list.customers.some((item: { id: string }) => item.id === customerId),
    ).toBe(true);
    expect(
      (
        await request.post("/api/admin/customers", { headers, data: customer })
      ).status(),
    ).toBe(409);

    const teaser = await (await guest.get(`/api/celebration/${slug}`)).json();
    expect(teaser.celebration.name).toBe(customer.name);
    expect(teaser.celebration).not.toHaveProperty("letter");
    expect(teaser.celebration).not.toHaveProperty("photos");
    expect((await guest.get(`/api/celebration/${slug}/content`)).status()).toBe(
      401,
    );
    expect(
      (
        await guest.post(`/api/celebration/${slug}/unlock`, {
          headers,
          data: { birthYear: "2005" },
        })
      ).status(),
    ).toBe(401);

    const unlocked = await guest.post(`/api/celebration/${slug}/unlock`, {
      headers,
      data: { birthYear: customer.birthYear },
    });
    expect(unlocked.status()).toBe(200);
    expect(unlocked.headers()["set-cookie"]).toMatch(/httponly/i);
    expect((await unlocked.json()).celebration.letter).toBe(customer.letter);
    const restored = await guest.get(`/api/celebration/${slug}/content`);
    expect(restored.status()).toBe(200);
    expect((await restored.json()).celebration.photos).toEqual(customer.photos);

    const updated = await request.patch(`/api/admin/customers/${customerId}`, {
      headers,
      data: { name: "Updated birthday guest", birthYear: "" },
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).customer.name).toBe("Updated birthday guest");
    expect((await guest.get(`/api/celebration/${slug}/content`)).status()).toBe(
      200,
    );

    const rotated = await request.patch(`/api/admin/customers/${customerId}`, {
      headers,
      data: { birthYear: "2007" },
    });
    expect(rotated.status()).toBe(200);
    expect((await guest.get(`/api/celebration/${slug}/content`)).status()).toBe(
      401,
    );
    expect(
      (
        await guest.post(`/api/celebration/${slug}/unlock`, {
          headers,
          data: { birthYear: "2006" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await guest.post(`/api/celebration/${slug}/unlock`, {
          headers,
          data: { birthYear: "2007" },
        })
      ).status(),
    ).toBe(200);

    expect(
      (await request.delete(`/api/admin/customers/${customerId}`)).status(),
    ).toBe(403);
    expect(
      (
        await request.delete(`/api/admin/customers/${customerId}`, { headers })
      ).status(),
    ).toBe(200);
    customerId = undefined;
    expect((await guest.get(`/api/celebration/${slug}`)).status()).toBe(404);
  } finally {
    if (customerId)
      await request.delete(`/api/admin/customers/${customerId}`, { headers });
    await guest.dispose();
  }
});
