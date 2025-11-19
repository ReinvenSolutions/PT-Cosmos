# Tourist Package Quotation System

## Overview
This is an authenticated travel booking system designed for travel advisors to create, save, and manage client quotations, and generate professional, detailed PDF itineraries. Super administrators manage clients, create destinations, and monitor advisor performance. The system aims to streamline the quotation process for travel agencies, enhance client engagement with professional documentation, and provide management oversight into sales activities. It features native authentication with robust role-based access control for "Super Admin" and "Advisor" roles.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes.

## System Architecture

### UI/UX Decisions
The system features a modern, responsive interface built with React, Wouter for routing, Tailwind CSS, and shadcn/ui. It includes a dedicated login page, role-based dashboard redirection, and professional PDF generation with company branding. Interactive destination cards expand on hover, and modern icons enhance clarity. Specific logic is implemented for Turkey destinations, affecting UI validations and messaging. Single-destination quotes display three distinct images on the PDF cover page.

### Technical Implementations
The frontend uses React, Wouter, and TanStack Query, styled with Tailwind CSS and shadcn/ui. The backend is built with Express.js and TypeScript. PostgreSQL, hosted on Neon, is the database, managed by Drizzle ORM. Authentication relies on Passport.js with Local Strategy, bcrypt for password hashing, and express-session with `connect-pg-simple` for PostgreSQL session storage. PDF generation is powered by PDFKit. The system calculates trip dates/durations, applies specific business rules for Turkey destinations (e.g., holiday validation, upgrade options), and uses Replit Object Storage (or local filesystem for development) for persistent flight attachment images. Quote updates use database transactions. Monetary values are formatted as USD without decimals, and dates are DD/MM/AAAA.

### Feature Specifications
- **Role-Based Access**: Public routes are accessible without authentication, while advisor and super admin routes require specific roles.
- **Super Admin**: Manages clients, creates/manages destinations, and views global quote statistics.
- **Advisor**: Creates, views, and edits personal quotations, associates quotes with clients, uploads flight images, customizes baggage options, and generates detailed PDFs.
- **Quotation System**: Allows destination selection, date setting, itinerary viewing, and saving quotes linked to clients.
    - **Passenger Selection**: Supports 1-10 passengers, dynamically calculating total land portion price and adjusting PDF text (e.g., "por Persona", "por Pareja", "por Grupo de X").
    - **Flight Sections**: Includes flight upload and baggage customization for outbound/return flights. If no flight images or baggage are selected, PDFs generate as land-only; otherwise, flight pages are included with dynamic baggage text.
    - **Conditional PDF Content**:
        - All PDFs include a "ASISTENCIA MEDICA PARA TU VIAJE" page with medical assistance imagery.
        - For Turkey destinations, this page also includes "TOUR OPCIONALES" tables, Combo packages, and a banking fee notice.
        - "Turquía Esencial" plans specifically include a consolidated page with comprehensive policies/conditions and 2026 Turkish national/religious holidays, impacting booking availability (dates disabled in picker with toast notifications).
        - "Turquía Esencial" offers three exclusive upgrade packages that adjust the total cost.
    - **PDF Branding**: Includes a diagonal "OFERTA ESPECIAL" banner, a blue airplane logo (in header and page footers), and an "RNT No.240799" for regulatory compliance.
    - **Destination Catalog**: Only `isActive=true` destinations are displayed. Currently active include 7 Colombian destinations and "Turquía Esencial" (10 days, 9 nights, $710 USD land portion). The "Turquía Esencial" plan has specific image sets, a detailed itinerary, inclusions/exclusions, hotel options, a route map, and a tooltip.
    - **Turkey Hotel Options**: The Turquía Esencial plan features 12 premium hotels distributed across 4 locations:
        - **Estambul**: Ramada Plaza Tekstilkent 5*, Sundance Hotel Istanbul 5*, DoubleTree by Hilton Istanbul Topkapi 5*
        - **Capadocia**: Ramada Cappadocia 5*, Avrasya Hotel 5*, Crowne Plaza Nevsehir 5*
        - **Pamukkale**: Pamukale Kaya Thermal Hotel 5*, Pam Thermal Hotel 5*, Richmond Thermal 5*
        - **Kusadasi/Esmirna**: Radisson Hotel İzmir Aliağa 5*, Hampton By Hilton Aliağa 4*, Faustina Hotel 4* (with upgrade option to Hotel Le Bleu subject to availability)

### System Design Choices
The project utilizes a monorepo structure (`/client`, `/server`, `/shared`). Clients are global entities managed by super admins. Advisors manage their own quotes. PostgreSQL session storage ensures production readiness. Database entities use `varchar` with `gen_random_uuid()` for IDs and have unique constraints. The database auto-seeds on deployment.

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