# Tourist Package Quotation System

## Overview
This is an authenticated travel booking system where advisors create and save quotations (associated with clients from a global list), generate professional PDFs with complete destination details, and track their saved quotes. Super admins manage clients, create destinations, and view statistics across all advisors. The system uses native authentication with role-based access control (Super Admin and Advisor roles).

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes.

## System Architecture
The application is a fully authenticated system with role-based access control using native authentication (Passport Local Strategy with bcrypt password hashing).

### Authentication & Authorization
- **Authentication**: Native implementation using Passport Local Strategy
- **Password Security**: bcrypt for password hashing (10 salt rounds)
- **Session Management**: express-session with PostgreSQL session store (connect-pg-simple)
- **Role-Based Access Control**: Two roles defined - "super_admin" and "advisor"
- **Middleware**: requireAuth and requireRole middleware for protecting routes
- **API Protection**: All protected routes enforce role-based access with 401/403 responses

### UI/UX Decisions
- Login page for authentication
- Role-based dashboard redirection (admin → /admin, advisor → /advisor)
- Admin dashboard: manage clients, view statistics, create destinations
- Advisor dashboard: create quotes, view own quotes, generate PDFs
- Design incorporates Tailwind CSS and shadcn/ui for a modern, responsive interface
- Professional PDF generation for quotes with company branding, visual itinerary, and detailed breakdown

### Technical Implementations
- **Frontend**: React for the UI, Wouter for routing, TanStack Query for data fetching, Tailwind CSS and shadcn/ui for styling
- **Backend**: Express.js with TypeScript for robust API development
- **Database**: PostgreSQL hosted on Neon, managed with Drizzle ORM
- **Authentication**: Passport.js with Local Strategy, bcrypt, express-session
- **Session Storage**: PostgreSQL session store using connect-pg-simple
- **PDF Generation**: PDFKit is used for creating customized PDF documents
- **API Security**: All admin/advisor routes protected with requireRole middleware
- **Automatic Calculations**: The system automatically calculates trip end dates and total durations based on selected destinations
- **Turkey Destination Logic**: Specific business rules are implemented for Turkey destinations, requiring Tuesday departures and adding an extra day for travel, with corresponding UI validations and messaging

### Feature Specifications

#### Super Admin Features
- Create and manage clients (global list, no duplicates)
- Create and manage destinations
- View quote statistics (quotes per advisor)
- View all quotes across all advisors
- Full access to the quotation system

#### Advisor Features
- **Quotation Flow** (exactly same as public system):
  - Browse and select destinations
  - Select travel dates
  - View itinerary and pricing
  - **NEW**: Save quotation (associate with client)
  - Export to PDF
  - Share via WhatsApp
- View saved quotations
- Track quote history

#### Quotation System
The quotation flow is **identical to the original public system** with one addition:
- Public pages (home.tsx, quote-summary.tsx) are now protected by authentication
- Users must be logged in as advisor or super admin to access
- A "Guardar Cotización" button allows saving the quote to the database
  - Opens dialog to select client and confirm details
  - Associates quote with the logged-in user
  - Redirects to advisor dashboard after saving

### Role-Based Route Protection
- **Public Routes** (Unauthenticated):
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/me
  - GET /api/destinations
  - GET /api/destinations/:id
  - POST /api/public/quote-pdf

- **Protected Frontend Routes** (super_admin or advisor):
  - / (home.tsx - destination selection)
  - /cotizacion (quote-summary.tsx - quote review and save)

- **Advisor Routes** (requireRole("advisor")):
  - /advisor (advisor dashboard)
  - POST /api/quotes (create quote)
  - GET /api/quotes (list own quotes)
  - GET /api/quotes/:id (view own quote)
  - GET /api/quotes/:id/pdf (download quote PDF)

- **Super Admin Routes** (requireRole("super_admin")):
  - /admin (admin dashboard)
  - POST /api/admin/clients (create client)
  - PUT /api/admin/destinations/:id (update destination)
  - GET /api/admin/quotes (view all quotes)
  - GET /api/admin/quotes/stats (quote statistics)

- **Shared Routes** (requireRoles(["super_admin", "advisor"])):
  - GET /api/admin/clients (list clients for quote creation)

### System Design Choices
- Monorepo structure with `/client`, `/server`, and `/shared` directories
- Clients are global entities managed exclusively by super admins (no duplicates)
- Advisors can only view and create their own quotes
- Super admins have full visibility across all quotes and statistics
- PostgreSQL session store for production-ready session management
- Unique constraint on (name, country) to prevent duplicate destinations
- All IDs use varchar with gen_random_uuid() for consistency

## Database Schema

### Authentication Tables
- **users**: User accounts with role-based access
  - id (varchar, UUID)
  - username (varchar, unique)
  - passwordHash (varchar, bcrypt)
  - role (varchar, "super_admin" | "advisor")
  - createdAt (timestamp)

- **session**: Express session storage (connect-pg-simple)
  - sid (varchar, primary key)
  - sess (json)
  - expire (timestamp)

### Business Tables
- **clients**: Global client list managed by super admins
  - id (varchar, UUID)
  - name (varchar)
  - email (varchar, unique)
  - phone (varchar, nullable)
  - createdAt (timestamp)

