# Shoreline Woodworks Website

## Figma Prototype

- This is the [Figma Prototype](https://www.figma.com/make/ztIH2APn6V2Js8JUqiKMhY/Carpentry-Business-Website?t=nti6zxyZi9QUghD4-20&fullscreen=1).
- You can generally base the front end work off of. It might change as we go.
- If you want to view the mobile prototype, open developer tools and toggle on the "Toggle Device Toolbar" (`shift` + `ctrl` + `m`).

## Prerequisites
1. Make sure you have [Docker Desktop](https://docs.docker.com/get-started/introduction/get-docker-desktop/) installed (if you haven't installed it already).

## Forking and Cloning

2. Fork the [Upstream Repository](https://github.com/NSCC-ITC-Winter2026-WEBD5020-701-MCr/final-project-group3).
3. Clone your Origin Repository (the one that was forked):
```shell
git clone https://github.com/yourgithubuser/final-project-group3.git
```

4. Add `upstream` as a remote locally
```shell
git remote add upstream https://github.com/NSCC-ITC-Winter2026-WEBD5020-701-MCr/final-project-group3
```

## Setting Up Your Dev Environment

5. Open your local repository (the one you cloned) in VS Code on your device.
6. Install everything in `package.json`:
```shell
pnpm install
```

7. Run the docker compose file:
```shell
docker compose up -d
```

8. Check if the container is running:
```shell
docker ps
```

9. Try connecting with psql inside the container (type `exit` to exit the container):
```shell
docker exec -it shoreline_postgres psql -U postgres -d shoreline_dev
```

10. Copy `.env.example`:
- Windows:
  ```powershell
  copy .env.example .env
  ```

- MacOS/Linux:
  ```shell
  cp .env.example .env
  ```

11. Generate a 32-byte random secret encoded in base64:
- Windows
  ```powershell
  $b = New-Object byte[] 32; $rng=[System.Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($b); $rng.Dispose(); [Convert]::ToBase64String($b)
  ```

- MacOS/Linux:
  ```shell
  openssl rand -base64 32
  ```

12. In `.env`, paste your newly generated secret into `NEXTAUTH_SECRET`

13. Change `AUTHORIZED_ADMIN_EMAIL` to be your own Google account email.

14. You will also need `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `CLOUDINARY_URL`, which you will receive via Teams.

15. All is well if you can successfully run `pnpm dev`.

16. Don't forget to create a branch from `main` before you start your work.

17. **Note**: Before you push your code and open a PR, always remember to do `pnpm build` to make sure there are no build errors.

## Other helpful commands

## Important Info

### Git Command Details

After you make your commit and publish your branch, and make your PR, and once it's merged into upstream main, you will need to make sure that you update your origin and local repo:

#### One way of updating local and origin main:

```shell
git fetch upstream
```
- This downloads all the latest commits from the upstream repository (the original repo you forked) but does not change your local branches yet.
- It updates your remote-tracking branches like upstream/main.

```shell
git checkout main
```
- Switches your local branch to main (your fork’s main branch is usually tracking origin/main).

```shell
git merge upstream/main
```
- This merges the latest upstream main into your local main.
- After this step, your local main contains all the commits from upstream.

```shell
git push origin main
```
- Pushes your updated local main to your fork on GitHub (origin/main).
- Now your fork’s main is fully in sync with upstream.

#### The Full Stack course way of updating local and origin main:

```shell
git switch main
git pull upstream main
git push origin main
```

Do each of these commands after every PR merge.

**Be sure to create your new branch before you start work again.**
I strongly recommend deleting your old branch.

If you ever want to make sure that you're pushing to origin and not upstream, check with this:
```shell
git branch -vv
```

### Prisma

- Open Prisma Studio (database GUI)
  ```shell
  pnpm prisma studio
  ```

- Reset database
  ```shell
  pnpm prisma migrate reset
  ```

- Push schema changes without migration
  ```shell
  pnpm prisma db push
  ````

- [Prisma Query Docs](https://www.prisma.io/nextjs)

### Docker/PostgreSQL

- Start PostgreSQL
  ```shell
  docker-compose up -d
  ```

- Stop PostgreSQL
  ```shell
  docker-compose down
  ```

- View logs
  ```shell
  docker-compose logs -f postgres
  ```

### pnpm Commands

- Run dev server
  ```shell
  pnpm dev
  ```

- Build for production
  ```shell
  pnpm build
  ```

- Start production server
  ```shell
  pnpm start
  ```

- Lint code
  ```shell
  pnpm lint
  ```

### Cloudinary

[Cloudinary Docs](https://cloudinary.com/documentation/transformation_reference)

Cloudinary (Free Tier Limit) Details:
- Maximum image file size: 10 MB
- Maximum video file size: 100 MB
- Maximum online image manipulation size: 100 MB
- Maximum raw file size: 10 MB
- Maximum image megapixels: 25 MP
- Maximum total number of megapixels in all frames: 50 MP