'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import ProjectUploadForm from '@/components/ProjectUploadForm';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectApiResponse } from '@/types/project';

/** History state for modal stack: each entry is one modal level (gallery or photo). */
type ModalHistoryState =
  | { modal: 'gallery'; projectId: string }
  | { modal: 'photo'; projectId: string; photoIndex: number }
  | null;

const PAGE_SIZE = 6;
const TAG_NONE = '__none__';

function formatProjectDate(createdAt: string, dateIsMonthOnly?: boolean | null): string {
  const d = new Date(createdAt);
  const month = d.toLocaleString('default', { month: 'long' });
  const year = d.getFullYear();
  if (dateIsMonthOnly) {
    return `${month} ${year}`;
  }
  const day = d.getDate();
  return `${month} ${day}, ${year}`;
}

function ProjectCard({
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
        {/* Overlay: title, tags, date — click/tap opens gallery modal */}
        <button
          type="button"
          onClick={handleOverlayClick}
          className="absolute inset-x-0 bottom-0 w-full text-left bg-gradient-to-t from-black/85 via-black/60 to-transparent pt-12 px-3 pb-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset touch-manipulation"
          aria-label={`Open gallery: ${project.title}`}
        >
          <h4 className="font-bold text-lg text-white drop-shadow-sm">{project.title}</h4>
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
          <p className="text-xs text-white/90">
            {formatProjectDate(project.createdAt, project.dateIsMonthOnly)}
          </p>
        </button>
      </div>
      {project.description && (
        <div className="p-4 pt-2">
          <p className="text-sm text-foreground/80 line-clamp-3">{project.description}</p>
        </div>
      )}
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
            className="flex-1 bg-destructive text-destructive-foreground py-2 px-4 rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {deletingId === project.id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

function SortableProjectCard({
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
        {/* Overlay: title, tags, date — pointer-events-none so taps pass through to open photo modal */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent pt-12 px-3 pb-3 pointer-events-none">
          <h4 className="font-bold text-lg text-white drop-shadow-sm">{project.title}</h4>
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
          <p className="text-xs text-white/90">
            {formatProjectDate(project.createdAt, project.dateIsMonthOnly)}
          </p>
        </div>
      </div>
      {project.description && (
        <div className="p-4 pt-2">
          <p className="text-sm text-foreground/80 line-clamp-3">{project.description}</p>
        </div>
      )}
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
            className="flex-1 bg-destructive text-destructive-foreground py-2 px-4 rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {deletingId === project.id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [projects, setProjects] = useState<ProjectApiResponse[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [dateKeyOfDragged, setDateKeyOfDragged] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectApiResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoModalProject, setPhotoModalProject] = useState<ProjectApiResponse | null>(null);
  const [photoModalIndex, setPhotoModalIndex] = useState(0);
  const [photoModalDragOffset, setPhotoModalDragOffset] = useState(0);
  const [photoModalIsDragging, setPhotoModalIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartOffset = useRef(0);
  const carouselContainerRef = useRef<HTMLDivElement | null>(null);
  const [galleryModalProject, setGalleryModalProject] = useState<ProjectApiResponse | null>(null);
  const projectsRef = useRef<ProjectApiResponse[]>([]);
  projectsRef.current = projects;

  const maxDisplayCountRef = useRef(PAGE_SIZE);
  maxDisplayCountRef.current = Math.max(maxDisplayCountRef.current, projects.length);

  const buildProjectsUrl = useCallback(
    (offset: number, limit: number) => {
      const params = new URLSearchParams();
      if (selectedTag !== null) {
        params.set('tag', selectedTag === TAG_NONE ? 'None' : selectedTag);
      }
      if (selectedYear !== null) params.set('year', String(selectedYear));
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      return `/api/projects?${params.toString()}`;
    },
    [selectedTag, selectedYear],
  );

  const fetchProjects = useCallback(
    async (opts?: { append?: boolean; offset?: number; limit?: number }) => {
      const append = opts?.append ?? false;
      const offset = opts?.offset ?? 0;
      const limit = opts?.limit ?? PAGE_SIZE;
      try {
        if (!append) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }
        const url = buildProjectsUrl(offset, limit);
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        const items = data.projects ?? data;
        const more = data.hasMore ?? false;
        if (append) {
          setProjects((prev) => [...prev, ...items]);
        } else {
          setProjects(items);
        }
        setHasMore(more);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildProjectsUrl],
  );

  const fetchTagNames = useCallback(async () => {
    try {
      const res = await fetch('/api/tags?list=names', { credentials: 'include' });
      if (!res.ok) return;
      const names = await res.json();
      setTagNames(Array.isArray(names) ? names : []);
    } catch {
      // non-blocking
    }
  }, []);

  const fetchYears = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/years', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setYears(Array.isArray(data) ? data : []);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    const limit = Math.max(PAGE_SIZE, maxDisplayCountRef.current);
    fetchProjects({ limit });
  }, [fetchProjects]);

  useEffect(() => {
    fetchTagNames();
    fetchYears();
  }, [fetchTagNames, fetchYears]);

  // Lock body scroll when photo or gallery modal is open (mobile-friendly)
  useEffect(() => {
    if (photoModalProject || galleryModalProject) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [photoModalProject, galleryModalProject]);

  // Sync modal state from history when user presses back/forward (popstate)
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as ModalHistoryState | null | undefined;
      const list = projectsRef.current;

      if (!state || !state.modal) {
        setGalleryModalProject(null);
        setPhotoModalProject(null);
        return;
      }

      if (state.modal === 'gallery') {
        const project = list.find((p) => p.id === state.projectId) ?? null;
        setGalleryModalProject(project);
        setPhotoModalProject(null);
        return;
      }

      if (state.modal === 'photo') {
        const project = list.find((p) => p.id === state.projectId) ?? null;
        setPhotoModalProject(project);
        setPhotoModalIndex(state.photoIndex ?? 0);
        setPhotoModalDragOffset(0);
        setPhotoModalIsDragging(false);
        setGalleryModalProject(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const closePhotoModal = useCallback(() => {
    window.history.back();
  }, []);

  const closeGalleryModal = useCallback(() => {
    window.history.back();
  }, []);

  const openGalleryModal = useCallback((project: ProjectApiResponse) => {
    const url = window.location.pathname + window.location.search + window.location.hash;
    window.history.pushState({ modal: 'gallery', projectId: project.id } satisfies ModalHistoryState, '', url);
    setGalleryModalProject(project);
    setPhotoModalProject(null);
  }, []);

  const openPhotoModal = useCallback((project: ProjectApiResponse, index: number) => {
    const url = window.location.pathname + window.location.search + window.location.hash;
    window.history.pushState({ modal: 'photo', projectId: project.id, photoIndex: index } satisfies ModalHistoryState, '', url);
    setPhotoModalProject(project);
    setPhotoModalIndex(index);
    setPhotoModalDragOffset(0);
    setPhotoModalIsDragging(false);
    setGalleryModalProject(null);
  }, []);

  // Close gallery on Escape
  useEffect(() => {
    if (!galleryModalProject) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGalleryModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [galleryModalProject, closeGalleryModal]);

  // Close photo modal on Escape; Arrow keys for carousel
  useEffect(() => {
    if (!photoModalProject) return;
    const imageUrls =
      photoModalProject.images?.length ? photoModalProject.images.map((i) => i.imageUrl) : photoModalProject.imageUrl ? [photoModalProject.imageUrl] : [];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhotoModal();
      if (imageUrls.length <= 1) return;
      if (e.key === 'ArrowLeft') setPhotoModalIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length);
      if (e.key === 'ArrowRight') setPhotoModalIndex((i) => (i + 1) % imageUrls.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [photoModalProject, closePhotoModal]);

  // Mouse: small movement to start drag. Touch: long-press (250ms) so scroll works until then.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find((p) => p.id === event.active.id);
    setDateKeyOfDragged(project?.createdAt?.slice(0, 10) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDateKeyOfDragged(null);
    if (!over || active.id === over.id) return;
    setProjects((prev) => {
      const ids = prev.map((p) => p.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const dragged = prev[oldIndex];
      if (!dragged?.createdAt) return prev;
      const dateKey = dragged.createdAt.slice(0, 10);
      const sameDateIndices = prev
        .map((p, i) => (p.createdAt?.slice(0, 10) === dateKey ? i : -1))
        .filter((i) => i >= 0);
      if (!sameDateIndices.includes(newIndex)) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const sameDateCollisionDetection: CollisionDetection = (args) => {
    const base = closestCenter(args);
    const activeKey = (args.active.data.current as { dateKey?: string } | undefined)?.dateKey;
    if (activeKey == null) return base;
    return base.filter((c) => {
      const overProject = projects.find((p) => p.id === c.id);
      const overKey = overProject?.createdAt?.slice(0, 10);
      return overKey === activeKey;
    });
  };

  const handleSaveOrder = async () => {
    if (projects.length === 0) {
      setIsReorderMode(false);
      return;
    }
    setIsSavingOrder(true);
    try {
      const res = await fetch('/api/projects/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderedIds: projects.map((p) => p.id) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save order');
      }
      setIsReorderMode(false);
      setSelectedTag(null);
      await fetchProjects({ limit: Math.max(PAGE_SIZE, projects.length) });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save order');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const refreshProjects = useCallback(() => {
    fetchProjects({ limit: Math.max(PAGE_SIZE, projects.length) });
  }, [fetchProjects, projects.length]);

  const handleEdit = useCallback((project: ProjectApiResponse) => {
    setEditingProject(project);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingProject(null);
  }, []);

  const handleProjectSuccess = useCallback(() => {
    setEditingProject(null);
    refreshProjects();
  }, [refreshProjects]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Are you sure you want to delete this project?')) return;
      setDeletingId(id);
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to delete project');
        }
        await refreshProjects();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete project');
      } finally {
        setDeletingId(null);
      }
    },
    [refreshProjects],
  );

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Projects</h1>

        {/* Project upload form (authenticated only) */}
        {isAuthenticated && (
          <div className="mb-8 sm:mb-12">
            {editingProject && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Editing:</span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-500/70 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition-colors hover:border-amber-500 hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:text-amber-400 dark:hover:bg-amber-500/25"
                  aria-label="Cancel editing and close form"
                >
                  <span aria-hidden>✕</span>
                  Cancel editing
                </button>
              </div>
            )}
            <ProjectUploadForm
              key={editingProject?.id ?? 'new'}
              onSuccess={handleProjectSuccess}
              editProject={editingProject ?? undefined}
            />
          </div>
        )}

        {/* Tag + Year filters + Edit order (when authenticated) */}
        {!isReorderMode && (
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Tag:</span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedTag === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedTag(TAG_NONE)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedTag === TAG_NONE
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                None
              </button>
              {tagNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedTag(name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTag === name
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Year:</span>
              <select
                aria-label="Filter by year"
                value={selectedYear ?? ''}
                onChange={(e) =>
                  setSelectedYear(e.target.value ? parseInt(e.target.value, 10) : null)
                }
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All time</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {isReorderMode && (
          <p className="text-muted-foreground mb-4">
            {selectedYear !== null
              ? `Showing all projects from ${selectedYear} in true order. Drag cards to reorder.`
              : 'Showing all projects in true order. Drag cards to reorder.'}
          </p>
        )}
        {isAuthenticated && !loading && (projects.length > 0 || isReorderMode) && (
          <div className="flex flex-wrap items-center justify-end gap-2 mb-8">
            {isReorderMode ? (
              <>
                <button
                  onClick={async () => {
                    const count = projects.length;
                    setIsReorderMode(false);
                    setSelectedTag(null);
                    await fetchProjects({ limit: Math.max(PAGE_SIZE, count) });
                  }}
                  disabled={isSavingOrder}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={isSavingOrder}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingOrder ? 'Saving…' : 'Save order'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsReorderMode(true)}
                className="px-4 py-2 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
              >
                Edit order
              </button>
            )}
          </div>
        )}

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

        {!loading && !error && projects.length === 0 && (
          <div className="p-12 bg-muted border border-border rounded-xl text-center">
            <p className="text-muted-foreground text-lg">
              {selectedTag === TAG_NONE
                ? 'No projects without tags.'
                : selectedTag
                  ? `No projects with tag “${selectedTag}”.`
                  : selectedYear
                    ? `No projects from ${selectedYear}.`
                    : 'No projects yet.'}
            </p>
          </div>
        )}

        {!loading && !error && projects.length > 0 && !isReorderMode && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  priority={index < 3}
                  isAuthenticated={isAuthenticated}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPhotoClick={(project) => openPhotoModal(project, 0)}
                  onGalleryClick={openGalleryModal}
                  deletingId={deletingId}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => fetchProjects({ append: true, offset: projects.length })}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && projects.length > 0 && isReorderMode && (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={sameDateCollisionDetection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={projects.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <SortableProjectCard
                      key={project.id}
                      project={project}
                      dateKeyOfDragged={dateKeyOfDragged}
                      isAuthenticated={isAuthenticated}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      deletingId={deletingId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => fetchProjects({ append: true, offset: projects.length })}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Gallery modal: thumbnails for the project; selecting one opens the photo modal at that image */}
        {galleryModalProject && (() => {
          const imageUrls =
            galleryModalProject.images?.length
              ? galleryModalProject.images.map((i) => i.imageUrl)
              : galleryModalProject.imageUrl
                ? [galleryModalProject.imageUrl]
                : [];
          if (imageUrls.length === 0) return null;
          const openPhotoAt = (index: number) => openPhotoModal(galleryModalProject, index);
          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Gallery: ${galleryModalProject.title}`}
              className="fixed inset-0 z-50 flex flex-col bg-background p-0 sm:p-4 sm:py-6"
              onClick={() => closeGalleryModal()}
            >
              <div className="flex items-center justify-between shrink-0 px-4 py-3 sm:px-0 border-b border-border sm:border-0">
                <h2 className="text-lg font-semibold text-foreground truncate pr-2">{galleryModalProject.title}</h2>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); closeGalleryModal(); }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Close gallery"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div
                className="flex-1 overflow-auto p-4 flex flex-wrap items-start gap-3 sm:gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                {imageUrls.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="w-[calc((100%-0.75rem)/2)] sm:w-52 md:w-64 shrink-0"
                  >
                    <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                      <button
                        type="button"
                        onClick={() => openPhotoAt(i)}
                        className="absolute inset-0 rounded-lg overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full h-full"
                        aria-label={`View image ${i + 1} of ${imageUrls.length}`}
                      >
                        <Image
                          src={url}
                          alt={`${galleryModalProject.title} — image ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Photo lightbox modal with carousel — only used when not in reorder mode (ProjectCard only) */}
        {photoModalProject && (() => {
          const imageUrls =
            photoModalProject.images?.length
              ? photoModalProject.images.map((i) => i.imageUrl)
              : photoModalProject.imageUrl
                ? [photoModalProject.imageUrl]
                : [];
          if (imageUrls.length === 0) return null;
          const currentUrl = imageUrls[photoModalIndex] ?? imageUrls[0];
          const canGoPrev = imageUrls.length > 1;
          const canGoNext = imageUrls.length > 1;
          const goPrev = () => {
            setPhotoModalIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length);
            setPhotoModalDragOffset(0);
          };
          const goNext = () => {
            setPhotoModalIndex((i) => (i + 1) % imageUrls.length);
            setPhotoModalDragOffset(0);
          };
          const handleTouchStart = (e: React.TouchEvent) => {
            if (imageUrls.length <= 1) return;
            touchStartX.current = e.touches[0].clientX;
            touchStartOffset.current = photoModalDragOffset;
            setPhotoModalIsDragging(true);
          };
          const handleTouchMove = (e: React.TouchEvent) => {
            if (touchStartX.current == null || imageUrls.length <= 1) return;
            const clientX = e.touches[0].clientX;
            let rawOffset = touchStartOffset.current + (clientX - touchStartX.current);
            if (photoModalIndex <= 0 && rawOffset > 0) rawOffset = rawOffset * 0.3;
            if (photoModalIndex >= imageUrls.length - 1 && rawOffset < 0) rawOffset = rawOffset * 0.3;
            setPhotoModalDragOffset(rawOffset);
          };
          const handleTouchEnd = (e: React.TouchEvent) => {
            if (touchStartX.current == null || imageUrls.length <= 1) {
              setPhotoModalIsDragging(false);
              return;
            }
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            const width = carouselContainerRef.current?.offsetWidth ?? 300;
            const threshold = Math.min(width * 0.25, 80);
            if (dx > threshold && photoModalIndex > 0) goPrev();
            else if (dx < -threshold && photoModalIndex < imageUrls.length - 1) goNext();
            else setPhotoModalDragOffset(0);
            touchStartX.current = null;
            setPhotoModalIsDragging(false);
          };
          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Viewing ${photoModalProject.title}, image ${photoModalIndex + 1} of ${imageUrls.length}`}
              className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 touch-manipulation"
              onClick={() => closePhotoModal()}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closePhotoModal(); }}
                className="absolute top-4 right-4 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {canGoPrev && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  aria-label="Previous image"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {canGoNext && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  aria-label="Next image"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              <div
                ref={carouselContainerRef}
                className="relative w-full h-full sm:max-w-4xl sm:h-[85vh] flex items-center overflow-hidden touch-pan-y"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {imageUrls.length > 1 ? (
                  <div
                    className="flex h-full shrink-0"
                    style={{
                      width: `${imageUrls.length * 100}%`,
                      transform: `translateX(calc(-${(100 * photoModalIndex) / imageUrls.length}% + ${photoModalDragOffset}px))`,
                      transition: photoModalIsDragging ? 'none' : 'transform 0.25s ease-out',
                    }}
                  >
                    {imageUrls.map((url, i) => (
                      <div
                        key={`${url}-${i}`}
                        className="relative h-full shrink-0 flex items-center justify-center"
                        style={{ width: `${100 / imageUrls.length}%` }}
                      >
                        <Image
                          src={url}
                          alt={`${photoModalProject.title} — image ${i + 1} of ${imageUrls.length}`}
                          fill
                          className="object-contain sm:rounded-lg pointer-events-none"
                          sizes="(max-width: 640px) 100vw, 896px"
                          priority={i <= 1}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <Image
                      src={currentUrl}
                      alt={`${photoModalProject.title} — image 1 of 1`}
                      fill
                      className="object-contain sm:rounded-lg"
                      sizes="(max-width: 640px) 100vw, 896px"
                      priority
                    />
                  </div>
                )}
              </div>

              {imageUrls.length > 1 && (
                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm px-2 py-1.5"
                  aria-hidden
                >
                  {imageUrls.map((_, i) => (
                    <span
                      key={i}
                      className={`rounded-full transition-all ${
                        i === photoModalIndex ? 'h-1.5 w-1.5 bg-white' : 'h-1 w-1 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
