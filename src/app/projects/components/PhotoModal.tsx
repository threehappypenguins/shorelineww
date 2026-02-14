'use client';

import { useRef } from 'react';
import Image from 'next/image';
import type { ProjectApiResponse } from '@/types/project';

type Props = {
  project: ProjectApiResponse;
  imageUrls: string[];
  index: number;
  onIndexChange: (index: number) => void;
  dragOffset: number;
  onDragOffsetChange: (offset: number) => void;
  isDragging: boolean;
  onIsDraggingChange: (value: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

export default function PhotoModal({
  project,
  imageUrls,
  index,
  onIndexChange,
  dragOffset,
  onDragOffsetChange,
  isDragging,
  onIsDraggingChange,
  containerRef,
  onClose,
}: Props) {
  const touchStartX = useRef<number | null>(null);
  const touchStartOffset = useRef(0);

  if (imageUrls.length === 0) return null;

  const currentUrl = imageUrls[index] ?? imageUrls[0];
  const canGoPrev = imageUrls.length > 1;
  const canGoNext = imageUrls.length > 1;

  const goPrev = () => {
    onIndexChange((index - 1 + imageUrls.length) % imageUrls.length);
    onDragOffsetChange(0);
  };

  const goNext = () => {
    onIndexChange((index + 1) % imageUrls.length);
    onDragOffsetChange(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageUrls.length <= 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartOffset.current = dragOffset;
    onIsDraggingChange(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null || imageUrls.length <= 1) return;
    const clientX = e.touches[0].clientX;
    let rawOffset = touchStartOffset.current + (clientX - touchStartX.current);
    if (index <= 0 && rawOffset > 0) rawOffset = rawOffset * 0.3;
    if (index >= imageUrls.length - 1 && rawOffset < 0) rawOffset = rawOffset * 0.3;
    onDragOffsetChange(rawOffset);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || imageUrls.length <= 1) {
      onIsDraggingChange(false);
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const width = containerRef.current?.offsetWidth ?? 300;
    const threshold = Math.min(width * 0.25, 80);
    if (dx > threshold && index > 0) goPrev();
    else if (dx < -threshold && index < imageUrls.length - 1) goNext();
    else onDragOffsetChange(0);
    touchStartX.current = null;
    onIsDraggingChange(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${project.title}, image ${index + 1} of ${imageUrls.length}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 touch-manipulation"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
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
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Next image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div
        ref={containerRef}
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
              transform: `translateX(calc(-${(100 * index) / imageUrls.length}% + ${dragOffset}px))`,
              transition: isDragging ? 'none' : 'transform 0.25s ease-out',
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
                  alt={`${project.title} — image ${i + 1} of ${imageUrls.length}`}
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
              alt={`${project.title} — image 1 of 1`}
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
                i === index ? 'h-1.5 w-1.5 bg-white' : 'h-1 w-1 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
