'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ProjectApiResponse } from '@/types/project';
import type { ModalHistoryState } from '../constants';
import GalleryModal from '../components/GalleryModal';
import PhotoModal from '../components/PhotoModal';

/**
 * Shared hook for project gallery and photo modal state and history.
 * Use on both the projects page and the landing recent-projects section
 * so clicking a card image or details opens the same modals with back/escape support.
 */
export function useProjectModals(projects: ProjectApiResponse[]) {
  const projectsRef = useRef<ProjectApiResponse[]>(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const [photoModalProject, setPhotoModalProject] = useState<ProjectApiResponse | null>(null);
  const [photoModalIndex, setPhotoModalIndex] = useState(0);
  const [photoModalDragOffset, setPhotoModalDragOffset] = useState(0);
  const [photoModalIsDragging, setPhotoModalIsDragging] = useState(false);
  const [galleryModalProject, setGalleryModalProject] = useState<ProjectApiResponse | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement | null>(null);

  const closePhotoModal = useCallback(() => {
    window.history.back();
  }, []);

  const closeGalleryModal = useCallback(() => {
    window.history.back();
  }, []);

  const openGalleryModal = useCallback((project: ProjectApiResponse) => {
    const url = window.location.pathname + window.location.search + window.location.hash;
    window.history.pushState(
      { modal: 'gallery', projectId: project.id } satisfies ModalHistoryState,
      '',
      url,
    );
    setGalleryModalProject(project);
    setPhotoModalProject(null);
  }, []);

  const openPhotoModal = useCallback((project: ProjectApiResponse, index: number) => {
    const url = window.location.pathname + window.location.search + window.location.hash;
    window.history.pushState(
      { modal: 'photo', projectId: project.id, photoIndex: index } satisfies ModalHistoryState,
      '',
      url,
    );
    setPhotoModalProject(project);
    setPhotoModalIndex(index);
    setPhotoModalDragOffset(0);
    setPhotoModalIsDragging(false);
    setGalleryModalProject(null);
  }, []);

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
      photoModalProject.images?.length
        ? photoModalProject.images.map((i) => i.imageUrl)
        : photoModalProject.imageUrl
          ? [photoModalProject.imageUrl]
          : [];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePhotoModal();
        return;
      }
      if (imageUrls.length <= 1) return;
      if (e.key === 'ArrowLeft')
        setPhotoModalIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length);
      if (e.key === 'ArrowRight') setPhotoModalIndex((i) => (i + 1) % imageUrls.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [photoModalProject, closePhotoModal]);

  const photoModalImageUrls =
    photoModalProject?.images?.length
      ? photoModalProject.images.map((i) => i.imageUrl)
      : photoModalProject?.imageUrl
        ? [photoModalProject.imageUrl]
        : [];

  const onPhotoClick = useCallback(
    (project: ProjectApiResponse) => openPhotoModal(project, 0),
    [openPhotoModal],
  );

  const modals = (
    <>
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
    </>
  );

  return {
    onPhotoClick,
    onGalleryClick: openGalleryModal,
    modals,
  };
}
