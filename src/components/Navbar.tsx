"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";

import localFont from 'next/font/local'

const clarendonCondensed = localFont({
  src: '../fonts/clarendoncondensed_bold.otf',
  display: 'swap',
})

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const handleLogout = async () => {
    await signOut({
      callbackUrl: '/admin/login',
      redirect: true
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border supports-backdrop-filter:bg-card/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Text */}
          <Link href="/" className="flex shrink-0 items-center">
            <span
              className={`text-2xl md:text-4xl font-bold tracking-widest uppercase inline-block wordmark ${clarendonCondensed.className}`}
            >
              Shoreline Woodworks
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-1 items-center justify-end space-x-2 pr-4">
            <NavLink href="/" label="Home" />
            <NavLink href="/projects" label="Projects" />
            <NavLink href="/about" label="About" />
            <NavLink href="/contact" label="Contact" />
            
            {/* Admin link - only show when authenticated */}
            {isAuthenticated && (
              <NavLink href="/admin" label="Admin" />
            )}
          </div>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-3">
            {/* ThemeToggle only on desktop */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden rounded-lg border border-border bg-card p-2 text-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-md">
          <div className="flex flex-col">
            {/* Top section - Nav links and theme toggle */}
            <div className="flex px-2 pb-3 pt-2 sm:px-3">
              {/* Left column - Nav links */}
              <div className="flex-1 space-y-1">
                <MobileNavLink href="/" label="Home" onClick={() => setIsMenuOpen(false)} />
                <MobileNavLink href="/projects" label="Projects" onClick={() => setIsMenuOpen(false)} />
                <MobileNavLink href="/about" label="About" onClick={() => setIsMenuOpen(false)} />
                <MobileNavLink href="/contact" label="Contact" onClick={() => setIsMenuOpen(false)} />
                
                {/* Admin link - only show when authenticated */}
                {isAuthenticated && (
                  <MobileNavLink href="/admin" label="Admin" onClick={() => setIsMenuOpen(false)} />
                )}
              </div>
              {/* Right column - Theme toggle */}
              <div className="shrink-0 pl-2">
                <ThemeToggle />
              </div>
            </div>
            
            {/* Bottom section - Logout button (only show when authenticated) */}
            {isAuthenticated && (
              <div className="border-t border-border px-2 py-3 sm:px-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity text-center"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`
        px-4 py-2 rounded-lg text-foreground transition-colors
        ${isActive
          ? "bg-nav-active text-white"
          : "hover:bg-nav-hover"
        }
      `}
    >
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        block rounded-lg px-3 py-2 text-foreground transition-colors
        ${isActive
          ? "bg-nav-active text-white"
          : "hover:bg-nav-hover"
        }
      `}
    >
      {label}
    </Link>
  );
}