# Admin Portal - Architecture Overview

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Bundler**: Vite 5
- **Styling**: Tailwind CSS 3 (pure CSS utility classes)
- **Routing**: React Router v6
- **HTTP Client**: Native Fetch API
- **Auth**: Token-based (Bearer token in localStorage)
- **Build Output**: Static HTML/CSS/JS files

## Application Structure

### Core Architecture

```
App (Router Setup with AuthProvider)
├── LoginPage (unauthenticated route)
└── Protected Routes
    ├── DashboardPage (with Layout)
    ├── HistoryPage (with Layout)
    ├── VocabularyPage (with Layout)
    └── SettingsPage (with Layout)
```

### State Management

1. **Authentication State** (`AuthContext.tsx`)
   - Token storage (localStorage + in-memory)
   - Login/logout functions
   - Token validation
   - Loading and error states

2. **Component State** (Local state with hooks)
   - Page-level data (stats, history, vocabulary)
   - Form data
   - UI states (loading, modals, selections)

3. **No External State Library** - Uses React Context + hooks for simplicity

### API Client (`lib/api.ts`)

- Centralized API communication
- Automatic token injection in Authorization header
- JSON parsing and error handling
- Typed response interfaces
- Methods for all endpoints

### Component Hierarchy

**Layout Components**:
- `Layout` - Main container with sidebar and top bar
- `Sidebar` - Navigation menu with dynamic active state
- Server health indicators in top bar

**Page Components** (all use Layout):
- `LoginPage` - Standalone centered card
- `DashboardPage` - Stat cards + charts
- `HistoryPage` - Search + paginated table + detail modal
- `VocabularyPage` - CRUD table + add/edit modal
- `SettingsPage` - Settings form

## Data Flow

### Authentication Flow

```
User enters password
       ↓
LoginPage calls api.verify(password)
       ↓
API returns token
       ↓
AuthContext stores in localStorage
       ↓
Redirect to /dashboard
```

### Protected Route Flow

```
Route check (ProtectedRoute component)
       ↓
useAuth() → isAuthenticated?
       ↓
Yes → Render page component
No  → Redirect to /login
```

### Data Fetching Pattern

```
useEffect(() => {
  fetchData() // api call
  setData()
}, [dependencies])
```

All pages follow this pattern for loading data on mount/dependency changes.

## Key Features Implementation

### Authentication
- `AuthContext` provides `useAuth()` hook
- Token persists across page reloads
- Automatic redirect to login on token loss
- Logout clears token from storage

### Dashboard
- Fetches stats overview and daily usage in parallel
- Renders simple SVG bar charts (no recharts dependency)
- Auto-refreshes every 60 seconds
- Server health status from `/api/health`

### History
- Full-text search via `api.getHistory(page, limit, search)`
- Pagination with 20 items per page
- Modal for viewing full record details
- Delete with confirmation dialog
- Timestamps formatted in user's locale

### Vocabulary
- CRUD operations: create, read, update, delete
- Toggle enabled/disabled status
- Import/export as JSON
- Add modal for new entries
- Edit modal for existing entries
- Editable textarea for alternatives (newline-separated)

### Settings
- Dynamic form generation from API response
- Track unsaved changes
- Visual indicator for modified fields
- Save and reset functionality

## UI Design System

### Colors
- **Primary**: Indigo (#4f46e5) for actions and highlights
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)
- **Background**: White and slate shades
- **Text**: Gray-900 for dark, gray-600 for secondary

### Components
- **Buttons**: Tailwind classes for state (hover, disabled, active)
- **Forms**: Consistent input styling with focus ring
- **Tables**: Striped rows, hover effects
- **Cards**: White background, shadow, rounded corners
- **Modals**: Fixed overlay with centered content

### Language
All UI labels are in Traditional Chinese (繁體中文):
- 儀表板 = Dashboard
- 轉錄紀錄 = Transcription History
- 詞彙庫 = Vocabulary Library
- 設定 = Settings
- 登出 = Logout

## Build Process

### Development
```bash
npm run dev
→ Vite dev server on :5173
→ Hot module reload
→ API proxy to :3100
→ Source maps for debugging
```

### Production Build
```bash
npm run build
→ TypeScript compilation
→ React JSX transform
→ Tailwind CSS extraction
→ Vite bundling and minification
→ Output to dist/
```

### Output
- `dist/index.html` - Entry point
- `dist/assets/` - Bundled JS, CSS, fonts
- All files have content-based hashes for caching
- Ready to serve via HTTP with caching headers

## Performance Considerations

1. **Bundle Size**
   - No heavy dependencies (no UI component library)
   - React + Router + Tailwind only
   - Small gzipped bundle size

2. **Lazy Loading**
   - Component-level code splitting can be added if needed
   - Currently all components load eagerly (appropriate for admin panel)

3. **Data Fetching**
   - Dashboard refreshes every 60 seconds
   - History loads on demand with pagination
   - Vocabulary loads on mount
   - Settings load on mount

4. **Caching**
   - localStorage for auth token
   - Browser cache for static assets (via hashing)
   - API responses not cached (always fresh)

## Error Handling

1. **API Errors**
   - Try-catch blocks around all API calls
   - User-friendly error messages
   - Error states in UI

2. **Auth Errors**
   - Invalid password shows error
   - Expired token redirects to login
   - Network errors are handled gracefully

3. **Form Validation**
   - Required field checks before submit
   - Confirmation dialogs for destructive actions
   - Disabled states during operations

## Browser Compatibility

- Modern browsers with ES2020 support
- React 18+ requirements (Chrome 51+, Firefox 54+, Safari 10+)
- LocalStorage support required
- Fetch API support required

## Security

1. **Token Storage**
   - Tokens stored in localStorage
   - Sent via Authorization header (not in URL)
   - Cleared on logout

2. **CORS**
   - Vite dev server proxies API requests
   - Production server serves from same origin
   - No CORS issues by design

3. **Input Validation**
   - User inputs are used in HTTP requests
   - Server-side validation is primary security layer
   - XSS prevention via React's automatic escaping

## Deployment

1. Build locally: `npm run build`
2. Copy `dist/` contents to server
3. Server serves from `/admin/` path
4. API calls proxied to `/api/` on same server
5. Configure caching headers on static files

No environment variables or configuration files needed after build - everything is configured at build time.
