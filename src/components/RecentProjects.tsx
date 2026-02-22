'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ProjectApiResponse } from '@/types/project';
import ProjectCard from '@/app/projects/components/ProjectCard';
import { useProjectModals } from '@/app/projects/hooks/useProjectModals';

function ArrowRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default function RecentProjects() {
  const [projects, setProjects] = useState<ProjectApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { onPhotoClick, onGalleryClick, modals } = useProjectModals(projects);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch('/api/projects?limit=3', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        const items = data.projects ?? data;
        setProjects(Array.isArray(items) ? items : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
  }, []);

  return (
    <section className="space-y-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Recent Projects</h2>
        <p className="text-muted-foreground text-lg">
          Take a look at some of our latest custom woodworking projects
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading projects…</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
          <p className="font-medium">Error loading projects</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                priority={index < 3}
                isAuthenticated={false}
                onPhotoClick={onPhotoClick}
                onGalleryClick={onGalleryClick}
              />
            ))}
          </div>
          <div className="flex justify-center">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View All Projects
              <ArrowRightIcon />
            </Link>
          </div>
        </>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center gap-6">
          <p className="text-muted-foreground text-lg">No projects yet.</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
          >
            View All Projects
            <ArrowRightIcon />
          </Link>
        </div>
      )}

      {modals}

      <div className="bg-card border border-border rounded-xl shadow-md p-8 text-center">
        <h3 className="text-2xl font-bold text-foreground mb-3">Ready to Start Your Project?</h3>
        <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
          Let&apos;s bring your vision to life with quality craftsmanship and attention to detail.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Contact Us Today
        </Link>
      </div>
    </section>
  );
}
