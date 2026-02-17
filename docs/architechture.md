# Architecture

## Tech Stack

### Frontend

- Next.js (App Router)
- TypeScript
- TailwindCSS
- dnd-kit (drag-and-drop)

- Backend
- Next.js API Routes
- Prisma ORM
- Neon PostgreSQL

### Auth

- Auth.js with Google OAuth
- Single-user whitelist

### Storage

- Cloudinary (image hosting)

### Deployment

- Vercel

### Testing

- Vitest
- React Testing Library
- GitHub Actions CI

## System Flow

### Public Users
```shell
Users → Next.js → API Routes → Prisma → Neon DB
                             → Cloudinary
```

### Admin
```shell
Login → Auth.js → Admin Panel → CRUD → DB/Cloudinary
```

## Database Design

### users
- `id: String` (cuid, Primary Key)  
- `name: String?`  
- `email: String` (unique)  
- `emailVerified: DateTime?`  
- `image: String?`  
- `isAdmin: Boolean` (default false)  
- `accounts: Account[]` (relations for Auth.js)  
- `sessions: Session[]` (relations for Auth.js)  
- `createdAt: DateTime` (default now)  
- `updatedAt: DateTime` (auto-updated)

### accounts (for Auth.js)
- `id: String` (Primary Key)  
- `userId: String` (FK → users.id)  
- `type: String`  
- `provider: String`  
- `providerAccountId: String`  
- `refresh_token: String?`  
- `access_token: String?`  
- `expires_at: Int?`  
- `token_type: String?`  
- `scope: String?`  
- `id_token: String?`  
- `session_state: String?`  
- Unique constraint: `[provider, providerAccountId]`

### sessions (for Auth.js)
- `id: String` (Primary Key)  
- `sessionToken: String` (unique)  
- `userId: String` (FK → users.id)  
- `expires: DateTime`  

### verificationTokens (for Auth.js)
- `identifier: String`  
- `token: String` (unique)  
- `expires: DateTime`  
- Unique constraint: `[identifier, token]`

### projects (Photos / Portfolio Items / Albums)
- `id: String` (Primary Key)  
- `title: String`  
- `description: String?`  
- `imageUrl: String?`  
- `imagePublicId: String?` (Cloudinary ID for deletion)  
- `category: String?`  
- `featured: Boolean` (default false)  
- `createdAt: DateTime` (default now)  
- `updatedAt: DateTime` (auto-updated)

## Development Environment
```shell
  DevBrowser[Browser localhost:3000]
  NextDev[Next.js Dev Server]
  PrismaDev[Prisma ORM]
  Docker[(Postgres\nDocker Desktop)]
  CloudDev[(Cloudinary /dev)]

  DevBrowser --> NextDev
  NextDev --> PrismaDev
  PrismaDev --> Docker
  NextDev --> CloudDev
```

## Production Environment
```shell
  Visitor[Users on Internet]
  Vercel[Vercel Deployment]
  PrismaProd[Prisma ORM]
  Neon[(Neon PostgreSQL)]
  CloudProd[(Cloudinary /prod)]
  Google[Google OAuth]

  Visitor --> Vercel
  Vercel --> PrismaProd
  PrismaProd --> Neon
  Vercel --> CloudProd
  Vercel --> Google
```

## Flows

### Public Visitor
```shell
Browser → Next.js → fetch albums/photos → DB
                           ↓
                        Cloudinary images
```

### Admin Upload
```shell
Admin → Login (Google OAuth)
     → Upload image → Cloudinary
     → Save metadata → Prisma → DB
```

### Content Editing
```shell
Admin edits site text
→ saved in site_settings table
→ Next.js reads from DB dynamically
→ updates instantly
```

![Diagram](https://i.imgur.com/37UFzCi.png)