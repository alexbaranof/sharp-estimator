# Fast Estimator

AI-powered construction cost estimator. Upload photos, describe the work, and get instant professional estimates with line-item breakdowns.

## Tech Stack

- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI**: Anthropic Claude API (via Edge Functions)
- **Email**: Resend
- **PDF**: @react-pdf/renderer (client-side)

## Project Structure

```
Fast Estimator/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Dashboard with estimate list
│   │   │   ├── NewEstimate.jsx     # 3-step estimate creation wizard
│   │   │   ├── EstimateDetail.jsx  # View estimate with PDF preview
│   │   │   ├── Login.jsx           # Auth page
│   │   │   ├── ClientReview.jsx    # Client accept/decline page
│   │   │   └── Settings.jsx        # Company profile settings
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # Estimate list with filters & stats
│   │   │   ├── UploadZone.jsx      # Photo upload with compression
│   │   │   ├── ProjectSelector.jsx # Project selection/creation
│   │   │   ├── EstimateForm.jsx    # Estimate form with line items
│   │   │   ├── PDFDocument.jsx     # PDF generation component
│   │   │   └── RequireAuth.jsx     # Auth route guard
│   │   ├── lib/
│   │   │   ├── supabase.js         # Supabase client
│   │   │   ├── edgeFunctions.js    # Edge function calls
│   │   │   └── pdfUtils.js         # PDF upload utility
│   │   ├── App.jsx                 # Router config
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Tailwind import
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── postcss.config.js
│
├── supabase/functions/
│   ├── analyse-estimate/index.ts   # Claude AI estimation
│   └── send-estimate-email/index.ts # Email via Resend
│
├── .env.example
└── INSTRUCTIONS.md
```

## Database Schema

### Tables

**user_profiles**
- id (uuid, PK, references auth.users)
- company_name, company_address, company_email (text)
- default_markup (numeric, default 15)
- logo_url (text)

**projects**
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- name, client_name, client_email, address (text)
- created_at (timestamptz)

**estimates**
- id (uuid, PK)
- project_id (uuid, FK → projects)
- user_id (uuid, FK → auth.users)
- estimate_number (text, e.g. "EST-001")
- title, scope (text)
- line_items (jsonb)
- subtotal, markup_pct, vat_pct, total_inc_vat (numeric)
- time_estimate (integer, days)
- validity_days (integer, default 30)
- notes (text)
- status (text: draft/sent/accepted/declined)
- review_token (uuid)
- accepted_at (timestamptz)
- decline_reason (text)
- ai_draft (jsonb)
- pdf_url (text)
- created_at, updated_at (timestamptz)

**estimate_photos**
- id (uuid, PK)
- estimate_id (uuid, FK → estimates)
- url (text)
- caption (text)

### Storage Buckets
- `estimate-photos` — project photos, logos
- `estimate-pdfs` — generated PDFs

## Setup

1. Create a Supabase project
2. Create the database tables (see schema above)
3. Create storage buckets: `estimate-photos`, `estimate-pdfs`
4. Deploy edge functions: `analyse-estimate`, `send-estimate-email`
5. Set edge function secrets: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`, `APP_URL`
6. Copy `.env.example` → `client/.env` and fill in Supabase credentials
7. `cd client && npm install && npm run dev`

## Flow

1. **Login/Signup** → Supabase Auth
2. **Dashboard** → View all estimates with summary stats and filters
3. **New Estimate** (3 steps):
   - Select or create a project
   - Upload photos + describe the work
   - AI generates estimate → review & edit line items
4. **View Estimate** → Summary, PDF download/preview, send to client
5. **Client Review** → Client receives email link, can accept or decline
6. **Settings** → Company name, address, logo, default markup
