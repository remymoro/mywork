import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <Logo />
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Hello world</h1>
        <p className="text-lg text-muted-foreground">Ton profil public, tes outils au même endroit.</p>
      </div>
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Se connecter
      </Link>
    </main>
  );
}
