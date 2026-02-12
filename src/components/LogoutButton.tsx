"use client";

import { useSession, signOut } from "next-auth/react";

export default function LogoutButton() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Don't render anything if not authenticated or still loading
  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await signOut({
      callbackUrl: '/admin/login',
      redirect: true
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="fixed top-20 right-4 z-40 hidden md:block px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg"
    >
      Logout
    </button>
  );
}