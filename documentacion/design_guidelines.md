# Design Guidelines: Sistema de Cotización de Planes Turísticos

## Design Approach

**Selected Approach:** Design System-based with Professional SaaS Patterns

This is a utility-focused B2B application prioritizing efficiency, data clarity, and professional output. Drawing inspiration from Linear, Notion, and modern enterprise tools, with warm accents reflecting the travel industry.

**Key Design Principles:**
- Information hierarchy and clarity over decoration
- Efficient workflows with minimal clicks
- Professional aesthetics suitable for client-facing PDFs
- Consistent, predictable interactions

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary Brand: 210 85% 45% (Professional blue - trust, travel)
- Primary Hover: 210 85% 40%
- Background: 0 0% 100% (Pure white)
- Surface: 210 20% 98% (Subtle warm gray)
- Border: 214 20% 88%
- Text Primary: 222 47% 11%
- Text Secondary: 215 16% 47%
- Success: 142 71% 45% (Confirmations, completed quotes)
- Warning: 38 92% 50% (Pending reviews)
- Error: 0 84% 60%

**Dark Mode:**
- Primary Brand: 210 100% 60%
- Primary Hover: 210 100% 65%
- Background: 222 47% 11%
- Surface: 217 33% 17%
- Border: 217 20% 25%
- Text Primary: 210 20% 98%
- Text Secondary: 215 20% 65%

**Accent Colors (use sparingly):**
- Destination Highlight: 30 80% 55% (Warm sunset orange for featured destinations)
- Used only for: CTA buttons on marketing-facing quote PDFs, destination badges

### B. Typography

**Font Families:**
- Primary: Inter (via Google Fonts CDN) - UI, forms, tables
- Secondary: Plus Jakarta Sans (via Google Fonts) - Headings, emphasis
- Monospace: JetBrains Mono - Prices, codes, dates

**Type Scale:**
- Headings: Plus Jakarta Sans - Bold
  - H1: text-4xl (36px) - Page titles
  - H2: text-2xl (24px) - Section headers
  - H3: text-xl (20px) - Card titles
  - H4: text-lg (18px) - Subsections

- Body: Inter - Regular (400), Medium (500), Semibold (600)
  - Large: text-base (16px) - Primary content
  - Base: text-sm (14px) - Secondary content, table data
  - Small: text-xs (12px) - Labels, metadata

- Prices: JetBrains Mono - Medium
  - Display: text-3xl (30px) - Quote totals
  - Inline: text-lg (18px) - Line items

### C. Layout System

**Spacing Scale:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4 to p-6
- Section spacing: mb-8, mb-12
- Card gaps: gap-4, gap-6
- Page margins: px-6, py-8 on mobile; px-12, py-12 on desktop

**Grid System:**
- Dashboard: 3-column stats cards (grid-cols-1 md:grid-cols-3)
- Quote list: Single column with proper spacing (max-w-6xl)
- Quote editor: 2-column layout - left sidebar (destination picker) + main editor (grid-cols-1 lg:grid-cols-[320px_1fr])
- Destination manager: Grid of destination cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

**Container Widths:**
- Dashboard/Lists: max-w-7xl
- Forms/Editors: max-w-5xl
- Content reading: max-w-prose

### D. Component Library

**Navigation:**
- Top navigation bar: Fixed, h-16, with logo left, user menu right
- Sidebar navigation (desktop): w-64, collapsible
- Mobile navigation: Slide-out drawer with overlay

**Cards:**
- Destination cards: Elevated (shadow-md), rounded-lg, p-6, hover:shadow-lg transition
- Quote cards: Border-based (border, border-gray-200), rounded-lg, p-4, hover:border-primary
- Stats cards: Minimal border, rounded-lg, p-6, with large number display

**Forms:**
- Input fields: h-10, px-3, rounded-md, border focus:ring-2 focus:ring-primary
- Select dropdowns: Same as inputs with chevron icon
- Textareas: min-h-32, p-3
- Date pickers: Integrated calendar component
- File upload: Drag-and-drop zone with preview

