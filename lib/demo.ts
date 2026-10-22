import type { CustomerPublic, CustomerTeaser } from "@/lib/types";

/** Sample content only. Customer passwords and records live exclusively on the server. */
export const DEMO_PUBLIC: CustomerPublic = {
  id: "demo",
  slug: "demo",
  name: "Olivia",
  birthday: "October 22",
  headline: "Some days are made for a little magic.",
  subtitle: "A little world of love, memories, and wishes — made just for you.",
  sender: "Someone who thinks the world of you",
  letter:
    "Some people make the world feel a little softer, a little brighter, a little more like home. You are one of those people.\n\nToday, I hope you pause long enough to see what we see: your beautiful heart, your quiet courage, and the light you bring to every room. Every little moment with you is a memory worth keeping.\n\nMay this new chapter bring adventures that make your heart race, mornings that feel like possibility, and love that asks you to be nothing but yourself.\n\nKeep dreaming the big dreams. Keep laughing that laugh. Keep being wonderfully, unapologetically you.\n\nHappy birthday, beautiful. The best is still unfolding.",
  finalMessage:
    "The world became a little more beautiful the day you arrived. May you always be surrounded by the love you so effortlessly give. Here's to you, and to all the magic still to come.",
  theme: "blush",
  photos: [
    { url: "/images/memory-1.jpg", caption: "Sunshine looks good on you" },
    { url: "/images/memory-2.jpg", caption: "The little things, forever" },
    { url: "/images/memory-3.jpg", caption: "A heart full of adventures" },
  ],
};

export const DEMO_TEASER: CustomerTeaser = {
  slug: DEMO_PUBLIC.slug,
  name: DEMO_PUBLIC.name,
  birthday: DEMO_PUBLIC.birthday,
  headline: DEMO_PUBLIC.headline,
  subtitle: DEMO_PUBLIC.subtitle,
  theme: DEMO_PUBLIC.theme,
};
