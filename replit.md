# Tourist Package Quotation System

## Project Overview
Dual-mode travel booking platform: public-facing customer quotation system + internal admin dashboard for quote/client/destination management.

## Key Features

### Public Customer Flow (No Authentication Required)
- **Landing Page** (`/`) - Browse destinations organized by category:
  - **Nacional**: 7 Colombian destinations (Guajira, San Andrés, Eje Cafetero, Medellín, Santander, Amazonas, Cartagena)
  - **Internacional**: Global destinations (Turkey, Dubai, Egypt, Greece, Thailand, Vietnam, Peru)
  - **Promociones**: Featured promotional packages
- **Multi-destination Selection**: Customers can select multiple destinations across categories
- **Date Selection**: Travel start and end date inputs
- **Quote Summary Page** (`/cotizacion`):
  - Review selected destinations and dates
  - Upload multiple flight images (outbound and return)
  - Send quote request via WhatsApp (+57 3146576500)
- **Business Model Messaging**: Emphasizes land portions guaranteed from 2 pax with Spanish-speaking guides

### Authentication & Admin Access
- Replit Auth integration for admin users
- Session-based authentication
- User profiles with email and name
- Admin dashboard accessible only when authenticated

### Destination Management (Admin)
- 31 pre-loaded destination templates
- Full CRUD operations for destinations
- Itinerary management by day
- Hotel tracking
- Inclusions/exclusions lists
- Image support via object storage
- Category management (Nacional/Internacional/Promociones)

### Quote Management (Admin)
- Create and edit quotes with multiple destinations
- Auto-populate itinerary from destination templates
- Flight image management
- Price and date management
- Quote status tracking (draft, sent, accepted, rejected)
- Search and filter capabilities
- PDF export with professional design

### Client Management (Admin)
- Client database with contact information
- Quote history per client
- Conversion tracking (accepted vs total quotes)
- Active/inactive status management

### PDF Export
- Professional quote PDFs with company branding
- Complete itinerary details
- Hotel information
- Inclusions and exclusions
- Pricing breakdown
- Terms and conditions

## Technical Stack
- **Frontend**: React, Wouter (routing), TanStack Query, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **Auth**: Replit Auth with session management
- **Storage**: Replit Object Storage for images
- **PDF Generation**: PDFKit

## Project Structure
- `/client` - React frontend application
- `/server` - Express backend with API routes
- `/shared` - Shared TypeScript types and schemas
- `/attached_assets` - Reference files for destination templates

## Database Schema
- `users` - User accounts from Replit Auth
- `clients` - Client contact database
- `destinations` - Destination templates
- `itinerary_days` - Day-by-day itinerary for each destination
- `hotels` - Hotels by destination
- `inclusions` - Services included per destination  
- `exclusions` - Services not included per destination
- `quotes` - Customer quotes
- `quote_destinations` - Many-to-many relationship between quotes and destinations

## Configuration

### Object Storage
- Default bucket configured for image uploads
- Public directory: `/public` (for destination images)
- Private directory: `/.private` (for customer flight images)

### Public API Endpoints
The following endpoints are publicly accessible (no authentication required):
- `GET /api/destinations?isActive=true` - Fetch active destinations for public catalog
- `POST /api/upload` - Upload flight images (customer flow)

**Security Considerations**:
- `/api/upload` is public to support unauthenticated customer quotations
- Current protections:
  - MIME type validation (images only: jpeg, jpg, png, gif, webp)
  - File extension validation
  - 10MB file size limit
  - Randomized filenames to prevent collisions
- **Recommended for production**:
  - Implement rate limiting per IP address
  - Add session-based upload quotas
  - Consider signed upload tokens with expiration
  - Set up automated cleanup of old uploaded files
  - Monitor storage usage and implement alerts

### Email Integration (TODO)
Email functionality is implemented but requires configuration. To enable email sending:

1. **Option A - Use Replit Integration:**
   - Set up Resend connector via Replit integrations
   - This handles authentication automatically

2. **Option B - Manual SMTP:**
   - Add these secrets in Replit:
     - `SMTP_HOST` - Your SMTP server host
     - `SMTP_PORT` - SMTP port (usually 587)
     - `SMTP_USER` - SMTP username
     - `SMTP_PASSWORD` - SMTP password
     - `SMTP_FROM_EMAIL` - From email address
     - `SMTP_FROM_NAME` - From name

The email service (`server/email.ts`) is ready and will work once credentials are configured.

## Routing Architecture
- **Unauthenticated Users**: See public landing page (`/`) and quote summary (`/cotizacion`)
- **Authenticated Users**: Access admin dashboard with quotes, clients, and destinations management
- State persistence: `sessionStorage` used for customer-selected destinations and dates

