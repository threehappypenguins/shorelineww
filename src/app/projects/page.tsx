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
  deletingId,
}: {
  project: ProjectApiResponse;
  priority?: boolean;
  isAuthenticated?: boolean;
  onEdit?: (project: ProjectApiResponse) => void;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      {project.imageUrl && (
        <div className="relative h-48 bg-muted shrink-0">
          <Image
            src={project.imageUrl}
            alt={project.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            priority={priority}
          />
          {project.featured && (
            <span className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-medium shadow">
              Featured
            </span>
          )}
        </div>
      )}
      <div className="p-4 flex flex-col grow">
        <h4 className="font-bold text-lg mb-2 text-foreground">{project.title}</h4>
        <div className="min-h-[1.5rem] flex flex-wrap gap-1.5 mb-2">
          {project.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-block px-2 py-0.5 rounded bg-primary/15 text-primary text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
        {project.description && (
          <p className="text-sm text-foreground/80 line-clamp-3">{project.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {formatProjectDate(project.createdAt, project.dateIsMonthOnly)}
        </p>
        {isAuthenticated && onEdit && onDelete && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
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
      {project.imageUrl && (
        <div className="relative h-48 bg-muted shrink-0">
          <Image
            src={project.imageUrl}
            alt={project.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover pointer-events-none"
          />
          {project.featured && (
            <span className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-medium shadow">
              Featured
            </span>
          )}
        </div>
      )}
      <div className="p-4 flex flex-col grow">
        <h4 className="font-bold text-lg mb-2 text-foreground">{project.title}</h4>
        <div className="min-h-[1.5rem] flex flex-wrap gap-1.5 mb-2">
          {project.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-block px-2 py-0.5 rounded bg-primary/15 text-primary text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
        {project.description && (
          <p className="text-sm text-foreground/80 line-clamp-3">{project.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {formatProjectDate(project.createdAt, project.dateIsMonthOnly)}
        </p>
        {isAuthenticated && onEdit && onDelete && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
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
      </div>
    </div>
  );
}
