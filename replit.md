# Tourist Package Quotation System

## Overview
This is an authenticated travel booking system designed for travel advisors to create, save, and manage client quotations, and generate professional, detailed PDF itineraries. Super administrators manage clients, create destinations, and monitor advisor performance. The system aims to streamline the quotation process for travel agencies, enhance client engagement with professional documentation, and provide management oversight into sales activities. It features native authentication with robust role-based access control for "Super Admin" and "Advisor" roles.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes.

## System Architecture

### UI/UX Decisions
The system features a modern, responsive interface built with React, Wouter for routing, Tailwind CSS, and shadcn/ui. It includes a dedicated login page, role-based dashboard redirection, and professional PDF generation with company branding. Interactive destination cards expand on hover, and modern icons enhance clarity. Specific logic is implemented for Turkey destinations, affecting UI validations and messaging. Single-destination quotes display three distinct images on the PDF cover page.

### Technical Implementations
The frontend uses React, Wouter, and TanStack Query, styled with Tailwind CSS and shadcn/ui. The backend is built with Express.js and TypeScript. PostgreSQL, hosted on Neon, is the database, managed by Drizzle ORM. Authentication relies on Passport.js with Local Strategy, bcrypt for password hashing, and express-session with `connect-pg-simple` for PostgreSQL session storage. PDF generation is powered by PDFKit with special character handling (Turkish "İ" replaced with "I" for Helvetica font compatibility) and performance optimizations including parallel image preloading, in-memory caching, and async file operations for 3-5x faster generation. Hotels in PDFs are sorted by star rating (5* before 4*) then alphabetically. The system calculates trip dates/durations, applies specific business rules for Turkey destinations (e.g., holiday validation, upgrade options), and uses Replit Object Storage (or local filesystem for development) for persistent flight attachment images. Quote updates use database transactions. Monetary values are formatted as USD without decimals, and dates are DD/MM/AAAA.

**Flight Page Layout System**: Flight sections (outbound/return) use intelligent layout logic ensuring every image appears with its section header ("VUELO IDA"/"VUELO REGRESO") and baggage information. When multiple images are uploaded, each automatically re-renders complete context (title + baggage text) when moved to a new page. The last image on each flight section maximizes to available space while reserving room for terms and conditions on the same page. All images respect document margins (pageHeight: 842px, bottom margin: 50px) to prevent clipping, with intermediate images scaling to fit within available space (max ~612px) and final images using dynamic calculation based on terms height. Flight terms exclude "Tarifa Light" details and display simplified non-refundable policy, transfer restrictions, and check-in requirements immediately following the last flight image.

### Feature Specifications
- **Role-Based Access**: Public routes are accessible without authentication, while advisor and super admin routes require specific roles.
- **Super Admin**: Manages clients, creates/manages destinations, and views global quote statistics.
- **Advisor**: Creates, views, and edits personal quotations, associates quotes with clients, uploads flight images, customizes baggage options, and generates detailed PDFs.
- **Quotation System**: Allows destination selection, date setting, itinerary viewing, and saving quotes linked to clients.
    - **Passenger Pricing**: System displays pricing for a single passenger only. The passenger selector has been removed from the quotation page, and all pricing calculations default to 1 passenger. PDF first page always displays "por Persona" pricing.
    - **Flight Sections**: Includes flight upload and baggage customization for outbound/return flights. If no flight images or baggage are selected, PDFs generate as land-only; otherwise, flight pages are included with dynamic baggage text.
    - **Conditional PDF Content**:
        - All PDFs include a "ASISTENCIA MEDICA PARA TU VIAJE" page with medical assistance imagery.
        - For Turkey destinations, this page also includes "TOUR OPCIONALES" tables, Combo packages, and a banking fee notice.
        - "Turquía Esencial" plans specifically include a consolidated page with comprehensive policies/conditions and 2026 Turkish national/religious holidays, impacting booking availability (dates disabled in picker with toast notifications).
        - "Turquía Esencial" offers three exclusive upgrade packages ($500, $770, $1,100 USD) that adjust the total cost. The upgrade section displays immediately after the detailed itinerary in a blue highlighted box, showing either available upgrade options or the selected upgrade details.
    - **PDF Branding**: Includes a diagonal "OFERTA ESPECIAL" banner, a blue airplane logo (in header and page footers), and an "RNT No.240799" for regulatory compliance.
    - **Destination Catalog**: Only `isActive=true` destinations are displayed. Currently active include 7 Colombian destinations and "Turquía Esencial" (10 days, 9 nights, $710 USD land portion). The "Turquía Esencial" plan has specific image sets, a detailed itinerary, inclusions/exclusions, hotel options, a route map, and a tooltip.
    - **Turkey Hotel Options**: The Turquía Esencial plan features 12 premium hotels distributed across 4 locations:
        - **Estambul**: Ramada Plaza Tekstilkent 5*, Sundance Hotel Istanbul 5*, DoubleTree by Hilton Istanbul Topkapi 5*
        - **Capadocia**: Ramada Cappadocia 5*, Avrasya Hotel 5*, Crowne Plaza Nevsehir 5*
        - **Pamukkale**: Pamukale Kaya Thermal Hotel 5*, Pam Thermal Hotel 5*, Richmond Thermal 5*
        - **Kusadasi/Esmirna**: Radisson Hotel İzmir Aliaga 5*, Hampton By Hilton Aliaga 4*, Faustina Hotel 4* (with upgrade option to Hotel Le Bleu subject to availability)

### System Design Choices
The project utilizes a monorepo structure (`/client`, `/server`, `/shared`). Clients are global entities managed by super admins. Advisors manage their own quotes. PostgreSQL session storage ensures production readiness. Database entities use `varchar` with `gen_random_uuid()` for IDs and have unique constraints.

**Automatic Deployment & Data Synchronization**: The system features a fully automated deployment pipeline that propagates ALL changes (code + database schema + canonical data) to production with a single click. Canonical data is defined in `shared/seed-data.ts` as the "source of truth" for destinations, itineraries, hotels, inclusions, and exclusions. During deployment, `server/sync-canonical-data.ts` automatically executes to:
1. Deactivate all existing destinations
2. Upsert the active "Turquía Esencial" destination
3. Replace all related data (itineraries, hotels, inclusions, exclusions)

This idempotent synchronization ensures production always reflects the latest data changes without manual SQL intervention. The system detects Replit deployments via `REPLIT_DEPLOYMENT=1` and production environments via `NODE_ENV=production`, automatically triggering synchronization in both cases. Manual synchronization requires explicit authorization via `ALLOW_PROD_DATA_SYNC=true` for safety. See `DEPLOYMENT.md` for complete documentation.

## External Dependencies
- **PostgreSQL (Neon)**: Relational database.
- **PDFKit**: PDF generation library.
- **Wouter**: Client-side routing.
- **TanStack Query**: Data fetching and caching.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: UI components.
- **Express.js**: Backend framework.
- **TypeScript**: Backend language.
- **Drizzle ORM**: PostgreSQL ORM.
- **Passport.js**: Authentication middleware.
- **bcrypt**: Password hashing.
- **express-session**: Session management.
- **connect-pg-simple**: PostgreSQL session store.
- **multer**: File upload handling.
- **Object Storage**: Persistent storage for flight attachment images (Replit Object Storage in production).