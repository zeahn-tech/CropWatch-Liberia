# CropWatch Liberia Deployment Guide

## Prerequisites

Ensure all required environment variables described in `.env.example` are set in your deployment environment. 
`JWT_SECRET` is strictly required and the app will refuse to start without it.

## 1. Database & Seed Data

CropWatch Liberia uses a local SQLite database by default (`data/cropwatch.db`). The schema and seed data (such as user accounts and initial crops) are created **automatically on first run** by the application server. You do not need to run manual migration or seeding scripts.

## 2. Deployment Target

Because CropWatch Liberia is a full-stack application with a Node.js Express backend (handling authentication, AI integration, and database operations), it **cannot be deployed to static file hosts like GitHub Pages**. 

You must deploy to a platform that supports Node.js applications, such as:
- Render
- Fly.io
- Railway
- Google Cloud Run

### General Deployment Steps (Node.js Platform)

1. Provision a web service on your host of choice.
2. Set the Environment Variables (from `.env.example`).
3. Set the build command: `npm install && npm run build`
4. Set the start command: `npm start`

The build command will bundle the React frontend into static files and compile the Express server. The start command will boot the Express server, which serves both the API and the compiled frontend static files from the `dist/` folder.
