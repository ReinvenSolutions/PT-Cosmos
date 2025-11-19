# Tourist Package Quotation System

## Overview
This is an authenticated travel booking system designed for travel advisors to create, save, and manage client quotations. It enables the generation of professional, detailed PDF itineraries. Super administrators oversee client management, destination creation, and monitor advisor performance through comprehensive statistics. The system features native authentication with robust role-based access control for "Super Admin" and "Advisor" roles. The business vision is to streamline the quotation process for travel agencies, enhance client engagement with professional documentation, and provide management with oversight into sales activities.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes.

## System Architecture

### UI/UX Decisions
The system features a modern, responsive interface built with React, Wouter for routing, Tailwind CSS, and shadcn/ui. It includes a dedicated login page and role-based dashboard redirection. Key UI elements include professional PDF generation with company branding, interactive destination cards that expand on hover, and modern icons for clarity. Specific logic is implemented for Turkey destinations, affecting UI validations and messaging. When a single destination is selected for a quote, the PDF cover page displays 3 different images of that destination instead of repeating the same image.

### Technical Implementations
The frontend is built with React, Wouter, and TanStack Query, styled with Tailwind CSS and shadcn/ui. The backend uses Express.js with TypeScript. PostgreSQL, hosted on Neon, serves as the database, managed by Drizzle ORM. Authentication is handled by Passport.js with Local Strategy, bcrypt for password hashing, and express-session with `connect-pg-simple` for PostgreSQL session storage. PDF generation is powered by PDFKit. The system automatically calculates trip dates and durations, implements specific business rules for Turkey destinations, and uses Replit Object Storage for persistent flight attachment images. Quote updates utilize database transactions for consistency.

**Image Storage Architecture**: Flight attachment images use persistent storage that automatically adapts to the environment:
- **Production**: Stores images in Replit Object Storage using native `@replit/object-storage` package for permanent persistence
  - Uses `ObjectStorageService` in `server/objectStorage.ts` with Replit's native Client
  - Images are uploaded to `uploads/` directory with UUID-based filenames
  - Automatically detects bucket via `DEFAULT_OBJECT_STORAGE_BUCKET_ID` environment variable
- **Development**: Stores images in `/home/runner/workspace/uploads` for persistence during local development
- The system automatically detects the environment and selects the appropriate storage location on startup
- Images are served via authenticated endpoint `/api/images/:filename` which requires user authentication
- The PDF generator accesses images using the async `getImagePathForPDF()` helper function:
  - In production: Downloads images from Object Storage to `/tmp/pdf-images/` for PDF generation
  - In development: Returns direct filesystem path to uploaded images
- The upload flow uses `handleFileUpload()` in `server/upload.ts` which validates file types, sizes, and security
- All monetary values are formatted with `formatUSD()` utility (thousands separators, no decimals)
- All dates are formatted with `formatDate()` utility in DD/MM/AAAA format
- This ensures images persist across server restarts in both development and production environments