- **quotes**: Saved quotations created by advisors
  - id (varchar, UUID)
  - clientId (varchar, FK to clients)
  - userId (varchar, FK to users)
  - totalPrice (decimal)
  - status (varchar, default "draft")
  - createdAt (timestamp)

- **quote_destinations**: Many-to-many relationship between quotes and destinations
  - id (varchar, UUID)
  - quoteId (varchar, FK to quotes)
  - destinationId (varchar, FK to destinations)
  - startDate (date)
  - passengers (integer)
  - createdAt (timestamp)

### Destination Tables (unchanged)
- **destinations**: Travel packages with pricing, duration, categories, and settings
- **itinerary_days**: Day-by-day itinerary for each destination
- **hotels**: Hotel information for each destination
- **inclusions**: What's included in each package
- **exclusions**: What's not included in each package

All tables use CASCADE deletes to maintain referential integrity.

## External Dependencies
- **PostgreSQL (Neon)**: Relational database for storing all data
- **PDFKit**: JavaScript library for PDF document generation
- **Wouter**: Client-side routing for React
- **TanStack Query**: Data fetching and caching library for React
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable UI components
- **Express.js**: Backend web application framework
- **TypeScript**: Superset of JavaScript for type safety
- **Drizzle ORM**: TypeScript ORM for PostgreSQL
- **Passport.js**: Authentication middleware for Node.js
- **bcrypt**: Password hashing library
- **express-session**: Session middleware for Express
- **connect-pg-simple**: PostgreSQL session store for express-session

## Initial Setup
**Super Admin User**: A super admin user has been created for initial access:
- Username: `admin`
- Password: `admin123`
- Role: `super_admin`

⚠️ **Important**: Change this password after first login in production.

## Managing Data

### Clients
Clients are managed exclusively by super admins through the admin dashboard. They are global entities with unique email addresses.

### Destinations
Destinations can be managed by super admins through the admin dashboard or directly in the database using SQL.

**Current database contains 38 destinations:**
- **Nacional (7)**: Colombia only
- **Internacional (31)**: Dubái (5), Egipto (5), Grecia (1), Perú (10), Tailandia (3), Turquía (4), Vietnam (3)
- All destinations have prices defined
- All names are in Spanish

### Quotes
Quotes are created by advisors and stored in the database. Each quote is associated with:
- The advisor who created it (userId)
- A client from the global list (clientId)
- Multiple destinations with start dates and passenger counts
- Total price and status

## Recent Changes (October 30, 2025)

### Sistema de Seed Automático de Base de Datos
- **Implementado seed automático**: La base de datos de producción se puebla automáticamente en el deploy
- **Verificación inteligente**: Solo importa datos si la base de datos está vacía (no sobrescribe)
- **Archivo**: `server/seed.ts` - Script que verifica estado y puebla datos
- **Integración**: `server/index.ts` - Ejecuta seed automáticamente en producción (NODE_ENV=production)
- **Datos incluidos**: 38 destinos completos, usuarios base (admin, advisor1), clientes de ejemplo
- **Archivo SQL**: `export-production-data.sql` - 1,240 líneas con todos los datos de desarrollo
- **Logs detallados**: Indica si la BD está vacía o ya poblada al arrancar en producción
- **Comportamiento**: Igual que otros proyectos de Replit - deploy actualiza schema + datos automáticamente

### Anteriores (antes del seed automático)
- **Implemented native authentication**: Passport Local Strategy with bcrypt password hashing
- **Added role-based access control**: Super Admin and Advisor roles with distinct permissions
- **Created authentication layer**: Login, logout, session management with PostgreSQL
- **Built admin dashboard**: Client management, destination management, quote statistics
- **Built advisor dashboard**: Quote listing, view saved quotes
- **Implemented protected API routes**: All admin/advisor routes secured with requireRole middleware
- **Added database tables**: users, clients, quotes, quote_destinations, session
- **Created initial super admin**: Username "admin", password "admin123"
- **Created test advisor user**: Username "advisor1", password "advisor123"
- **Security fixes**: Applied requireRole middleware to all protected routes
- **Frontend routing**: AuthProvider, protected routes, role-based dashboard redirection
- **Preserved original quotation flow**: Public pages (home.tsx, quote-summary.tsx) kept identical
  - Only added authentication protection
  - Added "Guardar Cotización" button in quote-summary.tsx
  - Quotes can be saved and associated with clients and users
- **Added sidebar navigation**: Implemented AppSidebar component with role-based menu items
  - Sidebar appears on home.tsx, quote-summary.tsx, advisor-dashboard.tsx, and quote-detail.tsx
  - Uses Shadcn sidebar primitives with SidebarProvider
  - SPA navigation using wouter Link component (no page reloads)
  - Collapsible sidebar with toggle button
  - Logout button in sidebar footer
- **Login flow improvements**: Login now redirects to home (/) instead of dashboard
- **Quote detail page**: Created dedicated page (/advisor/quotes/:id) to view full quotation details
  - Shows complete client information
  - Displays all selected destinations with dates and passengers
  - Includes PDF download functionality
  - Professional layout with sidebar navigation
- **Backend bug fixes**: Fixed date conversion issue when saving quotes (string dates now properly converted to Date objects)
