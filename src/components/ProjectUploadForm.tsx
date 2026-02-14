'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ProjectImage {
  id: string;
  imageUrl: string;
  imagePublicId: string;
  sortOrder: number;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  category: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  images?: ProjectImage[];
}

interface ProjectUploadFormProps {
  onSuccess?: (project: Project) => void;
  editProject?: Project | null;
}

export default function ProjectUploadForm({ onSuccess, editProject }: ProjectUploadFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<{ url: string; publicId: string }[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Expand when editing a project
  useEffect(() => {
    if (editProject) {
      setIsExpanded(true);
    }
  }, [editProject]);

  // Pre-fill form when in edit mode; fetch full project to get all images
  useEffect(() => {
    if (!editProject) return;
    setTitle(editProject.title);
    setDescription(editProject.description || '');
    setCategory(editProject.category || '');
    const initialImages =
      editProject.images?.length
        ? editProject.images.map((i) => ({ url: i.imageUrl, publicId: i.imagePublicId }))
        : editProject.imageUrl && editProject.imagePublicId
          ? [{ url: editProject.imageUrl, publicId: editProject.imagePublicId }]
          : [];
    setExistingImages(initialImages);
    const thumbIdx =
      initialImages.length && editProject.imagePublicId
        ? initialImages.findIndex((i) => i.publicId === editProject.imagePublicId)
        : 0;
    setThumbnailIndex(thumbIdx >= 0 ? thumbIdx : 0);
    setRemoveImage(false);
    fetch(`/api/projects/${editProject.id}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((project: Project | null) => {
        if (project?.images?.length) {
          setExistingImages(project.images.map((i) => ({ url: i.imageUrl, publicId: i.imagePublicId })));
          const idx = project.images.findIndex((i) => i.imagePublicId === project.imagePublicId);
          setThumbnailIndex(idx >= 0 ? idx : 0);
        }
      })
      .catch(() => {});
  }, [editProject]);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
        return;
      }
      if (file.size > maxSize) {
        setError('File size exceeds 10MB limit');
        return;
      }
    }

    const newPreviews: string[] = new Array(files.length);
    let loaded = 0;
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string;
        loaded++;
        if (loaded === files.length) {
          setImagePreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    setImageFiles((prev) => [...prev, ...files]);
    setRemoveImage(false);
    setError(null);

    const fileInput = e.target;
    if (fileInput) fileInput.value = '';
  };

  const removeNewImageAt = (index: number) => {
    const newIndex = existingImages.length + index;
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (thumbnailIndex === newIndex) {
      setThumbnailIndex(0);
    } else if (thumbnailIndex > newIndex) {
      setThumbnailIndex((prev) => prev - 1);
    }
  };

  const removeExistingImageAt = (index: number) => {
    if (existingImages.length <= 1) return;
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    if (thumbnailIndex === index) {
      setThumbnailIndex(0);
    } else if (thumbnailIndex > index) {
      setThumbnailIndex((prev) => prev - 1);
    }
  };

  const handleRemoveAllImages = () => {
    const confirmed = window.confirm(
      'Are you sure you want to remove all images? This cannot be undone until you save.',
    );
    if (!confirmed) return;
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setThumbnailIndex(0);
    setRemoveImage(true);
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(false);

    const totalImages = existingImages.length + imagePreviews.length;

    // Require at least one image for create; for edit, block if removing all without adding new ones
    if (!editProject) {
      if (totalImages === 0) {
        setError('Please add at least one image.');
        return;
      }
    } else if (totalImages === 0) {
      setError('Please add at least one image. Cannot save with no images.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    const thumbIdx = totalImages > 0 ? Math.min(thumbnailIndex, totalImages - 1) : 0;

    // Edit project: keep FormData flow (server uploads to Cloudinary)
    if (editProject) {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('featured', 'false');
      imageFiles.forEach((file) => formData.append('image', file));
      if (removeImage) {
        formData.append('removeImage', 'true');
      } else {
        existingImages.forEach((img) => formData.append('keepPublicIds', img.publicId));
      }
      formData.append('thumbnailIndex', String(thumbIdx));

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
            const project = JSON.parse(xhr.responseText);
            setSuccess(true);
            setIsExpanded(false);
            setTitle('');
            setDescription('');
            setCategory('');
            setImageFiles([]);
            setImagePreviews([]);
            setExistingImages([]);
            setThumbnailIndex(0);
            setRemoveImage(false);
            const fileInput = document.getElementById('image') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            onSuccess?.(project);
          } catch {
            setError('Invalid response from server');
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            setError(data.error || 'Failed to save project');
          } catch {
            setError('Failed to save project');
          }
        }
        setLoading(false);
        setUploadProgress(0);
      });
      xhr.addEventListener('error', () => {
        setError('Network error');
        setLoading(false);
        setUploadProgress(0);
      });
      xhr.open('PATCH', `/api/projects/${editProject.id}`);
      xhr.withCredentials = true;
      xhr.send(formData);
      return;
    }

    // Create project: upload images to Cloudinary from client (real progress), then POST JSON
    if (imageFiles.length > 0) {
      try {
        const configRes = await fetch('/api/cloudinary-config', { credentials: 'include' });
        if (!configRes.ok) {
          const data = await configRes.json().catch(() => ({}));
          throw new Error(data.error || 'Upload not configured');
        }
        const { cloudName, apiKey, timestamp, signature, folder: cloudinaryFolder } = await configRes.json();
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

        const totalBytes = imageFiles.reduce((sum, f) => sum + f.size, 0);
        const loadedPerFile = new Array<number>(imageFiles.length).fill(0);
        const updateProgress = () => {
          const loaded = loadedPerFile.reduce((a, b) => a + b, 0);
          setUploadProgress(totalBytes ? Math.round((loaded / totalBytes) * 100) : 100);
        };

        const uploadedImages: { secureUrl: string; publicId: string }[] = [];
        const uploadOne = (file: File, index: number): Promise<void> =>
          new Promise((resolve, reject) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('api_key', apiKey);
            fd.append('timestamp', String(timestamp));
            fd.append('signature', signature);
            fd.append('folder', cloudinaryFolder);
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                loadedPerFile[index] = event.loaded;
                updateProgress();
              }
            });
            xhr.addEventListener('load', () => {
              loadedPerFile[index] = file.size;
              updateProgress();
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  uploadedImages.push({
                    secureUrl: result.secure_url,
                    publicId: result.public_id,
                  });
                  resolve();
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
          });

        await Promise.all(imageFiles.map((file, i) => uploadOne(file, i)));
        setUploadProgress(100);

        const projectRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title,
            description,
            category,
            featured: false,
            thumbnailIndex: thumbIdx,
            uploadedImages,
            cloudinaryFolder: typeof cloudinaryFolder === 'string' ? cloudinaryFolder : undefined,
          }),
        });

        if (!projectRes.ok) {
          const data = await projectRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to create project');
        }
        const project = await projectRes.json();
        setSuccess(true);
        setIsExpanded(false);
        onSuccess?.(project);
        setTitle('');
        setDescription('');
        setCategory('');
        setImageFiles([]);
        setImagePreviews([]);
        setExistingImages([]);
        setThumbnailIndex(0);
        setRemoveImage(false);
        const fileInput = document.getElementById('image') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setLoading(false);
        setUploadProgress(0);
      }
      return;
    }

  };

  if (!isExpanded) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-card rounded-xl shadow-md border border-border">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full py-4 px-6 rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted hover:border-primary transition-colors text-foreground font-medium"
        >
          + Upload New Project
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-card rounded-xl shadow-md border border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {editProject ? 'Edit Project' : 'Upload New Project'}
        </h2>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label="Collapse"
        >
          Collapse
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-accent/10 border border-accent/20 text-accent rounded-lg">
          Project {editProject ? 'updated' : 'created'} successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            placeholder="Enter project title"
          />
        </div>

        {/* Description Textarea */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            placeholder="Enter project description (optional)"
          />
        </div>

        {/* Category Input */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
            Category
          </label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            placeholder="e.g., Residential, Commercial, Landscape"
          />
        </div>

        {/* Image Upload Section - multiple images */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Project Images <span className="text-destructive">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Click an image to set it as the project thumbnail (shown in project cards).
          </p>

          {(existingImages.length > 0 && !removeImage) || imagePreviews.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {!removeImage &&
                  existingImages.map((img, index) => (
                    <div
                      key={`existing-${img.publicId}`}
                      className="relative w-32 h-32 rounded-lg overflow-hidden border-2 shrink-0 group"
                    >
                      <button
                        type="button"
                        onClick={() => setThumbnailIndex(index)}
                        title={thumbnailIndex === index ? 'Thumbnail (click another to change)' : 'Set as thumbnail'}
                        aria-label={thumbnailIndex === index ? 'Current thumbnail' : 'Set as thumbnail'}
                        className={`absolute inset-0 w-full h-full border-2 transition-colors ${
                          thumbnailIndex === index
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      />
                      <Image src={img.url} alt="" fill className="object-cover pointer-events-none" sizes="128px" />
                      {thumbnailIndex === index && (
                        <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-xs font-medium py-1 text-center pointer-events-none">
                          Thumbnail
                        </span>
                      )}
                      {existingImages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExistingImageAt(index)}
                          className="absolute top-2 right-2 flex items-center justify-center bg-destructive text-destructive-foreground w-8 h-8 rounded-full text-lg font-bold shadow-md hover:scale-110 transition-all z-10"
                          title="Remove this image"
                          aria-label="Remove this image"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                {imagePreviews.map((preview, index) => {
                  const idx = existingImages.length + index;
                  return (
                    <div key={`new-${idx}`} className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-border shrink-0 group">
                      <button
                        type="button"
                        onClick={() => setThumbnailIndex(idx)}
                        title={thumbnailIndex === idx ? 'Thumbnail (click another to change)' : 'Set as thumbnail'}
                        aria-label={thumbnailIndex === idx ? 'Current thumbnail' : 'Set as thumbnail'}
                        className={`absolute inset-0 w-full h-full border-2 transition-colors ${
                          thumbnailIndex === idx ? 'border-primary ring-2 ring-primary' : 'border-transparent'
                        }`}
                      />
                      <Image src={preview} alt="" fill className="object-cover pointer-events-none" sizes="128px" />
                      {thumbnailIndex === idx && (
                        <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-xs font-medium py-1 text-center pointer-events-none">
                          Thumbnail
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewImageAt(index)}
                        className="absolute top-2 right-2 flex items-center justify-center bg-destructive text-destructive-foreground w-8 h-8 rounded-full text-lg font-bold shadow-md hover:scale-110 transition-all z-10"
                        title="Remove this image"
                        aria-label="Remove this image"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="image"
                  onChange={handleImageChange}
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                />
                <label
                  htmlFor="image"
                  className="cursor-pointer inline-block px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
                >
                  Add more images
                </label>
                <button
                  type="button"
                  onClick={handleRemoveAllImages}
                  className="text-sm text-destructive hover:underline"
                >
                  Remove all images
                </button>
              </div>
            </div>
          ) : (
            <div className="border-dashed border-2 border-border bg-muted rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                id="image"
                onChange={handleImageChange}
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
              />
              <label
                htmlFor="image"
                className="cursor-pointer inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-accent transition-colors shadow"
              >
                Click to upload images
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                JPEG, PNG, WebP, or GIF (max 10MB each). You can select multiple files.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button / Upload progress */}
        <div className="space-y-2">
          {loading ? (
            <div className="relative w-full h-12 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
              <div
                className="absolute inset-y-0 left-0 bg-primary text-primary-foreground transition-[width] duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
              <span className="relative z-10 font-medium text-foreground">
                {uploadProgress > 0 && uploadProgress < 100
                  ? `${editProject ? 'Updating' : 'Uploading'}... ${uploadProgress}%`
                  : editProject ? 'Updating...' : 'Uploading...'}
              </span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!title || (existingImages.length + imagePreviews.length === 0)}
              className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {editProject ? 'Update Project' : 'Create Project'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
