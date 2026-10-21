import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyWork",
  description:
    "Ton espace de travail personnel, en une seule adresse : CV, rendez-vous, boards et fichiers.",
};

// Applique le mode clair/sombre mémorisé avant l'affichage (sinon la page clignote).
// L'ancien choix de couleur (« mywork-theme ») est effacé : le site reste en Éditorial.
const THEME_INIT_SCRIPT = `(function(){try{localStorage.removeItem("mywork-theme");var m=localStorage.getItem("mywork-mode");if(m==="dark"||m==="light"){document.documentElement.classList.toggle("dark",m==="dark");}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-theme="editorial"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
