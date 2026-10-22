import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { DEMO_PUBLIC } from "@/lib/demo";
import type {
  CustomerAdmin,
  CustomerInput,
  CustomerPublic,
  CustomerTeaser,
} from "@/lib/types";
import { RequestError } from "./errors";

export interface CustomerRecord extends CustomerAdmin {
  passwordHash: string;
  passwordVersion: string;
}

const dataDirectory = path.join(process.cwd(), ".birthsite-data");
const dataFile = path.join(dataDirectory, "customers.json");
let initialized: Promise<void> | undefined;
let writeQueue: Promise<unknown> = Promise.resolve();

export function storageReady() {
  return (
    process.env.NODE_ENV !== "production" || Boolean(process.env.DATABASE_URL)
  );
}

function database() {
  if (!process.env.DATABASE_URL)
    throw new RequestError(
      "Customer storage is not configured. Add DATABASE_URL in your deployment settings.",
      503,
    );
  return neon(process.env.DATABASE_URL);
}

async function ensureDatabase() {
  if (!initialized) {
    initialized = (async () => {
      const sql = database();
      await sql`CREATE TABLE IF NOT EXISTS birthsite_customers (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, record JSONB NOT NULL)`;
      await sql`CREATE TABLE IF NOT EXISTS birthsite_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at BIGINT NOT NULL)`;
    })().catch((error) => {
      initialized = undefined;
      throw error;
    });
  }
  await initialized;
}

