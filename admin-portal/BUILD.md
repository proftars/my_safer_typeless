# Admin Portal - Build & Development Guide

## Overview

This is a React + Tailwind CSS admin portal for the My Safer Typeless project. It's a single-page application (SPA) that connects to the Express server API at `http://localhost:3100`.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn

## Installation

```bash
cd admin-portal
npm install
```

## Development Server

Start the development server with hot reload:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` by default. The dev server proxies `/api` requests to `http://localhost:3100`.

## Type Checking

Run TypeScript type checking without building:

```bash
npm run type-check
```

## Production Build

Build the application for production:

```bash
npm run build
```

Output files will be in the `dist/` directory. These are static files that the Express server serves at `/admin/`.

## Preview Build

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
admin-portal/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Router setup
│   ├── index.css             # Tailwind directives
│   ├── components/
│   │   ├── Layout.tsx        # Main layout with sidebar
│   │   └── Sidebar.tsx       # Navigation sidebar
│   ├── contexts/
│   │   └── AuthContext.tsx   # Authentication state management
│   ├── lib/
│   │   └── api.ts            # API client with auth
│   └── pages/
│       ├── LoginPage.tsx     # Login form
│       ├── DashboardPage.tsx # Stats & charts
│       ├── HistoryPage.tsx   # Transcription history
│       ├── VocabularyPage.tsx # Vocabulary CRUD
│       └── SettingsPage.tsx  # Settings management
├── index.html                # HTML entry point
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## Key Features

### Authentication
- Token-based authentication via `/api/auth/verify` endpoint
- Token stored in localStorage
- Automatic token validation on app load
- Logout clears token and redirects to login

### Pages

**Login** - Password-protected entry point

**Dashboard**
- Statistics: today, this week, this month, all-time transcription counts
- Average latency display
- 30-day usage charts (count and latency)

**History**
- Search transcriptions by text
- Paginated list with 20 items per page
- View details including raw & refined text, engine, latency metrics
- Delete individual records

**Vocabulary**
- Add/edit/delete vocabulary entries
- Enable/disable entries
- Import/export vocabulary as JSON
- Track term, alternatives, and categories

**Settings**
- View and edit system settings
- Changes save via API

### UI Design

- **Layout**: Sidebar navigation + main content area
- **Colors**: Indigo/blue primary, with semantic status colors (green/red/yellow)
- **Language**: Traditional Chinese (繁體中文) UI labels
- **Styling**: Pure Tailwind CSS (no component library dependencies)
- **Responsive**: Works on desktop and tablet screens

## API Integration

The app communicates with the server via the API client at `src/lib/api.ts`. All requests:
- Include `Authorization: Bearer TOKEN` header when authenticated
- Use `/api` prefix (configured in Vite proxy)
- Handle errors gracefully with user-friendly messages

### Key Endpoints Used

- `/api/auth/verify` - Login
- `/api/auth/status` - Check password status
- `/api/health` - Server health & services status
- `/api/transcribe` - Submit audio for transcription
- `/api/history` - List/search transcriptions
- `/api/vocabulary` - CRUD vocabulary entries
- `/api/settings` - Get/update settings
- `/api/stats/overview` - Get statistics overview
- `/api/stats/daily` - Get daily usage data

## Building for Production

1. Install dependencies: `npm install`
2. Build the project: `npm run build`
3. Output files are in `dist/`
4. Server serves these files at `/admin/` route

The Express server should be configured to serve the `admin-portal/dist/` directory at the `/admin/` path.

## Environment

Development:
- Dev server: http://localhost:5173
- API proxy: http://localhost:3100

Production:
- Served from `/admin/` path
- API calls to `/api/` on same origin as server

## Troubleshooting

**CORS errors**: Check that Vite's proxy config in `vite.config.ts` is correctly pointing to your API server (default: http://localhost:3100)

**Authentication fails**: Verify the server has a password set using `/api/auth/status`

**API calls fail**: Check browser console for network errors and server logs

**Styling issues**: Ensure PostCSS and Tailwind are building correctly. Run `npm run build` to test production build.

## Build Output

The built application creates optimized static files:
- HTML, CSS, and JavaScript bundles
- Assets hashed for caching
- Minified and optimized for production
- Ready to serve from any static file server

See the `dist/` directory after building for the complete production build.
