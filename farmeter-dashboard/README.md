# FarMeter Dashboard (3-page starter)

A React + Vite + TypeScript dashboard with exactly three main routes:
- `/login` — Supabase email/password login
- `/admin` — admin overview, pickup list, create pickup, status management
- `/ops` — operations overview and pickup status updates

The app reads both existing pickup tables (`public.fm_pickups` and `public.pickups`), collector profile tables, and supplier profile tables. The people network brings collector and supplier records together in one searchable dashboard. It does not seed fake data.

## Run in GitHub Codespaces

1. Create a new GitHub repository and upload the contents of this folder.
2. Open the repository in Codespaces.
3. In the terminal run:

   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```

4. Open the forwarded port (Vite usually uses port 5173).

The `.env.example` contains this project's Supabase URL and publishable key. These are intended for client-side use; never use a `service_role` key in frontend code.

## Database role setup

The app expects `public.user_roles(user_id, role)` with `role` equal to `admin` or `ops`. Review `supabase-setup.sql`, then run the schema/policy portion in Supabase SQL Editor. Next assign roles to existing Auth users using the commented examples at the bottom of the SQL file, replacing the email placeholders with real user emails.

Do not assign roles using `raw_user_meta_data`; users can generally edit their own user metadata. Use the trusted `user_roles` table.

## Current database assumptions

- `fm_pickups`: `pending`, `assigned`, `picked_up`, `completed`, `cancelled`
- `pickups`: `Available`, `Assigned`, `En route`, `Arrived`, `Collected`, `In transit`, `At plant`, `Completed`, `Cancelled`
- Collector profiles are read from `fm_collector_profiles`, `collector_profiles`, `fm_collectors`, and `collectors`, with duplicate IDs merged. The dashboard recognizes common name/contact fields and `is_online`, `is_available`, `is_active`, or status fields.
- Supplier profile rows come from `fm_supplier_profiles` and `supplier_profiles`. Supplier names, contact details, and active/verified status are normalized from the available profile columns.
- Supplier profiles load independently from pickups and collectors. If neither supplier table exists, the dashboard stays available and reports that supplier profiles need to be configured; other Supabase query errors are shown in the people network.

If either app's table permissions are different, Supabase RLS will return an error in the dashboard. Keep RLS enabled and fix the relevant policies rather than disabling it.

## Notes

- The dashboard normalizes records from both pickup tables for display, but each row retains its source so status updates go back to the correct table.
- New pickup requests are inserted into `fm_pickups`.
- The status update UI is visible to admin and ops; permissions are ultimately enforced by Supabase.
- This is a hackathon starter, not a production security audit. Review the existing broad demo policies before making the app public.
