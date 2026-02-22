/**
 * @module app/projects/components/SortableProjectCard
 * @description Draggable project card for reorder mode using dnd-kit.
 */
'use client';

import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatProjectDate } from '../constants';
import type { ProjectApiResponse } from '@/types/project';

/**
 * Sortable project card component for drag-and-drop reordering.
 * Uses dnd-kit for drag functionality. Cards can only be reordered
 * within the same date group.
 *
 * @param props - Component props
 * @param props.project - The project data to display
 * @param props.dateKeyOfDragged - Date key (YYYY-MM-DD) of the currently dragged card
 * @param props.isAuthenticated - Whether user is authenticated
 * @param props.onEdit - Callback when edit button is clicked
 * @param props.onDelete - Callback when delete button is clicked
 * @param props.deletingId - ID of project currently being deleted
 * @returns The sortable project card JSX element
 *
 * @example
 * ```tsx
 * <SortableProjectCard
 *   project={project}
 *   dateKeyOfDragged={draggingDateKey}
 *   isAuthenticated={true}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export default function SortableProjectCard({
  project,
  dateKeyOfDragged,
  isAuthenticated = false,
  onEdit,
  onDelete,
  deletingId,
}: {
  project: ProjectApiResponse;
  dateKeyOfDragged: string | null;
  isAuthenticated?: boolean;
  onEdit?: (project: ProjectApiResponse) => void;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
}) {
  const dateKey = project.createdAt?.slice(0, 10) ?? '';
  const isSameDateGroup = dateKeyOfDragged == null || dateKey === dateKeyOfDragged;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: { dateKey },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isSameDateGroup ? { ...attributes, ...listeners } : {})}
      className={`bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full touch-manipulation select-none ${
        !isSameDateGroup
          ? 'opacity-70 pointer-events-none cursor-default ring-0 shadow-none'
          : isDragging
            ? 'opacity-90 z-10 cursor-grabbing ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_0_2px_var(--primary),0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)]'
            : 'cursor-grab active:cursor-grabbing ring-2 ring-primary/50 ring-offset-2 ring-offset-background shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_30%,transparent),0_0_16px_color-mix(in_srgb,var(--primary)_20%,transparent)] hover:ring-primary/70 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_40%,transparent),0_0_20px_color-mix(in_srgb,var(--primary)_30%,transparent)] transition-all'
      }`}
      aria-label={isSameDateGroup ? `Drag to reorder: ${project.title}` : `${project.title} (different date)`}
    >
      <div className="relative h-72 bg-muted shrink-0">
        {project.imageUrl ? (
          <Image
            src={project.imageUrl}
            alt={project.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover pointer-events-none"
          />
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
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent pt-12 px-3 pb-3 pointer-events-none">
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
        </div>
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
