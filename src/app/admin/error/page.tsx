import Link from "next/link";

export default function AdminError({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4 text-red-600">
          Authentication Error
        </h1>
        <p className="mb-6 text-gray-600">
          {error === "AccessDenied"
            ? "You don't have permission to access the admin panel. Please contact the administrator."
            : "An error occurred during sign in. Please try again."}
        </p>
        <Link
          href="/admin/login"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}