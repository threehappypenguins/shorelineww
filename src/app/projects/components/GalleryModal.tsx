'use client';

import Image from 'next/image';
import type { ProjectApiResponse } from '@/types/project';

function getImageUrls(project: ProjectApiResponse): string[] {
  if (project.images?.length) {
    return project.images.map((i) => i.imageUrl);
  }
  if (project.imageUrl) return [project.imageUrl];
  return [];
}

type Props = {
  project: ProjectApiResponse;
  onClose: () => void;
  onOpenPhoto: (index: number) => void;
};

export default function GalleryModal({ project, onClose, onOpenPhoto }: Props) {
  const imageUrls = getImageUrls(project);
  if (imageUrls.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Gallery: ${project.title}`}
      className="fixed inset-0 z-50 flex flex-col bg-background p-0 sm:p-4 sm:py-6"
      onClick={onClose}
    >
      <div className="flex items-center justify-between shrink-0 px-4 py-3 sm:px-0 border-b border-border sm:border-0">
        <h2 className="text-lg font-semibold text-foreground truncate pr-2">{project.title}</h2>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
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
                onClick={() => onOpenPhoto(i)}
                className="absolute inset-0 rounded-lg overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full h-full"
                aria-label={`View image ${i + 1} of ${imageUrls.length}`}
              >
                <Image
                  src={url}
                  alt={`${project.title} — image ${i + 1}`}
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
}
