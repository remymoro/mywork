import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { Heading, Text } from "@/components/ui/typography";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <Logo />
      <div className="space-y-3">
        <Heading level={1}>Hello world</Heading>
        <Text variant="lead">Ton profil public, tes outils au même endroit.</Text>
      </div>
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Se connecter
      </Link>
    </main>
  );
}
