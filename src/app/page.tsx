/**
 * @module app/page
 * @description Home page component displaying the landing hero section.
 */
import RecentProjects from '@/components/RecentProjects';

/**
 * Home page component.
 * Displays the landing page with hero section and call-to-action buttons.
 *
 * @returns The home page JSX element
 */
export default function Home() {
  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">Shoreline Woodworks</h1>
        <RecentProjects />
      </div>
    </div>
  );
}