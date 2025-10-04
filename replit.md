# Tourist Package Quotation System

## Project Overview
Multiuser quote/cotization system for tourist packages with complete destination management, PDF export, and client tracking.

## Key Features

### Authentication & Users
- Replit Auth integration for multiuser access
- Session-based authentication
- User profiles with email and name

### Destination Management
- 31 pre-loaded destination templates (Turkey, Dubai, Egypt, Greece, Thailand, Vietnam, Peru/Cusco)
- Full CRUD operations for destinations
- Itinerary management by day
- Hotel tracking
- Inclusions/exclusions lists
- Image support via object storage
- Turkey always appears first in destination lists

### Quote Management
- Create and edit quotes with multiple destinations
- Auto-populate itinerary from destination templates
- Flight image upload using object storage
- Price and date management
- Quote status tracking (draft, sent, accepted, rejected)
- Search and filter capabilities
- PDF export with professional design

### Client Management
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
- Private directory: `/.private` (for flight images)

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

## Future Enhancements (Next Phase)
- [ ] Dynamic pricing with seasons and promotions
- [ ] Role-based access control (admin, senior agent, junior agent)
- [ ] Quote duplication and versioning
- [ ] Automated email notifications
- [ ] Advanced reporting and analytics

## Development
- Run `npm run dev` to start the development server
- Backend serves on port 5000
- Frontend is bundled via Vite
- Database migrations via `npm run db:push`

## Recent Changes
- Added client management system with conversion tracking
- Implemented flight image upload functionality
- Created professional PDF export system
- Seeded database with 31 destination templates
- Fixed security issue with userId derivation from session
