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
