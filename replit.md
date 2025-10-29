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

## Recent Changes (October 29, 2025)
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
