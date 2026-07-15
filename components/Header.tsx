"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 flex h-[60px] w-full items-center justify-between bg-white px-[5%] shadow-lg">
      <Link href="/" className="text-2xl font-medium text-accent-deep no-underline">
        Accelerate BASSO <span className="text-base font-normal text-accent-dark">Portal</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-5 text-base lg:flex">
        <Link
          href="/"
          className="rounded-full px-4 py-1.5 text-accent-deep no-underline transition-colors hover:bg-accent-band"
        >
          Home
        </Link>
        <Link
          href="/resources"
          className="rounded-full px-4 py-1.5 text-accent-deep no-underline transition-colors hover:bg-accent-band"
        >
          Resources
        </Link>
        <Link
          href="/contribute"
          className="rounded-full px-4 py-1.5 text-accent-deep no-underline transition-colors hover:bg-accent-band"
        >
          Contribute
        </Link>
        <a
          href="https://accelerate-basso.regenstrief.org"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full px-4 py-1.5 text-accent-deep no-underline transition-colors hover:bg-accent-band"
        >
          Main Site
        </a>
      </nav>

      {/* Mobile menu button */}
      <button
        className="text-3xl text-black lg:hidden"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="absolute left-0 top-[60px] flex w-full flex-col gap-2 bg-white p-4 shadow-lg lg:hidden">
          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-black no-underline hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/resources"
            className="rounded-lg px-4 py-2 text-black no-underline hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Resources
          </Link>
          <Link
            href="/contribute"
            className="rounded-lg px-4 py-2 text-black no-underline hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Contribute
          </Link>
          <a
            href="https://accelerate-basso.regenstrief.org"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-4 py-2 text-black no-underline hover:bg-gray-100"
          >
            Main Site
          </a>
        </nav>
      )}
    </header>
  );
}
