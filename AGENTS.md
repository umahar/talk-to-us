<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Talk To Us project context

Read this section and the repository `README.md` before making project changes. Keep this context current when the product, architecture, or deployment changes.

## Product

Talk To Us is a private idea-submission and resolution portal for a team. Authenticated members can submit ideas and supporting files, see the shared board and submitter names, and discuss an idea privately with its submitter and the admin team. The app keeps a timestamped history and provides admin reporting and CSV export. There are no third-party app integrations in scope. Email notifications are optional.

Roles are `user`, `admin`, and `super_admin`. New confirmed accounts are regular users. Admins handle idea review, statuses, assignments, budgets, and replies. Super admins also manage access and categories. Authorization is enforced with Supabase row-level security and server-side checks; do not rely on UI-only role checks.

## Architecture and deployment

- Next.js App Router, React, and TypeScript provide the web app and server routes.
- Supabase provides Postgres, email/password Auth, and private Storage. The app uses the publishable key in the client and must never include a Supabase service-role key in client code or Git.
- Cloudflare Workers runs the deployed Next.js app through the OpenNext Cloudflare adapter. The production app is at `https://talk-to-us.colorofmedicine.workers.dev`; Supabase remains the data, auth, and file backend.
- The production default currency is GBP. Budget reports keep different currencies and periods separate.
- Without Supabase environment variables, local development uses the browser-persisted demo mode. See `README.md` for setup, deployment, and first-admin promotion instructions.
- Email delivery is off unless `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured. Supabase's default SMTP is limited to project-team recipients; wider sign-up requires custom SMTP.

## Working conventions

- Preserve the private submitter/admin discussion boundary, visible submitter names, historical records, and RLS policies when changing features.
- Keep uploaded files private and enforce access through Supabase Storage policies.
- Check the relevant Next.js guide in `node_modules/next/dist/docs/` before changing framework APIs; the repository's Next.js version may differ from older examples.
- Use `README.md` as the setup and operations guide. The initial schema and policies live in `supabase/migrations/20261017000000_initial_schema.sql`.
