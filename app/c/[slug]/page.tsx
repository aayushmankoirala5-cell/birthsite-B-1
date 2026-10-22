import { notFound } from "next/navigation";
import BirthdayExperience from "@/components/birthday-experience";
import { getPublicTeaser } from "@/lib/server/store";
export const dynamic = "force-dynamic";
export default async function CustomerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const teaser = await getPublicTeaser(slug);
  if (!teaser) notFound();
  return <BirthdayExperience teaser={teaser} />;
}
