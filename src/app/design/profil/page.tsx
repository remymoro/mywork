import type { Metadata } from "next";
import { connection } from "next/server";
import { PublicProfileView } from "@/app/[username]/profile-view";
import { DEMO_PROFILE } from "./demo-profile";

// Page de démonstration : faux profil entièrement rempli, sans base de données (rien n'est enregistré).
export const metadata: Metadata = {
  title: "Profil de démonstration — MyWork",
  robots: { index: false },
};

// Les durées (« 1 an 10 mois ») dépendent de la date du jour : rendu à chaque visite.
export const instant = false;

export default async function DemoProfilePage() {
  await connection();
  return (
    <>
      <p className="bg-primary px-6 py-2 text-center text-sm text-primary-foreground">
        Profil de démonstration : toutes les informations sont fictives.
      </p>
      <PublicProfileView {...DEMO_PROFILE} />
    </>
  );
}
