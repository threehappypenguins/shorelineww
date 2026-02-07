"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md dark:bg-gray-900 dark:shadow-gray-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              className="text-2xl font-bold text-gray-800 dark:text-white"
            >
              Shoreline Woodworks
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center flex-1 justify-end space-x-8 pr-4">
            <Link
              href="/"
              className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/projects"
              className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Projects
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Contact
            </Link>
          </div>

          {/* Right side: Theme toggle (left of hamburger on mobile, far right on desktop) */}
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none"
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
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/projects"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              Projects
            </Link>
            <Link
              href="/about"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
