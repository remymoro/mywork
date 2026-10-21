import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-8">
        <Logo />
        <div className="space-y-4">
          <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
            Ton espace de travail, en une seule adresse.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            MyWork regroupe dans un seul outil personnalisable autour de ton
            profil public des services aujourd&apos;hui séparés : CV en ligne,
            prise de rendez-vous, boards et partage de fichiers.
          </p>
        </div>
        <div>
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}
