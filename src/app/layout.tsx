// src/app/layout.tsx - Główny layout aplikacji
import "~/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { Header } from "~/components/layout/header";
import { auth } from "~/server/auth";
import { SessionProvider } from "~/components/providers/session-provider";

export const metadata: Metadata = {
  title: "IoThermometer",
  description: "Monitor your temperature readings in real-time",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="pl" className={GeistSans.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <TRPCReactProvider>
          <SessionProvider session={session}>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <div className="flex-1">
                {children}
              </div>
            </div>
          </SessionProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}