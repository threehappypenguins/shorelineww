'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ProjectUploadForm from './components/ProjectUploadForm';
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
} from '@dnd-kit/sortable';
import type { ProjectApiResponse } from '@/types/project';

import { PAGE_SIZE, TAG_NONE, type ModalHistoryState } from './constants';
import ProjectCard from './components/ProjectCard';
import SortableProjectCard from './components/SortableProjectCard';
import ProjectsFilters from './components/ProjectsFilters';
import ProjectsReorderBar from './components/ProjectsReorderBar';
import GalleryModal from './components/GalleryModal';
import PhotoModal from './components/PhotoModal';

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

  useEffect(() => {
    if (photoModalProject || galleryModalProject) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [photoModalProject, galleryModalProject]);

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

  useEffect(() => {
    if (!galleryModalProject) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGalleryModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [galleryModalProject, closeGalleryModal]);

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

  const handleEdit = useCallback(async (project: ProjectApiResponse) => {
    const res = await fetch(`/api/projects/${project.id}`, { credentials: 'include' });
    if (res.ok) {
      const full = await res.json();
      setEditingProject(full);
    } else {
      setEditingProject(project);
    }
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

  const handleCancelReorder = useCallback(async () => {
    const count = projects.length;
    setIsReorderMode(false);
    setSelectedTag(null);
    await fetchProjects({ limit: Math.max(PAGE_SIZE, count) });
  }, [projects.length, fetchProjects]);

  const photoModalImageUrls =
    photoModalProject?.images?.length
      ? photoModalProject.images.map((i) => i.imageUrl)
      : photoModalProject?.imageUrl
        ? [photoModalProject.imageUrl]
        : [];

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Projects</h1>

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

        <ProjectsFilters
          tagNames={tagNames}
          years={years}
          selectedTag={selectedTag}
          selectedYear={selectedYear}
          isReorderMode={isReorderMode}
          onTagChange={setSelectedTag}
          onYearChange={setSelectedYear}
        />

        {isAuthenticated && !loading && (projects.length > 0 || isReorderMode) && (
          <ProjectsReorderBar
            isReorderMode={isReorderMode}
            isSavingOrder={isSavingOrder}
            onEnterReorderMode={() => setIsReorderMode(true)}
            onCancelReorder={handleCancelReorder}
            onSaveOrder={handleSaveOrder}
          />
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
                  ? `No projects with tag "${selectedTag}".`
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

        {galleryModalProject && (
          <GalleryModal
            project={galleryModalProject}
            onClose={closeGalleryModal}
            onOpenPhoto={(index) => openPhotoModal(galleryModalProject, index)}
          />
        )}

        {photoModalProject && photoModalImageUrls.length > 0 && (
          <PhotoModal
            project={photoModalProject}
            imageUrls={photoModalImageUrls}
            index={photoModalIndex}
            onIndexChange={setPhotoModalIndex}
            dragOffset={photoModalDragOffset}
            onDragOffsetChange={setPhotoModalDragOffset}
            isDragging={photoModalIsDragging}
            onIsDraggingChange={setPhotoModalIsDragging}
            containerRef={carouselContainerRef}
            onClose={closePhotoModal}
          />
        )}
      </div>
    </div>
  );
}
