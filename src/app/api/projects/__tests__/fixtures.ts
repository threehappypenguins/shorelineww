import type { ProjectApiResponse } from "@/types/project";

/**
 * Shared mock project data for API route tests (GET list, GET by id, etc.).
 * Use this instead of defining inline fixtures in each test file.
 */
export const mockProjects: ProjectApiResponse[] = [
  {
    id: "1",
    title: "Oak Floor Refinishing - Downtown Condo",
    description:
      "Complete sanding and refinishing of original oak hardwood floors in a downtown residential condo.",
    tags: ["Residential"],
    featured: true,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/v1738791001/shoreline/projects/oak-condo.jpg",
    imagePublicId: "shoreline/projects/oak-condo",
    displayOrder: 0,
    createdAt: "2026-02-06T10:15:00.000Z",
    updatedAt: "2026-02-06T10:15:00.000Z",
  },
  {
    id: "2",
    title: "Maple Hardwood Installation - Family Home",
    description:
      "Installed new maple hardwood flooring throughout the main floor of a detached family home.",
    tags: ["Residential"],
    featured: false,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/v1738791201/shoreline/projects/maple-install.jpg",
    imagePublicId: "shoreline/projects/maple-install",
    displayOrder: 1,
    createdAt: "2026-02-05T14:30:00.000Z",
    updatedAt: "2026-02-05T14:30:00.000Z",
  },
  {
    id: "3",
    title: "Staircase Sanding & Staining",
    description:
      "Refinished residential staircase including sanding, staining, and protective polyurethane coating.",
    tags: ["Residential"],
    featured: false,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/v1738791401/shoreline/projects/staircase.jpg",
    imagePublicId: "shoreline/projects/staircase",
    displayOrder: 2,
    createdAt: "2026-02-04T09:45:00.000Z",
    updatedAt: "2026-02-04T09:45:00.000Z",
  },
  {
    id: "4",
    title: "Commercial Showroom Flooring",
    description:
      "Installed durable engineered hardwood flooring in a high-traffic commercial showroom space.",
    tags: ["Commercial"],
    featured: false,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/v1738791601/shoreline/projects/showroom.jpg",
    imagePublicId: "shoreline/projects/showroom",
    displayOrder: 3,
    createdAt: "2026-02-03T16:20:00.000Z",
    updatedAt: "2026-02-03T16:20:00.000Z",
  },
  {
    id: "5",
    title: "Gymnasium Floor Restoration",
    description:
      "Full restoration and sealing of a school gymnasium hardwood sports floor.",
    tags: ["Institutional"],
    featured: false,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/v1738791801/shoreline/projects/gym-floor.jpg",
    imagePublicId: "shoreline/projects/gym-floor",
    displayOrder: 4,
    createdAt: "2026-02-02T11:10:00.000Z",
    updatedAt: "2026-02-02T11:10:00.000Z",
  },
];
