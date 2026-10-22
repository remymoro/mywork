import type { Metadata } from "next";
import { connection } from "next/server";
import { VisioPage } from "@/components/visio/visio-page";

export const instant = false;
export const metadata: Metadata = { title: "Ma visio", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function GuestVisioPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  return <VisioPage input={{ role: "guest", token }} />;
}
