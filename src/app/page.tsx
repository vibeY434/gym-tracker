import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 text-zinc-900">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Gym Tracker</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight">
          Zwei Wege statt einem offenen Scheunentor.
        </h1>
        <p className="mt-4 max-w-3xl text-base text-zinc-600">
          Der öffentliche Modus läuft ohne Datenbank und ist für Copy-Paste gedacht. Die private
          Version bleibt für deine gespeicherten Sessions und wird auf Login plus saubere Policies
          vorbereitet.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Öffentlich</p>
          <h2 className="mt-2 text-2xl font-semibold">One-Shot-Vorlage</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Kein Login, kein Supabase, kein Rückschreiben. Training eintippen, Text kopieren,
            weiter damit.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>läuft komplett lokal im Browser</li>
            <li>Copy-Export für WhatsApp, Notizen oder Chat</li>
            <li>ideal für Leute ohne Account</li>
          </ul>
          <Link
            href="/one-shot"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Öffentliche Vorlage öffnen
          </Link>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Privat</p>
          <h2 className="mt-2 text-2xl font-semibold">Trainingsdatenbank</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Deine gespeicherten Sessions mit Verlauf, Duplizieren und späterem Login-Zwang über
            Magic Link statt Passwort-Zirkus.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>Supabase-gestützt für Sessions und Historie</li>
            <li>Code ist auf Auth + geschlossene Policies vorbereitet</li>
            <li>geeignet für deine eigene Nutzung oder kleine Family-Allowlist</li>
          </ul>
          <Link
            href="/private"
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
          >
            Private Version öffnen
          </Link>
        </article>
      </section>
    </main>
  );
}