async function localRecords(): Promise<CustomerRecord[]> {
  try {
    return JSON.parse(await readFile(dataFile, "utf8")) as CustomerRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function localMutation<T>(
  mutate: (records: CustomerRecord[]) => T,
): Promise<T> {
  const task = writeQueue.then(async () => {
    const records = await localRecords();
    const result = mutate(records);
    await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
    const temporary = `${dataFile}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(records, null, 2), {
      mode: 0o600,
    });
    await rename(temporary, dataFile);
    return result;
  });
  writeQueue = task.catch(() => undefined);
  return task;
}

export function hashBirthYear(year: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(year, salt, 32).toString("hex")}`;
}

export function verifyBirthYear(year: string, hash: string) {
  const [salt, digest] = hash.split(":");
  if (!salt || !digest || digest.length !== 64) return false;
  return timingSafeEqual(
    scryptSync(year, salt, 32),
    Buffer.from(digest, "hex"),
  );
}

export function toPublic(record: CustomerPublic): CustomerPublic {
  // Explicit projection prevents password hashes from leaking if the record gains fields.
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    birthday: record.birthday,
    headline: record.headline,
    subtitle: record.subtitle,
    sender: record.sender,
    letter: record.letter,
    finalMessage: record.finalMessage,
    theme: record.theme,
    photos: record.photos.map(({ url, caption }) => ({ url, caption })),
  };
}

export function toAdmin(record: CustomerRecord): CustomerAdmin {
  return {
    ...toPublic(record),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

const DEMO_RECORD: CustomerRecord = {
  ...DEMO_PUBLIC,
  passwordHash: hashBirthYear("2006"),
  passwordVersion: "demo-v1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export async function listCustomers(): Promise<CustomerRecord[]> {
  if (process.env.DATABASE_URL) {
    await ensureDatabase();
    const rows =
      await database()`SELECT record FROM birthsite_customers ORDER BY record->>'createdAt' DESC`;
    return rows.map((row) => row.record as CustomerRecord);
  }
  if (!storageReady())
    throw new RequestError(
      "Configure DATABASE_URL before managing customers in production.",
      503,
    );
  return localRecords();
}

export async function getCustomerById(
  id: string,
): Promise<CustomerRecord | null> {
  if (id === "demo") return DEMO_RECORD;
  if (process.env.DATABASE_URL) {
    await ensureDatabase();
    const rows =
      await database()`SELECT record FROM birthsite_customers WHERE id = ${id} LIMIT 1`;
    return (rows[0]?.record as CustomerRecord) ?? null;
  }
  if (!storageReady())
    throw new RequestError("Customer storage is not configured.", 503);
  return (await localRecords()).find((record) => record.id === id) ?? null;
}

export async function getCustomerBySlug(
  slug: string,
): Promise<CustomerRecord | null> {
  if (slug === "demo") return DEMO_RECORD;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return null;
  if (process.env.DATABASE_URL) {
    await ensureDatabase();
    const rows =
      await database()`SELECT record FROM birthsite_customers WHERE slug = ${slug} LIMIT 1`;
    return (rows[0]?.record as CustomerRecord) ?? null;
  }
  if (!storageReady())
    throw new RequestError("Customer storage is not configured.", 503);
  return (await localRecords()).find((record) => record.slug === slug) ?? null;
}

export async function getPublicTeaser(
  slug: string,
): Promise<CustomerTeaser | null> {
  const record = await getCustomerBySlug(slug);
  if (!record) return null;
  const { name, birthday, headline, subtitle, theme } = record;
  return { slug, name, birthday, headline, subtitle, theme };
}

export async function createCustomer(
  input: CustomerInput,
): Promise<CustomerRecord> {
  const { birthYear, ...publicFields } = input;
  const now = new Date().toISOString();
  const record: CustomerRecord = {
    ...publicFields,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    passwordHash: hashBirthYear(birthYear),
    passwordVersion: randomUUID(),
  };
  if (process.env.DATABASE_URL) {
    await ensureDatabase();
    try {
      await database()`INSERT INTO birthsite_customers (id, slug, record) VALUES (${record.id}, ${record.slug}, ${JSON.stringify(record)}::jsonb)`;
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        throw new RequestError("That celebration link is already in use.", 409);
      throw error;
    }
    return record;
  }
  if (!storageReady())
    throw new RequestError("Customer storage is not configured.", 503);
  return localMutation((records) => {
    if (records.some((item) => item.slug === record.slug))
      throw new RequestError("That celebration link is already in use.", 409);
    records.unshift(record);
    return record;
  });
}

export async function updateCustomer(
  id: string,
  input: Omit<CustomerInput, "birthYear"> & { birthYear?: string },
): Promise<CustomerRecord> {
  if (id === "demo")
    throw new RequestError("The sample celebration cannot be edited.", 403);
  const existing = await getCustomerById(id);
  if (!existing) throw new RequestError("Customer not found.", 404);
  const { birthYear, ...publicFields } = input;
  const record: CustomerRecord = {
    ...existing,
    ...publicFields,
    updatedAt: new Date().toISOString(),
    ...(birthYear
      ? {
          passwordHash: hashBirthYear(birthYear),
          passwordVersion: randomUUID(),
        }
      : {}),
  };
  if (process.env.DATABASE_URL) {
    await ensureDatabase();
    try {
      const rows =
        await database()`UPDATE birthsite_customers SET slug = ${record.slug}, record = ${JSON.stringify(record)}::jsonb WHERE id = ${id} RETURNING id`;
      if (!rows.length) throw new RequestError("Customer not found.", 404);
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        throw new RequestError("That celebration link is already in use.", 409);
      throw error;
    }
    return record;
  }
  return localMutation((records) => {
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) throw new RequestError("Customer not found.", 404);
    if (records.some((item) => item.id !== id && item.slug === record.slug))
      throw new RequestError("That celebration link is already in use.", 409);
    records[index] = record;
    return record;
  });
}

export async function deleteCustomer(id: string) {
  if (id === "demo")
    throw new RequestError("The sample celebration cannot be deleted.", 403);
  if (process.env.DATABASE_URL) {
    await ensureDatabase();
    const rows =
      await database()`DELETE FROM birthsite_customers WHERE id = ${id} RETURNING id`;
    if (!rows.length) throw new RequestError("Customer not found.", 404);
    return;
  }
  if (!storageReady())
    throw new RequestError("Customer storage is not configured.", 503);
  await localMutation((records) => {
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) throw new RequestError("Customer not found.", 404);
    records.splice(index, 1);
  });
}

const attempts = new Map<string, { count: number; expires: number }>();

/** Atomic shared limiter when Postgres is configured; bounded local limiter for development/sample. */
export async function consumeAttempt(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  if (process.env.DATABASE_URL) {
    await ensureDatabase();
    const rows = await database()`
      INSERT INTO birthsite_attempts (key, attempts, expires_at) VALUES (${key}, 1, ${now + windowMs})
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN birthsite_attempts.expires_at <= ${now} THEN 1 ELSE birthsite_attempts.attempts + 1 END,
        expires_at = CASE WHEN birthsite_attempts.expires_at <= ${now} THEN ${now + windowMs} ELSE birthsite_attempts.expires_at END
      RETURNING attempts`;
    return Number(rows[0].attempts) <= limit;
  }
  if (attempts.size > 10_000) {
    for (const [storedKey, entry] of attempts)
      if (entry.expires <= now) attempts.delete(storedKey);
    if (attempts.size > 10_000) return false;
  }
  const previous = attempts.get(key);
  const entry =
    previous && previous.expires > now
      ? previous
      : { count: 0, expires: now + windowMs };
  entry.count += 1;
  attempts.set(key, entry);
  return entry.count <= limit;
}
