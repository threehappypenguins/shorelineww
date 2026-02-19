/**
 * @module app/components/LandingHero
 * @description Landing page hero with editable title, tagline, background image, and image position.
 * Admin-only editing; text and image act as placeholders when not set.
 */

'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const DEFAULT_TITLE = 'Quality Carpentry From Floor to Finish';
const DEFAULT_TAGLINE =
  'Specializing in stairs, railings, millwork, flooring, and renovations';

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

export type HeroImagePosition = { x: number; y: number };

type Props = {
  initialTitle: string | null;
  initialTagline: string | null;
  /** Resolved hero image URL (from publicId). Null when no image set. */
  heroImageUrl: string | null;
  /** Current saved hero image publicId (for deleting on replace/remove). */
  initialHeroImagePublicId: string | null;
  /** Object position JSON string, e.g. '{"x":50,"y":50}'. Parsed in component. */
  heroImagePositionRaw: string | null;
  isAdmin: boolean;
};

function parsePosition(raw: string | null): HeroImagePosition {
  if (raw == null || raw === '') return { x: 50, y: 50 };
  try {
    const p = JSON.parse(raw) as { x?: number; y?: number };
    const x = typeof p?.x === 'number' ? Math.min(100, Math.max(0, p.x)) : 50;
    const y = typeof p?.y === 'number' ? Math.min(100, Math.max(0, p.y)) : 50;
    return { x, y };
  } catch {
    return { x: 50, y: 50 };
  }
}

