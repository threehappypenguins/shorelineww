import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 shadow-inner mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Business Name */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Shoreline Woodworks
            </h3>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/projects"
                  className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  Projects
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          
          <div>
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4">
              Contact
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="tel:902-412-7358"
                  className="flex items-center text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
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
                  className="flex items-center text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
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

        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            © {currentYear} Shoreline Woodworks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}