**Tables:**
- Header: Sticky, bg-surface, font-medium, text-sm uppercase tracking-wide
- Rows: hover:bg-surface, border-b last:border-0
- Cells: px-4 py-3, text-sm
- Actions: Icon buttons on row hover

**Buttons:**
- Primary: bg-primary text-white h-10 px-6 rounded-md font-medium hover:bg-primary-hover
- Secondary: border border-gray-300 bg-white h-10 px-6 rounded-md hover:bg-surface
- Ghost: transparent hover:bg-surface h-10 px-4 rounded-md
- Icon: w-9 h-9 rounded-md flex items-center justify-center

**Data Display:**
- Itinerary timeline: Vertical line with numbered nodes, each day as a card
- Destination badges: rounded-full px-3 py-1 text-xs font-medium with destination-specific colors
- Price displays: Large, prominent with currency symbol, JetBrains Mono font

**Modals/Dialogs:**
- Overlay: backdrop-blur-sm bg-black/50
- Modal: max-w-2xl, rounded-xl, shadow-2xl, p-6 to p-8
- Confirmation dialogs: max-w-md, centered

**Overlays:**
- Toast notifications: Bottom-right, slide-in animation, auto-dismiss
- Loading states: Skeleton screens for data-heavy sections, spinner for quick actions

### E. PDF Export Design

**Critical:** PDF output must match the professional quality of the provided reference.

**Layout Structure:**
- Page size: A4 (210mm × 297mm)
- Margins: 20mm all sides
- Header: Company logo (left), RNT/contact info (right), border-bottom
- Title section: Large bold destination name, pricing prominently displayed in box
- Itinerary: Day-by-day with day number in circle, location with nights indicator
- Sections: Clear headers for "Vuelo Ida", "Itinerario Detallado", "Hoteles", "Incluido/No Incluido"
- Footer: Page numbers, terms continuation

**Typography for PDF:**
- Titles: 24pt bold
- Day headers: 14pt bold
- Body text: 10pt regular
- Prices: 20pt bold for main, 12pt for breakdowns

**Colors for PDF:**
- Primary brand color for headers and accents
- Black text on white background for readability
- Light gray backgrounds for section separation
- Day numbers: White text on colored circles

**Visual Elements:**
- Flight icons for travel days
- Hotel icons for accommodation listings
- Checkmarks for included services
- Map placeholder (if feasible) showing destinations

## Images

This is a productivity application - images are minimal and functional:

**Dashboard:**
- No hero image
- Destination cards: Small thumbnail images (aspect-ratio-16/9, rounded-lg, object-cover) showing destination landmarks

**Destination Manager:**
- Form header: Upload area for destination hero image (used in PDF)
- Flight image upload: Area for screenshot/image of flight itinerary

**Quote Creator:**
- Selected destinations: Small preview thumbnails
- No decorative images - focus on data entry efficiency

**PDF Output:**
- Destination hero image at top of document (if uploaded)
- Flight images in appropriate sections
- Hotel exterior images (if available in database)

## Accessibility

- WCAG 2.1 AA compliance minimum
- Keyboard navigation for all interactive elements
- Focus indicators: ring-2 ring-primary ring-offset-2
- Sufficient color contrast ratios (4.5:1 for text)
- Dark mode fully supported across all components
- Form inputs with proper labels and error states
- Loading states announced to screen readers

## Key UX Patterns

**Quote Creation Flow:**
1. Select destination(s) from visual cards
2. Auto-populate itinerary from database
3. Adjust dates/prices in inline editors
4. Live preview of changes
5. One-click PDF generation

**Quick Actions:**
- "Duplicate Quote" button on existing quotes
- "Quick Quote" shortcut for common combinations
- Recent destinations easily accessible

**Data Management:**
- Inline editing where possible (click to edit)
- Batch operations for destinations (import/export)
- Autosave for quote drafts

**Professional Polish:**
- Smooth transitions (duration-200)
- Hover states on all interactive elements
- Empty states with helpful CTAs
- Success confirmations after actions
- Error messages with recovery suggestions