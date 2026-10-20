export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-muted-foreground">Ce profil n&apos;existe pas (ou plus).</p>
    </main>
  );
}
