/**
 * @module app/projects/components/ProjectCard
 * @description Project card component for displaying project thumbnails in the gallery grid.
 */
'use client';

import Image from 'next/image';
import { formatProjectDate } from '../constants';
import type { ProjectApiResponse } from '@/types/project';

/**
 * Project card component displaying a project thumbnail with metadata.
 * Shows:
 * - Project image with featured badge if applicable
 * - Title, tags, and date overlay
 * - Optional description
 * - Admin: edit and delete buttons
 *
 * @param props - Component props
 * @param props.project - The project data to display
 * @param props.priority - Whether to prioritize image loading (for above-fold cards)
 * @param props.isAuthenticated - Whether user is authenticated (shows admin controls)
 * @param props.onEdit - Callback when edit button is clicked
 * @param props.onDelete - Callback when delete button is clicked
 * @param props.onPhotoClick - Callback when image is clicked (opens photo modal)
 * @param props.onGalleryClick - Callback when overlay is clicked (opens gallery modal)
 * @param props.deletingId - ID of project currently being deleted (shows loading state)
 * @returns The project card JSX element
 *
 * @example
 * ```tsx
 * <ProjectCard
 *   project={project}
 *   isAuthenticated={true}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export default function ProjectCard({
  project,
  priority = false,
  isAuthenticated = false,
  onEdit,
  onDelete,
  onPhotoClick,
  onGalleryClick,
  deletingId,
}: {
  project: ProjectApiResponse;
  priority?: boolean;
  isAuthenticated?: boolean;
  onEdit?: (project: ProjectApiResponse) => void;
  onDelete?: (id: string) => void;
  onPhotoClick?: (project: ProjectApiResponse) => void;
  onGalleryClick?: (project: ProjectApiResponse) => void;
  deletingId?: string | null;
}) {
  const handleImageClick = () => {
    if (project.imageUrl && onPhotoClick) onPhotoClick(project);
  };
  const handleOverlayClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onGalleryClick) onGalleryClick(project);
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="relative h-72 bg-muted shrink-0">
        {project.imageUrl ? (
          <button
            type="button"
            onClick={handleImageClick}
            className="absolute inset-0 w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-t-xl touch-manipulation"
            aria-label={`View full size: ${project.title}`}
          >
            <Image
              src={project.imageUrl}
              alt={project.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover pointer-events-none"
              priority={priority}
            />
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 text-sm">
            No image
          </div>
        )}
        {project.featured && (
          <span className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-medium shadow">
            Featured
          </span>
        )}
        <button
          type="button"
          onClick={handleOverlayClick}
          className="absolute inset-x-0 bottom-0 w-full text-left bg-gradient-to-t from-black/85 via-black/60 to-transparent pt-12 px-3 pb-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset touch-manipulation"
          aria-label={`Open gallery: ${project.title}`}
        >
          <h4 className="font-bold text-lg text-white [text-rendering:geometricPrecision] [text-shadow:0_1px_2px_rgba(0,0,0,0.45),0_0_1px_rgba(0,0,0,0.4)]">
            {project.title}
          </h4>
          <div className="min-h-[1.5rem] flex flex-wrap gap-1.5 mt-1.5 mb-1">
            {project.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-0.5 rounded bg-white/25 text-white text-xs backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/90 [text-rendering:geometricPrecision] [text-shadow:0_1px_1px_rgba(0,0,0,0.4),0_0_1px_rgba(0,0,0,0.3)]">
            {formatProjectDate(project.createdAt, project.dateIsMonthOnly)}
          </p>
          <p className="text-sm text-white/90 [text-rendering:geometricPrecision] [text-shadow:0_1px_1px_rgba(0,0,0,0.4),0_0_1px_rgba(0,0,0,0.3)] line-clamp-1 mt-1 min-h-[1.25rem]">
            {project.description ?? '\u00A0'}
          </p>
        </button>
      </div>
      {isAuthenticated && onEdit && onDelete && (
        <div className="flex gap-2 p-4 pt-2 mt-auto border-t border-border">
          <button
            type="button"
            onClick={() => onEdit(project)}
            className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-accent transition-colors text-sm"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            disabled={deletingId === project.id}
            className="flex-1 flex items-center justify-center gap-2 bg-destructive text-destructive-foreground py-2 px-4 rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {deletingId === project.id ? (
              <>
                <svg
                  className="size-4 shrink-0 animate-spin"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="40 23"
                    strokeLinecap="round"
                  />
                </svg>
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
