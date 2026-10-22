import type { Metadata } from "next";
import { connection } from "next/server";
import { VisioPage } from "@/components/visio/visio-page";

export const instant = false;
export const metadata: Metadata = { title: "Ma visio", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function OwnerVisioPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  return <VisioPage input={{ role: "owner", id }} />;
}
