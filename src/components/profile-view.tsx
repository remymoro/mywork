import { Globe, MapPin } from "lucide-react";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { displayUrl, initials } from "@/lib/profile";

export type PublicProfile = {
  username: string;
  display_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  avatar_url?: string | null;
};

export function ProfileView({ profile }: { profile: PublicProfile }) {
  const name = profile.display_name ?? profile.username;
  const links = [
    { label: "Site web", url: profile.website },
    { label: "LinkedIn", url: profile.linkedin_url },
    { label: "GitHub", url: profile.github_url },
  ].filter((l): l is { label: string; url: string } => Boolean(l.url));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 p-6 pt-20">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar size="xl" className="size-28">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={`Photo de ${name}`} />}
          <AvatarFallback className="text-3xl">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{name}</h1>
          {profile.headline && <p className="text-lg text-muted-foreground">{profile.headline}</p>}
          {profile.location && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <MapPin className="size-4" aria-hidden />
              {profile.location}
            </p>
          )}
        </div>
      </header>

      {profile.bio && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">À propos</h2>
          <p className="max-w-prose whitespace-pre-line">{profile.bio}</p>
        </section>
      )}

      {links.length > 0 && (
        <section className="flex flex-wrap gap-3" aria-label="Liens">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer me"
              // cn fusionne border-transparent (base) et border-border (outline).
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Globe />
              {l.label}
              <span className="text-muted-foreground">{displayUrl(l.url)}</span>
            </a>
          ))}
        </section>
      )}

      <footer className="mt-auto pb-6 text-sm text-muted-foreground">
        mywork.website/{profile.username}
      </footer>
    </main>
  );
}
