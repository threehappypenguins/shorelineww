# Cloudinary orphaned folder cleanup

## What are orphaned folders?

When a user **starts** creating a project and chooses images, those images are uploaded to Cloudinary immediately (so thumbnails can show the converted files). If the user then **closes the page or navigates away without saving**, no project is created in the database—but the uploaded images remain in Cloudinary. Those assets live in a folder that is not linked to any project; we call such folders **orphaned**.

## Does the app delete them automatically?

**No.** Abandoned uploads are not deleted when the user leaves. They stay in Cloudinary until a cleanup job runs.

## Cleanup job

The app provides an admin-only API that finds and deletes orphaned project folders:

- **Endpoint:** `GET /api/cloudinary-cleanup`
- **Auth:** Admin session **or** `Authorization: Bearer <CRON_SECRET>` (for Vercel Cron and other schedulers).
- **Behavior:**
  - Loads all project `cloudinaryFolder` values from the database.
  - Lists image resources under the `projects/` prefix in Cloudinary.
  - For each folder that is **not** in the database and whose **oldest asset is older than 1 hour**, it deletes all assets in that folder and then deletes the folder.
- **Response:** `{ ok: true, deleted: string[], message: string }`

The 1-hour delay avoids deleting folders that are currently in use (e.g. the user is still filling the form).

## How to run it

1. **On-demand (browser):** While logged in as an admin, open  
   `https://your-domain.com/api/cloudinary-cleanup`  
   in the browser. The response shows how many folders were deleted.

2. **Vercel Cron (recommended):** The project includes a `vercel.json` cron that runs the cleanup daily at 6:00 AM UTC. Set a `CRON_SECRET` environment variable (at least 16 characters) in your Vercel project settings. Vercel sends this as `Authorization: Bearer <CRON_SECRET>`; the API accepts it instead of an admin session. Deploy to production for cron to activate.

3. **External scheduler:** Call `GET /api/cloudinary-cleanup` on a schedule with `Authorization: Bearer <CRON_SECRET>` in the request headers.

## Implementation details

- Cleanup logic lives in `src/lib/cloudinary.ts` (`findOrphanedProjectFolders`, `cleanupOrphanedProjectFolders`).
- The API route is `src/app/api/cloudinary-cleanup/route.ts`.
- Vercel Cron config is in `vercel.json` (daily at 6:00 AM UTC).
- Folder age is determined by the oldest `created_at` among assets in that folder; the threshold is configurable via `ORPHANED_FOLDER_AGE_MS` (default 1 hour).

**Set Secret**
- Example: in terminal, run `openssl rand -hex 32`

**Test Locally**
- Make sure that .env has `CRON_SECRET` and in terminal (with dev server running, and sub `<CRON_SECRET>` with actual one):
  ```bash
  curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cloudinary-cleanup
  ```