### Feature Specifications
- **Super Admin**: Manages clients (global list), creates and manages destinations, views quote statistics across all advisors, and has full access to the system.
- **Advisor**: Creates, views, and edits personal quotations, associates quotes with clients, uploads flight images, customizes baggage options, and generates detailed PDFs. The quotation flow mirrors the original public system but is now protected by authentication.
- **Quotation System**: Allows browsing and selecting destinations, setting travel dates, viewing itineraries, and saving quotes associated with clients and the logged-in user.
  - **Passenger Selection**: Users can select 1-10 passengers in `/cotizacion`. The system multiplies the land portion price by the number of passengers to calculate the total. Price display shows both per-person and total amounts.
  - **Dynamic PDF Text**: PDF quotations display context-aware passenger text:
    - 1 passenger: "por Persona"
    - 2 passengers: "por Pareja" + adds "2X1" suffix to destination title
    - 3+ passengers: "por Grupo de X" (where X is the passenger count)
  - **Flight Sections**: Both public (`/cotizacion`) and advisor edit pages include flight upload sections with customizable baggage options
  - **Baggage Customization**: Users can select "Equipaje de cabina 10kg" and "Equipaje de bodega 23kg" independently for outbound and return flights (Personal 8kg is always included)
  - **Conditional PDF Generation**: If no flight images are uploaded AND no baggage checkboxes are selected, the PDF generates as land-only (no flight pages). If any flight data exists (images OR baggage selections), flight pages are included in the PDF with dynamic baggage text
  - **Medical Assistance Page**: All PDFs automatically include a final page with title "ASISTENCIA MEDICA PARA TU VIAJE" and medical assistance coverage details (image stored in `server/assets/medical-assistance.png`)
  - **Turkey Optional Activities**: When a quotation includes Turkey/Turquía destinations, a dedicated page with professionally formatted tables displays optional tour packages:
    - **Individual Tours Table**: Lists 14 optional activities with prices (Balloon rides, Bosphorus tour, Turkish night shows, ski, jeep safari, lunch packages, e-SIM, museum entries)
    - **Combo Packages**: Two pre-packaged deals with discounted pricing:
      - Combo 1 (969 USD): Includes balloon ride, Bosphorus lunch tour, classic tour with lunch, Turkish night in Cappadocia, and jeep safari
      - Combo 2 (606 USD): Includes balloon ride, Turkish night in Cappadocia, and jeep safari
    - **Banking Fee Notice**: Prominently displays "Fee bancario no incluido, 2.5% sobre el total" in red text
    - Detection is based on destination country or name containing "turqu" or "turkey" (case-insensitive)
    - Tables use professional styling with blue headers (#1e40af), light blue rows (#e0e7ff), and proper alignment for readability
  - **Turquía Esencial Policies & Holidays Pages**: For "Turquía Esencial" packages specifically, two additional pages are included after the optional tours:
    - **Policies & Conditions Page**: Comprehensive terms and conditions covering cancellations, tips, services, baggage, hotels, excursions, WiFi, balloon rides, and transfers
    - **2026 Holidays Page**: Table of Turkish national and religious holidays with impact on services and bazaar closures
    - These pages only appear for the "Turquía Esencial" plan, not for other Turkey destinations
    - Content is formatted with clear section headings and justified text for professional appearance
  - **PDF Branding Elements**: 
    - **Special Offer Banner**: Diagonal golden "OFERTA ESPECIAL" banner positioned in the top-right corner of the first page only (image stored in `server/assets/special-offer-banner.png`)
    - **Plane Logo**: Blue airplane icon with trail appears in two locations:
      - First page: Positioned immediately after "SU VIAJE A:" text in the header (60px width)
      - All other pages: Bottom-left corner of every page (80px width at coordinates leftMargin, pageHeight-70)
      - Image stored in `server/assets/plane-logo.png`
    - **RNT Number**: "RNT No.240799" displayed in upper-left corner of first page for regulatory compliance
- **Role-Based Access**: Public routes are accessible without authentication, while advisor and super admin routes require specific roles, enforced by `requireAuth` and `requireRole` middleware.

### System Design Choices
The project adopts a monorepo structure (`/client`, `/server`, `/shared`). Clients are global entities managed by super admins. Advisors manage their own quotes, while super admins have full visibility. PostgreSQL session storage ensures production readiness. Database entities use `varchar` with `gen_random_uuid()` for IDs, and unique constraints prevent duplicate destinations. The database auto-seeds on deployment, populating with essential data if empty.

### Destination Catalog Management
**Active Destinations**: Only destinations with `isActive=true` are displayed in the public and advisor interfaces. Currently active:
- **Colombia Plans**: 7 national destinations (Cartagena, Medellín, Eje Cafetero, San Andrés, Amazonas, La Guajira, Santander)
- **International Plans**: "Turquía Esencial" (10 days, 9 nights, $710 USD land portion)

**Turquía Esencial Plan Configuration**:
- **Name**: "Turquía Esencial"
- **Price**: $710 USD (land portion only)
- **Duration**: 11 days, 9 nights
- **Main Cover Image**: Illuminated mosque (`attached_assets/2_1763570259884.png`)
- **PDF Image Set**: 6 custom images showcasing Turkey's iconic locations:
  1. Illuminated mosque at night (`2_1763570259884.png`) - Used on front page (main image)
  2. Hot air balloons in Capadocia (`3_1763570259885.png`) - Used on front page (secondary)
  3. Pamukkale white pools (`4_1763570259885.png`) - Used on front page (secondary)
  4. Turkish flags with Galata Tower (`1_1763570259884.png`) - Used on itinerary page
  5. Ephesus ruins interior (`5_1763570259885.png`) - Used on itinerary page
  6. Ephesus temple arch (`6_1763570259885.png`) - Used on itinerary page
- **Itinerary**: Estambul (3+1 nights) → Capadocia (3 nights) → Pamukkale (1 night) → Esmirna (1 night) → Estambul (1 night)
- **Image Configuration**: Images are stored in `attached_assets/` and configured in `server/destination-images.ts` and `client/src/lib/destination-images.ts`. The first 3 images are shown on the PDF front page, the last 3 on the detailed itinerary page.
- **Tooltip**: "Salidas todos los Martes desde Colombia. Combinable con: Dubái, Egipto, Grecia, Tailandia, Vietnam, Perú (salidas diarias). Turquía siempre va primero en la ruta."
- **Upgrade Options**: Turquía Esencial offers three exclusive upgrade packages to enhance the base experience:
  - **Option 1 (+$500 USD)**: 8 almuerzos + 2 actividades Estambul
  - **Option 2 (+$770 USD)**: Hotel céntrico Estambul + 8 almuerzos + 2 actividades Estambul
  - **Option 3 (+$1,100 USD)**: Hotel céntrico Estambul + Hotel cueva Capadocia + 8 almuerzos + 2 actividades Estambul
  - Upgrade options are displayed conditionally in both QuoteSummary and QuoteEdit pages only when Turquía Esencial is selected
  - Users can select only one upgrade option at a time (radio-style checkboxes)
  - The selected upgrade cost is automatically added to the grand total calculation
  - Stored in database field `turkeyUpgrade` with values: 'option1', 'option2', 'option3', or null
- **PDF Formatting Changes**:
  - Plane logo positioned at Y=65 (better aligned with "SU VIAJE A:" text)
  - RNT No.240799 and creation date positioned above main image
  - Special Offer banner reduced to 140px width
  - Dates formatted without slashes (e.g., "25 Noviembre 2025")
  - Date values and payment amount displayed in bold at 12pt font
  - Page 1 comments use mixed text formatting: normal text for general information, bold text for pricing details (Globo +415usd, 6 almuerzos +200usd, tarifa aérea policies)
  - Page 2 itinerary displays custom stop numbers: Estambul (1, 3 noches), Capadocia (3, 3 noches), Pamukkale (4, 1 noche), Esmirna (5, 1 noche), Estambul (7, 1 noche)
  - Page 2 includes Turkey route map below itinerary (attached_assets/Screenshot 2025-11-19 at 12.05.39 PM_1763572049850.png)

**Hidden Destinations**: 31 international plans are hidden (`isActive=false`) including previous Turkey, Dubai, Egypt, Greece, Thailand, Vietnam, and Peru plans.

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