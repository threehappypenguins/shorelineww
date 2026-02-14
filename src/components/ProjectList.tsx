'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Project {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  tags?: string[];
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectListProps {
  onEdit?: (project: Project) => void;
}

export default function ProjectList({ onEdit }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects', { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this project?');
    
    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      // Remove project from local state
      setProjects(projects.filter(project => project.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
        <p className="font-medium">Error loading projects</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="p-12 bg-muted border border-border rounded-xl text-center">
        <p className="text-muted-foreground text-lg">No projects yet. Create your first one!</p>
      </div>
    );
  }

  // Projects grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, projectIndex) => (
        <div
          key={project.id}
          className="bg-card border border-border rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
        >
          {/* Project Image */}
          {project.imageUrl && (
            <div className="relative h-48 bg-muted">
              <Image
                src={project.imageUrl}
                alt={project.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
                priority={projectIndex < 3}
              />
              
              {/* Featured Badge */}
              {project.featured && (
                <span className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-medium shadow">
                  Featured
                </span>
              )}
            </div>
          )}

          {/* Project Details */}
          <div className="p-4">
            {/* Title */}
            <h4 className="font-bold text-lg mb-2 text-foreground">{project.title}</h4>

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-2 py-0.5 rounded bg-primary/15 text-primary text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {project.description && (
              <p className="text-sm text-foreground/80 mb-3 line-clamp-3">
                {project.description}
              </p>
            )}

            {/* Date */}
            <div className="text-xs text-muted-foreground mb-4">
              {formatDate(project.createdAt)}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(project)}
                className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-accent transition-colors shadow"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(project.id)}
                disabled={deletingId === project.id}
                className="flex-1 bg-destructive text-destructive-foreground py-2 px-4 rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow"
              >
                {deletingId === project.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
