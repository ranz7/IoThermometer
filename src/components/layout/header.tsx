// src/components/layout/header.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { UserCircle } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo i nawigacja główna */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            IoThermometer
          </Link>
          {session && (
            <nav className="flex gap-4">
              <Link 
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Panel urządzeń
              </Link>
            </nav>
          )}
        </div>

        {/* Sekcja użytkownika */}
        <div className="flex items-center gap-4">
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "Avatar"}
                      className="rounded-full size-10 object-cover"
                    />
                  ) : (
                    <UserCircle className="h-6 w-6" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1">
                    {session.user.name && (
                      <p className="text-sm font-medium">
                        {session.user.name}
                      </p>
                    )}
                    {session.user.email && (
                      <p className="text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard"
                    className="cursor-pointer"
                  >
                    Panel urządzeń
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/api/auth/signout"
                    className="cursor-pointer"
                  >
                    Wyloguj się
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default">
              <Link href="/api/auth/signin">
                Zaloguj się
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}