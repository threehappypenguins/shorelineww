# Requirements

## Functional Requirements

### Public Site

- View homepage with hero section
- View About section
- View Services section
- View contact information
- Browse albums
- View photos inside albums
- Responsive design for mobile/desktop

### Admin Dashboard

- Google OAuth login (restricted to single account)
- Create/edit/delete albums
- Upload photos to Cloudinary
- Reorder photos via drag-and-drop
- Edit site text (title, hero, about, services, contact info)
- Changes update immediately

### Backend

- Store metadata in PostgreSQL
- Store images in Cloudinary
- API routes for CRUD operations
- Secure role-based access

## Non-Functional Requirements

- Fast load times (<2s)
- Mobile responsive
- Secure authentication
- Automated tests
- CI/CD pipeline
- High uptime (no DB pausing)

## Environment Configuration

### Development

- **Database**: PostgreSQL running in Docker container
- **Image Storage**: Cloudinary
- **Frontend**: Local development server
- **Backend**: Local development server

### Production

- **Database**: Neon (serverless PostgreSQL)
- **Image Storage**: Cloudinary
- **Frontend**: Deployed on Vercel
- **Backend**: Deployed on Vercel (serverless functions)
- **Hosting**: Free tiers only