# Tourist Package Quotation System

## Overview
This is an authenticated travel booking system designed for travel advisors to create, save, and manage client quotations. It enables the generation of professional, detailed PDF itineraries. Super administrators oversee client management, destination creation, and monitor advisor performance through comprehensive statistics. The system features native authentication with robust role-based access control for "Super Admin" and "Advisor" roles. The business vision is to streamline the quotation process for travel agencies, enhance client engagement with professional documentation, and provide management with oversight into sales activities.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes.

## System Architecture

### UI/UX Decisions
The system features a modern, responsive interface built with React, Wouter for routing, Tailwind CSS, and shadcn/ui. It includes a dedicated login page and role-based dashboard redirection. Key UI elements include professional PDF generation with company branding, interactive destination cards that expand on hover, and modern icons for clarity. Specific logic is implemented for Turkey destinations, affecting UI validations and messaging.

### Technical Implementations
The frontend is built with React, Wouter, and TanStack Query, styled with Tailwind CSS and shadcn/ui. The backend uses Express.js with TypeScript. PostgreSQL, hosted on Neon, serves as the database, managed by Drizzle ORM. Authentication is handled by Passport.js with Local Strategy, bcrypt for password hashing, and express-session with `connect-pg-simple` for PostgreSQL session storage. PDF generation is powered by PDFKit. The system automatically calculates trip dates and durations, implements specific business rules for Turkey destinations, and uses Replit Object Storage for persistent flight attachment images. Quote updates utilize database transactions for consistency.

**Image Storage Architecture**: Flight attachment images use persistent storage that automatically adapts to the environment:
- **Production**: Stores images in Replit Object Storage (`PRIVATE_OBJECT_DIR`) for permanent persistence across deployments and restarts
- **Development**: Stores images in `/home/runner/workspace/uploads` for persistence during local development
- The system automatically detects the environment and selects the appropriate storage location
- Images are served via authenticated endpoint `/api/images/:filename` which requires user authentication
- The PDF generator accesses images using the `getImagePath()` helper function that automatically resolves to the correct storage location
- This ensures images persist across server restarts in both development and production environments

### Feature Specifications
- **Super Admin**: Manages clients (global list), creates and manages destinations, views quote statistics across all advisors, and has full access to the system.
- **Advisor**: Creates, views, and edits personal quotations, associates quotes with clients, uploads flight images, and generates detailed PDFs. The quotation flow mirrors the original public system but is now protected by authentication.
- **Quotation System**: Allows browsing and selecting destinations, setting travel dates, viewing itineraries, and saving quotes associated with clients and the logged-in user.
- **Role-Based Access**: Public routes are accessible without authentication, while advisor and super admin routes require specific roles, enforced by `requireAuth` and `requireRole` middleware.

### System Design Choices
The project adopts a monorepo structure (`/client`, `/server`, `/shared`). Clients are global entities managed by super admins. Advisors manage their own quotes, while super admins have full visibility. PostgreSQL session storage ensures production readiness. Database entities use `varchar` with `gen_random_uuid()` for IDs, and unique constraints prevent duplicate destinations. The database auto-seeds on deployment, populating with essential data if empty.

## External Dependencies
- **PostgreSQL (Neon)**: Main relational database.
- **PDFKit**: JavaScript library for PDF generation.
- **Wouter**: Client-side routing for React.
- **TanStack Query**: Data fetching and caching for React.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components.
- **Express.js**: Backend web application framework.
- **TypeScript**: For type-safe backend development.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Passport.js**: Authentication middleware.
- **bcrypt**: Password hashing.
- **express-session**: Session management middleware.
- **connect-pg-simple**: PostgreSQL session store.
- **multer**: Middleware for handling `multipart/form-data` (file uploads).
- **Object Storage**: For storing flight attachment images.