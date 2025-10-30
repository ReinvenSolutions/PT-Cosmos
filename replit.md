# Tourist Package Quotation System

## Overview
This is a public-facing travel quotation system where customers can browse travel packages, select destinations, and request personalized quotes. The system allows customers to view destination details, select multiple packages, specify travel dates, and generate professional PDF quotations or share via WhatsApp. The business model emphasizes guaranteed land portions for groups of two or more with Spanish-speaking guides.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes.

## System Architecture
The application is a pure public-facing system with no authentication or administrative features.

### UI/UX Decisions
- Public-facing interface for browsing destinations and requesting quotes
- No login or authentication required
- Design incorporates Tailwind CSS and shadcn/ui for a modern, responsive interface
- Date selection uses shadcn DatePicker with locale support
- Professional PDF generation for quotes with company branding, visual itinerary, and detailed breakdown
- Emphasis on clear informational banners and toast notifications for user feedback

### Technical Implementations
- **Frontend**: React for the UI, Wouter for routing, TanStack Query for data fetching, Tailwind CSS and shadcn/ui for styling
- **Backend**: Express.js with TypeScript for robust API development
- **Database**: PostgreSQL hosted on Neon, managed with Drizzle ORM
- **PDF Generation**: PDFKit is used for creating customized PDF documents
- **State Management**: sessionStorage is used for persisting customer-selected destinations and dates in the public flow
- **Automatic Calculations**: The system automatically calculates trip end dates and total durations based on selected destinations
- **Turkey Destination Logic**: Specific business rules are implemented for Turkey destinations, requiring Tuesday departures and adding an extra day for travel, with corresponding UI validations and messaging

### Feature Specifications
- **Public Customer Flow**:
    - Landing page displays destinations by category (Nacional, Internacional)
    - Multi-destination selection and date input
    - Quote summary page for reviewing selections and generating quotes
    - PDF generation with complete destination details (day-by-day itinerary, hotels, inclusions, exclusions)
    - WhatsApp sharing for quote requests

- **PDF Export**: Generates comprehensive, branded PDFs with:
    - Cover page with 3 destination images
    - Visual itinerary overview with numbered cities and night counts
    - Detailed day-by-day itinerary
    - Hotel information
    - Inclusions and exclusions
    - Final total price (without breakdown)

### System Design Choices
- Monorepo structure with `/client`, `/server`, and `/shared` directories
- Read-only data model - destinations are managed directly in the database
- Public API endpoints for destination browsing and PDF generation
- Unique constraint on (name, country) to prevent duplicate destinations

## Database Schema
The system uses the following tables:
- **destinations**: Travel packages with pricing, duration, categories, and settings
- **itinerary_days**: Day-by-day itinerary for each destination
- **hotels**: Hotel information for each destination
- **inclusions**: What's included in each package
- **exclusions**: What's not included in each package

All destination-related tables use CASCADE deletes to maintain referential integrity.

## External Dependencies
- **PostgreSQL (Neon)**: Relational database for storing destination data
- **PDFKit**: JavaScript library for PDF document generation
- **Wouter**: Client-side routing for React
- **TanStack Query**: Data fetching and caching library for React
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable UI components
- **Express.js**: Backend web application framework
- **TypeScript**: Superset of JavaScript for type safety
- **Drizzle ORM**: TypeScript ORM for PostgreSQL

## Managing Destinations
Destinations are managed directly in the database using SQL or database management tools. The schema includes:
- Unique constraint on (name, country) to prevent duplicates
- Categories: "nacional" (only Colombia) or "internacional" (all other countries)
- Special flags like `requiresTuesday` for Turkey destinations
- Display order for controlling listing sequence

**Current database contains 38 destinations:**
- **Nacional (7)**: Colombia only
- **Internacional (31)**: Dubái (5), Egipto (5), Grecia (1), Perú (10), Tailandia (3), Turquía (4), Vietnam (3)
- All destinations have prices defined
- All names are in Spanish

## Recent Changes (October 30, 2025)
- **Removed all administrative features**: Eliminated the admin dashboard, authentication system, client management, and quote management
- **Simplified to public-only system**: Now focuses exclusively on the public customer experience
- **Removed database seed functionality**: Destinations are managed directly in the database
- **Eliminated authentication**: No login system or user management
- **Cleaned up codebase**: Removed unused admin pages, routes, and database tables (users, clients, quotes, sessions)
- **Removed 28 English-named duplicate destinations**: Cleaned database by removing Dubai, Egypt, Greece, Peru, Thailand, Turkey duplicates (without prices)
- **Finalized categorization**: Colombia (7 destinations) as "nacional", all others (31) as "internacional"
