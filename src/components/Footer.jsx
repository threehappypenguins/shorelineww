"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <footer className="bg-footer shadow-inner mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6 justify-items-center">
          {/* Business Logo */}
          <div className="flex items-start justify-center w-full">
            {mounted ? (
              <Image
                src={resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo-light.svg"}
                alt="Shoreline Woodworks"
                width={200}
                height={60}
                className="h-auto w-full max-w-50"
                priority
              />
            ) : (
              <div className="h-15 w-full max-w-50 animate-pulse bg-muted rounded" />
            )}
          </div>

          {/* Navigation and Contact wrapper - acts as single grid item on mobile, two on desktop */}
          <div className="col-span-1 md:contents">
            <div className="flex flex-col md:block space-y-6 md:space-y-0">
              {/* Navigation Links */}
              <div>
                <h4 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
                  Navigation
                </h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/"
                      className="text-foreground/70 hover:text-foreground transition-colors"
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/projects"
                      className="text-foreground/70 hover:text-foreground transition-colors"
                    >
                      Projects
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="text-foreground/70 hover:text-foreground transition-colors"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact - visible on mobile within the wrapper */}
              <div className="md:hidden">
                <h4 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
                  Contact
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="tel:902-412-7358"
                      className="flex items-center text-foreground/70 hover:text-foreground transition-colors"
                    >
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      902-412-7358
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:info@shorelinewoodworks.ca"
                      className="flex items-center text-foreground/70 hover:text-foreground transition-colors"
                    >
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      info@shorelinewoodworks.ca
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact - visible on desktop as separate grid item */}
            <div className="hidden md:block">
              <h4 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
                Contact
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="tel:902-412-7358"
                    className="flex items-center text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    902-412-7358
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@shorelinewoodworks.ca"
                    className="flex items-center text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    info@shorelinewoodworks.ca
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-6">
          <p className="text-center text-sm text-foreground/60">
            © {currentYear} Shoreline Woodworks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}