# Tourist Package Quotation System

## Overview
This project is a dual-mode travel booking platform comprising a public-facing customer quotation system and an internal admin dashboard. Its purpose is to streamline the creation, management, and delivery of travel package quotations. The system allows customers to browse destinations, select multiple options, specify travel dates, upload flight details, and request a personalized quote via WhatsApp. For administrators, it provides comprehensive tools for managing destinations, itineraries, client information, and quotes, including generating professional PDF exports. The business model emphasizes guaranteed land portions for groups of two or more with Spanish-speaking guides.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. Do not make changes to the folder `Z` and the file `Y`.

## System Architecture
The application is built with a clear separation between frontend and backend.

### UI/UX Decisions
- Public-facing interface for browsing destinations and requesting quotes without authentication.
- Admin dashboard is accessible only to authenticated users.
- Design incorporates Tailwind CSS and shadcn/ui for a modern, responsive interface.
- Date selection uses `shadcn DatePicker` with locale support.
- Professional PDF generation for quotes with company branding, visual itinerary, and detailed breakdown.
- Emphasis on clear informational banners and toast notifications for user feedback.

### Technical Implementations
- **Frontend**: React for the UI, Wouter for routing, TanStack Query for data fetching, Tailwind CSS and shadcn/ui for styling.
- **Backend**: Express.js with TypeScript for robust API development.
- **Database**: PostgreSQL hosted on Neon, managed with Drizzle ORM.
- **Authentication**: Native authentication system with bcrypt password hashing and express-session for session management. Users have email/password login.
- **Storage**: Replit Object Storage for handling image uploads (destination images and customer flight images).
- **PDF Generation**: PDFKit is used for creating customized PDF documents.
- **Routing**: Admin dashboard is the primary interface requiring authentication. Unauthenticated users are redirected to login.
- **User Management**: Users table with support for regular users and administrators (isAdmin flag).
- **Per-User Quote History**: All quotes are linked to user accounts for tracking and management.
- **Automatic Calculations**: The system automatically calculates trip end dates and total durations based on selected destinations.
- **"Turkey" Destination Logic**: Specific business rules are implemented for Turkey destinations, requiring Tuesday departures and adding an extra day for travel, with corresponding UI validations and messaging.

### Feature Specifications
- **Public Customer Flow**:
    - Landing page displays destinations by category (Nacional, Internacional, Promociones).
    - Multi-destination selection and date input.
    - Quote summary page for reviewing selections, uploading flight images, and sending requests via WhatsApp.
- **Admin Features**:
    - **Authentication**: Replit Auth integration.
    - **Destination Management**: CRUD operations for 31 pre-loaded destination templates, including itinerary management (day-by-day), hotels, inclusions/exclusions, images, and categories.
    - **Quote Management**: Create/edit quotes, auto-populate itineraries, manage flight images, set prices/dates, track status, search/filter, and export to PDF.
    - **Client Management**: Database for client contact info, quote history, and conversion tracking.
- **PDF Export**: Generates comprehensive, branded PDFs with cover page, visual itinerary overview, detailed day-by-day itinerary, hotel information, inclusions, exclusions, and pricing breakdown.

### System Design Choices
- Monorepo structure with `/client`, `/server`, and `/shared` directories.
- Object storage configured with public and private directories for different image types.
- Public API endpoints are secured with MIME type, file extension, and size validations.

## External Dependencies
- **PostgreSQL (Neon)**: Relational database for storing all application data.
- **Replit Auth**: Authentication service for user management.
- **Replit Object Storage**: Cloud storage for image assets.
- **PDFKit**: JavaScript library for PDF document generation.
- **Wouter**: Client-side routing for React.
- **TanStack Query**: Data fetching and caching library for React.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components.
- **Express.js**: Backend web application framework.
- **TypeScript**: Superset of JavaScript for type safety.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Resend (Optional)**: Email service integration (via Replit integration or manual SMTP).

## Production Database Seeding
When deploying to production, the database is initially empty. To populate it with all destinations data:

### Option 1: Admin Tools UI (Recommended)
1. Deploy your application to production
2. Log in as an admin user
3. Navigate to **Admin Tools** from the sidebar
4. Click the **"Ejecutar Seed de Base de Datos"** button
5. Confirm the action
6. Wait for completion (creates 31 destinations with complete data)

### Option 2: API Endpoint
Send a POST request to `/api/admin/seed-database` (requires authentication):
```bash
curl -X POST https://your-production-url/api/admin/seed-database \
  -H "Cookie: your-session-cookie"
```

### What Gets Created:
- 31 destinations across 7 countries (Turkey, Dubai, Egypt, Greece, Thailand, Vietnam, Peru)
- Complete day-by-day itineraries for each destination
- Hotel information for each destination
- Inclusions and exclusions lists
- Turkey destinations configured with `requiresTuesday=true`



## Credenciales de Administrador de Prueba

Para acceder al sistema en desarrollo, usa las siguientes credenciales:

- **Email**: `admin@example.com`
- **Password**: `admin123` (debe cambiarse en producción)

Nota: Esta contraseña no cumple con los nuevos requisitos de seguridad (8 caracteres, 1 mayúscula, 1 número). Para crear usuarios en producción, usa el formulario de registro que aplica estas validaciones.

