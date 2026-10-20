import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";

export const metadata: Metadata = {
  title: "Exemple de profil — MyWork",
  robots: { index: false },
};

export default function ProfileExamplePage() {
  return (
    <ProfileView
      profile={{
        username: "camille-dupont",
        display_name: "Camille Dupont",
        headline: "Développeuse web freelance",
        location: "Lyon, France",
        bio: "Je conçois des sites et des applications pour des petites équipes.\nJe travaille surtout avec React et TypeScript, et j'aime les interfaces simples.",
        website: "https://camille-dupont.fr/",
        linkedin_url: "https://www.linkedin.com/in/camille-dupont/",
        github_url: "https://github.com/camille-dupont",
      }}
    />
  );
}
