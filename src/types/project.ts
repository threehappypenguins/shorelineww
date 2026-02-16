/**
 * @module types/project
 * @description Project type definitions for API responses.
 */

/**
 * Project data structure returned by API endpoints.
 * Represents a portfolio project with images, tags, and metadata.
 */
export interface ProjectApiResponse {
  /** Unique project identifier */
  id: string;
  /** Project title */
  title: string;
  /** Optional project description */
  description: string | null;
  /** Array of tag names associated with the project */
  tags?: string[];
  /** Whether the project is featured on the homepage */
  featured: boolean;
  /** URL of the primary/thumbnail image */
  imageUrl: string | null;
  /** Cloudinary public ID of the primary image */
  imagePublicId: string | null;
  /** All project images in sort order (for lightbox carousel). Omitted in some responses. */
  images?: { imageUrl: string }[];
  /** Order position for manual sorting within a date */
  displayOrder: number;
  /** ISO date string when the project was created */
  createdAt: string;
  /** ISO date string when the project was last updated */
  updatedAt: string;
  /** When true, date was set as month+year only (no day); display "Month Year" and show indicator */
  dateIsMonthOnly?: boolean | null;
}