## Future Enhancements (Next Phase)
- [ ] Rate limiting for public upload endpoint (production security)
- [ ] Session-based upload quotas and token authentication
- [ ] Dynamic pricing with seasons and promotions
- [ ] Role-based access control (admin, senior agent, junior agent)
- [ ] Quote duplication and versioning
- [ ] Automated email notifications
- [ ] Advanced reporting and analytics
- [ ] Automated cleanup of old uploaded files

## Development
- Run `npm run dev` to start the development server
- Backend serves on port 5000
- Frontend is bundled via Vite
- Database migrations via `npm run db:push`

## Recent Changes

### October 30, 2025
- **Complete Destination Data Population**:
  - Populated all 30 international/national destinations with complete information from original planning documents
  - Processed 20 DOCX files (Turkey, Dubai, Egypt, Greece, Thailand, Vietnam) and 10 PDF files (Peru/Cusco)
  - Database now contains complete day-by-day itineraries for all destinations (3-10 days per destination)
  - Added detailed hotels, inclusions, and exclusions for each destination from source documents
  - Created processing scripts: `scripts/populate-destinations.ts` (DOCX) and `scripts/populate-cusco-pdfs.ts` (PDF)
  - Installed document parsing libraries: mammoth (DOCX), poppler_utils/pdftotext (PDF)
  - Fixed itinerary extraction for Thailand and Vietnam destinations to capture complete multi-day programs
  - **Total data populated**: 
    - Turkey (4 destinations): 8-10 day programs with complete itineraries
    - Dubai (5 destinations): 3-8 day programs with complete itineraries
    - Egypt (5 destinations): 4-10 day programs with complete itineraries
    - Greece (1 destination): 5 day program with complete itinerary
    - Peru/Cusco (10 destinations): 3-9 day programs with complete itineraries
    - Thailand (3 destinations): 6-8 day programs with complete itineraries
    - Vietnam (3 destinations): 4-6 day programs with complete itineraries

- **Enhanced PDF Generator with Visual First Page**:
  - Completely redesigned `publicPdfGenerator.ts` to include professional visual first page
  - **First page features**:
    - 3 destination images (1 large horizontal + 2 smaller side-by-side)
    - Adaptive title font sizing (16-24pt based on length) to prevent text overlap
    - Dynamic spacing calculation to prevent title/duration overlap
    - RNT number, trip title, duration, and creation date
    - Budget section with departure/return dates and minimum payment
    - Highlighted total price in yellow box ("DESDE: $X,XXX por Pareja")
    - Terms and conditions section
  - Created `server/destination-images.ts` helper to map destinations to stock images
  - Downloaded 28 additional high-quality stock images for all destination countries
  - **Itinerary Section Enhancement**:
    - Each destination now displays 3 appealing images below its title
    - Images positioned horizontally (3 across) with proper spacing
    - Images auto-selected from curated country-specific image sets
  - Image selection logic prioritizes unique countries, then allows duplicates to always show 3 images
  - **Subsequent pages** show complete destination data:
    - Detailed day-by-day itinerary with titles and full descriptions
    - Hotels section grouped by location
    - Actual inclusions and exclusions from database (with fallback to defaults)
  - Updated `/api/public/quote-pdf` endpoint to fetch complete data via storage methods

### October 29, 2025
- **Pricing and PDF Export**:
  - Added `basePrice` field to destinations schema (represents land portion only: hotels, tours, transport, activities, guides)
  - Populated all 31 destinations with realistic base prices ($800-$4500 USD based on destination/duration)
  - Downloaded and integrated 13 coherent stock images for destinations (Turkey, Dubai, Egypt, Greece, Thailand, Vietnam, Peru, Colombian destinations)
  - Updated destination cards to prominently display prices with orange accent color
  - Added "Vuelos + Asistencia + Comisión" input field in quote summary page
  - Implemented total price calculation (sum of land portions + flights/assistance/commission)
  - Created public PDF generator (`publicPdfGenerator.ts`) with professional design
  - Added `/api/public/quote-pdf` endpoint for quote PDF export
  - Integrated PDF download functionality in quote summary page
  - Updated WhatsApp message to include total price
  
- **Public Customer Flow**:
  - Created public landing page with destination browsing (Nacional/Internacional/Promociones)
  - Updated Colombian destinations to 7 options: Guajira, San Andrés, Eje Cafetero, Medellín, Santander, Amazonas, Cartagena
  - Implemented multi-destination selection with date inputs
  - Added quote summary page (`/cotizacion`) with flight image uploads
  - Updated WhatsApp integration to +57 3146576500
  - Made `/api/destinations` and `/api/upload` publicly accessible
  - Added strict security validations to upload endpoint (MIME, extension, size)
  
- **Previous Updates**:
  - Added client management system with conversion tracking
  - Implemented flight image upload functionality
  - Created professional PDF export system
  - Seeded database with 31 destination templates
  - Fixed security issue with userId derivation from session
