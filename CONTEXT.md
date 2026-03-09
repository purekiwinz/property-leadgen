# Property Leadgen Project Context

## Overview
This project is a property lead generation application.

## Goals
- Facilitate the generation and management of leads for properties on the Hibiscus Coast.
- Provide a high-converting landing page with real-time property data and agent details.
- Automate lead notifications and track marketing performance across Meta and LinkedIn.

## Tech Stack
- **Frontend:** Next.js 15+ (App Router), TypeScript
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Database Webhooks)
- **Email:** SendGrid API

## Architecture & Conventions
- **Components:** Modular React components in `src/components`.
- **Styling:** Utility-first Tailwind v4.
- **Form Pattern:** Multi-step interactive "quiz" style for high conversion.
- **Admin:** Protected admin route (`/admin`) for lead and content management.

## Current State
- **Backend Integration:** Full Supabase integration for lead storage (`appraisal_leads`), site settings, and recent sales.
- **Automation:** Edge Function (`send-appraisal-email`) triggered by database webhooks to send lead notifications via SendGrid.
- **Admin Dashboard:** Fully functional admin panel at `/admin` to view leads and manage the 3 property listings.
- **Marketing Integration:** 
  - Meta (Facebook) Pixel and LinkedIn Insight Tag implemented globally.
  - Conversion tracking (Lead event) integrated into the form.
  - Meta Lead Ads Webhook (`meta-webhook`) deployed to automatically sync native Facebook leads into the database.
- **Legal Compliance:** NZ Privacy Act 2020 compliant Privacy Policy and Terms of Service pages created.
- **Dynamic Content:** Landing page content (listings and agent details) is now fully dynamic and manageable via the database.

## AI Assistant Instructions
This file serves as a shared memory and context guide for all LLMs working on this project. 
- **Read First:** Always review this file to understand the project's current state and conventions before making significant changes.
- **Keep Updated:** When making architectural decisions, adding new core dependencies, or establishing new patterns, update this file to reflect the changes.
- **Supabase Note:** The `SENDGRID_API_KEY` environment variable must be set in the Supabase Edge Functions settings (from global memory).