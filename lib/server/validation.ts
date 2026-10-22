import "server-only";
import type {
  CustomerInput,
  CustomerPhoto,
  CustomerPublic,
  CustomerTheme,
} from "@/lib/types";
import { RequestError } from "./errors";

function text(value: unknown, field: string, max: number, min = 1): string {
  if (typeof value !== "string")
    throw new RequestError(`${field} is required.`);
  const clean = value.trim();
  if (
    clean.length < min ||
    clean.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(clean)
  ) {
    throw new RequestError(
      `${field} must be between ${min} and ${max} characters.`,
    );
  }
  if (/<\/?[a-z][^>]*>/i.test(clean))
    throw new RequestError(`${field} must be plain text.`);
  return clean;
}

export function validateBirthYear(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}$/.test(value) ||
    Number(value) < 1900 ||
    Number(value) > new Date().getUTCFullYear()
  ) {
    throw new RequestError("Enter a valid four-digit birth year.");
  }
  return value;
}

function photos(value: unknown): CustomerPhoto[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12)
    throw new RequestError("Add between 1 and 12 photos.");
  return value.map((photo: unknown) => {
    if (!photo || typeof photo !== "object")
      throw new RequestError("Invalid photo.");
    const item = photo as Record<string, unknown>;
    const url = text(item.url, "Photo URL", 2048);
    if (!/^\/images\/[a-zA-Z0-9_./-]+$/.test(url)) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" || parsed.username || parsed.password)
          throw new Error("url");
      } catch {
        throw new RequestError(
          "Photos must use a valid HTTPS URL or a local /images/ path.",
        );
      }
    } else if (url.includes("..")) {
      throw new RequestError("Invalid local image path.");
    }
    return { url, caption: text(item.caption, "Photo caption", 160) };
  });
}

export function validateCustomer(
  data: Record<string, unknown>,
  existing?: CustomerPublic,
): Omit<CustomerInput, "birthYear"> & { birthYear?: string } {
  const merged = { ...existing, ...data };
  const slug = text(merged.slug, "Link slug", 60, 3);
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    ["demo", "admin", "api"].includes(slug)
  ) {
    throw new RequestError(
      "Choose a unique lowercase link with letters, numbers, and hyphens (not demo, admin, or api).",
    );
  }
  const theme = merged.theme;
  if (!["blush", "lavender", "champagne"].includes(String(theme)))
    throw new RequestError("Choose a valid theme.");
  const year = data.birthYear;
  const birthYear =
    year === undefined || year === "" ? undefined : validateBirthYear(year);
  if (!existing && !birthYear)
    throw new RequestError("A four-digit birth year is required.");
  return {
    slug,
    name: text(merged.name, "Name", 80),
    birthday: text(merged.birthday, "Birthday", 80),
    headline: text(merged.headline, "Headline", 160),
    subtitle: text(merged.subtitle, "Subtitle", 400),
    sender: text(merged.sender, "Sender", 100),
    letter: text(merged.letter, "Birthday letter", 10_000),
    finalMessage: text(merged.finalMessage, "Final message", 3000),
    theme: theme as CustomerTheme,
    photos: photos(merged.photos),
    ...(birthYear ? { birthYear } : {}),
  };
}
