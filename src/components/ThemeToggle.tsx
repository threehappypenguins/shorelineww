"use client";

import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";

const THEMES = [
  { value: "light" as const, label: "Light", icon: SunIcon },
  { value: "dark" as const, label: "Dark", icon: MoonIcon },
  { value: "system" as const, label: "System", icon: MonitorIcon },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (value: "light" | "dark" | "system") => {
    setTheme(value);
    setIsOpen(false);
  };

  if (!mounted) {
    return (
      <div
        className="h-9 w-9 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
        aria-hidden
      />
    );
  }

  const selectedTheme = theme ?? "system";
  const CurrentIcon = THEMES.find((t) => t.value === selectedTheme)?.icon ?? MonitorIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        aria-label="Change theme"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        id="theme-toggle-button"
      >
        <CurrentIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby="theme-toggle-button"
          className="absolute right-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="option"
              aria-selected={theme === value}
              onClick={() => handleSelect(value)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${theme === value ? "text-amber-600 dark:text-amber-400" : ""}`}
              />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
