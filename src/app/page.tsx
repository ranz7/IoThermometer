import Link from "next/link";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import Dashboard from "~/components/dashboard";  // Załóżmy, że tu znajduje się Twój komponent Dashboard

export default async function Home() {
  // Pobieramy informacje o sesji
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col">
        {session?.user ? (
          // Gdy użytkownik jest zalogowany, pokazujemy Dashboard
          <Dashboard />
        ) : (
          // Gdy użytkownik nie jest zalogowany, pokazujemy hero section
          <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
            <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
              <h1 className="text-center text-5xl font-extrabold tracking-tight sm:text-[5rem]">
                IoThermometer
              </h1>
              <p className="text-center text-2xl">
                Monitoruj temperaturę w czasie rzeczywistym
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/api/auth/signin"
                  className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
                >
                  Zaloguj się
                </Link>
                <Link
                  href="/about"  // Możesz dodać stronę z informacjami o projekcie
                  className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
                >
                  Dowiedz się więcej
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </HydrateClient>
  );
}