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
    <div className="absolute top-20 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 flex justify-end pointer-events-auto">
        <button
          type="button"
          onClick={handleLogout}
          className="hidden md:block px-8 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg min-w-30"
        >
          Logout
        </button>
      </div>
    </div>
  );
}