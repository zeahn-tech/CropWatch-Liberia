# CropWatch Liberia Deployment Guide

## Prerequisites
Ensure all required environment variables described in `.env.example` are set in your deployment environment.

## 1. Database Migrations
Run the database migrations to set up the necessary tables and schema.
```bash
npm run db:push
# or if using direct SQL scripts, execute the setup SQL files against your database
```

## 2. Seed Data
To populate the database with initial plant varieties and seed data for production:
```bash
npm run db:seed
```
If you are using the predefined `.db` sqlite file or `data/cropwatch_db.json` script, ensure they are in the appropriate directory on your production server.

## 3. Starting the application
Build and start the application:
```bash
npm run build
npm start
```

## 4. Deploying to GitHub Pages

If you are seeing a **blank white screen** or **404 errors** for `manifest.webmanifest` on GitHub Pages, it is because you deployed the raw source code instead of the compiled build. React + Vite apps cannot run directly from source.

We have added a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys your app.

**To fix your GitHub Pages deployment:**
1. Commit and push all latest changes (including the new `.github/workflows/deploy.yml` file) to your `main` branch.
2. Go to your repository on GitHub.
3. Navigate to **Settings** > **Pages**.
4. Under **Build and deployment**, change the **Source** from "Deploy from a branch" to **"GitHub Actions"**.
5. GitHub will now automatically build your `dist/` folder and deploy it correctly. The blank screen and 404 errors will be resolved.
