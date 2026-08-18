# MKG CV Builder

A lightweight browser-based CV builder designed for general job seekers.

## Current features

- Step-by-step CV builder and live preview
- Modern Microsoft-inspired visual direction (not a copied Microsoft template)
- Personal details, profile, work history, skills, education, certificates/licences, projects/achievements
- Add, remove and reorder repeatable sections
- PDF export through the browser print-to-PDF flow
- Word-compatible `.doc` export
- Responsive layout for mobile, tablet and desktop
- Automatic browser local save
- Email/password accounts through Supabase Auth
- User profile with reusable CV defaults
- Account dashboard with saved CVs
- Rename and delete saved CVs
- Full snapshot version history for persisted CV edits
- Restore earlier CV versions
- Local-CV-to-account migration without deleting the local copy
- Safe Autofill Test Data for signed-out and signed-in testing
- Create Sample Account Data for dashboard/history testing
- Job-search form and planned-results placeholder for a later stage
- Cover-letter navigation placeholder for a later stage

## Supabase

Project URL: `https://trbwwaxabicopymadeya.supabase.co`

The browser app uses the Supabase publishable key. The service-role/secret key is never included in the client.

Database tables:

- `profiles`
- `cvs`
- `cv_versions`

Row Level Security is enabled so authenticated users can only read or change their own account data. The schema and policies are documented in `supabase/schema.sql`.

## Save behaviour

Signed-out users continue to save locally in browser `localStorage` under `mkg-cv-builder-v1`.

Signed-in account CVs are saved to Supabase and also mirrored locally as a fallback. If local CV data exists when a user signs in, the app offers to copy it into the account and keeps the local copy.

Version history stores full CV snapshots. Rapid typing is grouped into short persisted edits so history remains useful without sending a database write for every individual keystroke.

## Authentication redirect

Supabase Site URL / redirect URL should include:

`https://mgroombridge.github.io/mkg-cv-builder/`

## Hosting

The app is a static site hosted through GitHub Pages.
