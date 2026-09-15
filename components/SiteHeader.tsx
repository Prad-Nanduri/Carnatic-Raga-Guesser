"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

// Masthead-style header (hallmark N6): centred wordmark, links on a row beneath
// a double rule — editorial register, not the left/right SaaS nav.
function Dot() {
  return (
    <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rotate-45 bg-bronze" />
  );
}

export default function SiteHeader() {
  const { data: session } = useSession();
  return (
    <header className="flex flex-col items-center">
      <Link href="/" className="wordmark text-4xl no-underline">
        Ragaforge
      </Link>
      <nav className="mt-4 flex items-center gap-4">
        <Link href="/gallery" className="nav-link">Gallery</Link>
        <Dot />
        <Link href="/dashboard" className="nav-link">Dashboard</Link>
        <Dot />
        {session ? (
          <span className="subtle">{session.user.email}</span>
        ) : (
          <Link href="/login" className="nav-link">Log in</Link>
        )}
      </nav>
      <div aria-hidden="true" className="mt-5 w-full border-b-[3px] border-double border-line" />
    </header>
  );
}