export default function LandingHero({
  initialTitle,
  initialTagline,
  heroImageUrl,
  initialHeroImagePublicId,
  heroImagePositionRaw,
  isAdmin,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const heroImagePosition = parsePosition(heroImagePositionRaw);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initialTitle ?? DEFAULT_TITLE);
  const [tagline, setTagline] = useState(initialTagline ?? DEFAULT_TAGLINE);
  const [position, setPosition] = useState<HeroImagePosition>(heroImagePosition);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageRemoving, setImageRemoving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  /** Pending upload this session: not saved yet. Cleared on Save or deleted on Cancel. */
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingImagePublicId, setPendingImagePublicId] = useState<string | null>(null);

  const displayTitle = initialTitle ?? DEFAULT_TITLE;
  const displayTagline = initialTagline ?? DEFAULT_TAGLINE;
  const displayImageUrl =
    editing && pendingImageUrl ? pendingImageUrl : heroImageUrl;
  const hasImage = !!displayImageUrl;
  const effectivePosition = editing ? position : heroImagePosition;
  const objectPosition = `${effectivePosition.x}% ${effectivePosition.y}%`;

  async function handleSave() {
    setSaving(true);
    setImageError(null);
    try {
      if (pendingImagePublicId && initialHeroImagePublicId?.trim()) {
        await fetch('/api/cloudinary-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ publicId: initialHeroImagePublicId.trim() }),
        });
      }
      const patches: Promise<Response>[] = [
        fetch('/api/site-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'landing.heroTitle', value: title }),
        }),
        fetch('/api/site-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'landing.heroTagline', value: tagline }),
        }),
        fetch('/api/site-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'landing.heroImagePosition',
            value: JSON.stringify({ x: position.x, y: position.y }),
          }),
        }),
      ];
      if (pendingImagePublicId) {
        patches.push(
          fetch('/api/site-settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'landing.heroImagePublicId',
              value: pendingImagePublicId,
            }),
          })
        );
      }
      await Promise.all(patches);
      setPendingImageUrl(null);
      setPendingImagePublicId(null);
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (pendingImagePublicId) {
      try {
        await fetch('/api/cloudinary-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ publicId: pendingImagePublicId }),
        });
      } catch {
        // Best effort: clear local state either way
      }
      setPendingImageUrl(null);
      setPendingImagePublicId(null);
    }
    setTitle(initialTitle ?? DEFAULT_TITLE);
    setTagline(initialTagline ?? DEFAULT_TAGLINE);
    setPosition(heroImagePosition);
    setEditing(false);
    setImageError(null);
    router.refresh();
  }

  async function handleRemoveImage() {
    setImageError(null);
    setImageRemoving(true);
    try {
      if (pendingImagePublicId) {
        await fetch('/api/cloudinary-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ publicId: pendingImagePublicId }),
        });
        setPendingImageUrl(null);
        setPendingImagePublicId(null);
      }
      if (initialHeroImagePublicId?.trim()) {
        await fetch('/api/cloudinary-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            publicId: initialHeroImagePublicId.trim(),
          }),
        });
        await fetch('/api/site-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'landing.heroImagePublicId',
            value: '',
          }),
        });
      }
      router.refresh();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setImageRemoving(false);
    }
  }

  /** Upload a single file to Cloudinary and set as pending hero image. Used by both file input and File System Access API picker. */
  async function uploadHeroFile(file: File) {
    setImageUploading(true);
    setUploadProgress(0);
    setImageError(null);
    try {
      const configRes = await fetch('/api/cloudinary-config?purpose=landing', {
        credentials: 'include',
      });
      if (!configRes.ok) {
        const data = await configRes.json().catch(() => ({}));
        throw new Error(data.error || 'Upload not configured');
      }
      const { cloudName, apiKey, timestamp, signature, folder } =
        await configRes.json();
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);

      const result = await new Promise<{ public_id: string; secure_url: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
          });
          xhr.addEventListener('load', () => {
            setUploadProgress(100);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error('Invalid Cloudinary response'));
              }
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.error?.message || 'Upload failed'));
              } catch {
                reject(new Error('Upload failed'));
              }
            }
          });
          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.open('POST', uploadUrl);
          xhr.send(fd);
        }
      );

      const publicId = result.public_id;
      let secureUrl = result.secure_url;
      // Cap size and format so preview never loads full-res phone photo (avoids memory spike / near-crash)
      secureUrl = secureUrl.replace(
        '/image/upload/',
        '/image/upload/w_1920,c_fill,f_auto/'
      );
      setPendingImageUrl(secureUrl);
      setPendingImagePublicId(publicId);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setImageUploading(false);
      setUploadProgress(0);
    }
  }

  const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isImage = imageMimeTypes.includes(file.type) || file.type.startsWith('image/');
    if (!isImage) {
      setImageError('Please choose an image file (e.g. JPEG, PNG, HEIC).');
      return;
    }
    setImageError(null);
    void uploadHeroFile(file);
  }

  return (
    <section className="relative w-full min-h-[85vh] sm:min-h-[80vh] flex items-center overflow-visible">
      {/* Background image or empty state */}
      <div className="absolute inset-0 z-0">
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ objectPosition }}
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-black/40" aria-hidden />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-muted/80 border border-dashed border-border"
            aria-hidden
          />
        )}
      </div>

      {editing ? (
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="landing-hero-title" className="sr-only">
              Hero title
            </label>
            <input
              id="landing-hero-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background/95 border border-border rounded px-3 py-2 text-xl sm:text-2xl font-bold text-center text-foreground"
              placeholder={DEFAULT_TITLE}
              aria-label="Hero title"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="landing-hero-tagline" className="sr-only">
              Hero tagline
            </label>
            <input
              id="landing-hero-tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-background/95 border border-border rounded px-3 py-2 text-base sm:text-lg text-center text-foreground"
              placeholder={DEFAULT_TAGLINE}
              aria-label="Hero tagline"
            />
          </div>

          {/* Image upload & position */}
          <div className="bg-background/95 border border-border rounded-lg p-4 space-y-4">
            <p className="text-sm font-medium text-foreground">Hero image</p>
            <p className="text-xs text-muted-foreground">
              The image uploads to Cloudinary right away so you can preview and position it. Save stores your choice for the site.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                aria-label="Choose hero image"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="w-full sm:w-auto px-4 py-2 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 text-sm"
              >
                {imageUploading ? `Uploading… ${uploadProgress}%` : 'Choose image'}
              </button>
              {(hasImage || pendingImageUrl) && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={imageUploading || imageRemoving}
                  className="px-4 py-2 rounded-md border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50 text-sm"
                >
                  {imageRemoving ? 'Removing…' : 'Remove image'}
                </button>
              )}
            </div>
            {imageUploading && (
              <div className="relative w-full h-10 rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center">
                <div
                  className="absolute inset-y-0 left-0 bg-primary text-primary-foreground transition-[width] duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
                <span className="relative z-10 text-sm font-medium text-foreground">
                  {uploadProgress > 0 && uploadProgress < 100
                    ? `Uploading… ${uploadProgress}%`
                    : 'Uploading…'}
                </span>
              </div>
            )}
            {imageError && (
              <p className="text-sm text-destructive" role="alert">
                {imageError}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Adjust focus (which part of the image is visible):
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="landing-hero-pos-x"
                  className="block text-xs text-muted-foreground mb-1"
                >
                  Horizontal: {position.x}%
                </label>
                <input
                  id="landing-hero-pos-x"
                  type="range"
                  min={0}
                  max={100}
                  value={position.x}
                  onChange={(e) =>
                    setPosition((p) => ({ ...p, x: Number(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="landing-hero-pos-y"
                  className="block text-xs text-muted-foreground mb-1"
                >
                  Vertical: {position.y}%
                </label>
                <input
                  id="landing-hero-pos-y"
                  type="range"
                  min={0}
                  max={100}
                  value={position.y}
                  onChange={(e) =>
                    setPosition((p) => ({ ...p, y: Number(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
            </div>
            {displayImageUrl && (
              <>
                {/* Shown only on mobile: so you can see how the hero will look on desktop */}
                <div className="space-y-2 block md:hidden">
                  <p className="text-xs text-muted-foreground">
                    Desktop preview (wide screens — use the vertical slider to choose which part shows):
                  </p>
                  <div
                    className="relative w-full overflow-hidden rounded-md border border-border bg-muted/30"
                    style={{ aspectRatio: '21 / 9' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayImageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      style={{
                        objectPosition: `${position.x}% ${position.y}%`,
                      }}
                    />
                  </div>
                </div>
                {/* Shown only on desktop: so you can see how the hero will look on mobile */}
                <div className="space-y-2 hidden md:block">
                  <p className="text-xs text-muted-foreground">
                    Mobile preview (375px width, like iPhone SE — use the horizontal slider to choose which part shows):
                  </p>
                  <div
                    className="relative mx-auto w-full max-w-[375px] overflow-hidden rounded-md border border-border bg-muted/30"
                    style={{ aspectRatio: '375 / 566' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayImageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      style={{
                        objectPosition: `${position.x}% ${position.y}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-10 isolate w-full max-w-7xl mx-auto px-4 pt-24 sm:pt-28 pb-20 sm:pb-24 text-left">
            <h1
              className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 max-w-2xl [text-rendering:geometricPrecision] ${
                hasImage
                  ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45),0_0_1px_rgba(0,0,0,0.4)]'
                  : 'text-foreground'
              }`}
            >
              {displayTitle}
            </h1>
            <p
              className={`text-base sm:text-lg md:text-xl mb-8 sm:mb-12 max-w-2xl ${
                hasImage
                  ? 'text-white/90 [text-shadow:0_1px_1px_rgba(0,0,0,0.4),0_0_1px_rgba(0,0,0,0.3)]'
                  : 'text-muted-foreground'
              }`}
            >
              {displayTagline}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-start">
              <Link
                href="/projects"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-3 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity duration-200 shadow-lg w-fit"
              >
                View Our Work
                <ArrowRightIcon />
              </Link>
              <Link
                href="/contact"
                className={`inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-3 rounded-lg border-2 font-semibold transition-colors duration-200 shadow-lg w-fit ${
                  hasImage
                    ? 'border-white text-white bg-white/10 hover:bg-white/20'
                    : 'border-foreground text-foreground bg-background/20 hover:bg-background/30'
                }`}
              >
                Get in Touch
              </Link>
            </div>
            {isAdmin && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-lg"
                >
                  Edit hero
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

