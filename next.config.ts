import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Photos et images de projet : 2 Mo maximum, plus une marge pour l'enveloppe du formulaire.
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
  // Photos de profil et images de projet servies depuis les dossiers publics de Supabase Storage.
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)]
      : [],
  },
  // Pas de page d'accueil séparée : la racine mène directement à la connexion Google.
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
  async headers() {
    return ["/rdv/:token/visio", "/dashboard/rendez-vous/:id/visio"].map((source) => ({
      source,
      headers: [
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self)" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }));
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
