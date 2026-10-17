# Talk To Us

A private portal where authenticated users can submit ideas and browse other submissions. Administrators can review, discuss, assign, and track ideas through to an outcome.

## Product decisions

- Anyone with a verified account can submit ideas. Use simple email and password sign-in with email verification; no enterprise SSO is required.
- All authenticated users can browse ideas. Show the submitter's name, idea details, status, and public timeline.
- Keep discussion private to the submitter and administrators. Administrators can see and respond to every idea.
- Use three access levels: user, admin, and super admin. Admins manage ideas and their workflow. Super admins also manage user roles and application settings.
- Send email notifications to submitters for admin replies and meaningful status changes. Notify admins when an idea is submitted or the submitter replies. General viewers do not receive notifications.
- No external app integrations are planned for the first release.

## Suggested idea workflow

1. Submitted
2. Under consideration
3. In review
4. Budget review, when the idea requires funding
5. Approved / budgeted
6. Assigned
7. In progress
8. Resolved
9. Closed

Declined, deferred, and duplicate are alternate outcomes that admins can select from an active stage. Ideas that need no budget can skip Budget review. Preserve every status change, its author, timestamp, and an optional decision note.

For useful finance reporting, allow optional estimated cost, currency, budget period, approved amount, and actual spend fields. Budget figures should remain optional so non-financial ideas can use the same workflow.

## Recommended starting stack

- **Next.js App Router and TypeScript** for the user portal, administrator dashboard, forms, and server-side operations in one application.
- **Supabase Postgres** for users, ideas, assignments, comments, status history, and audit records.
- **Supabase Auth** for email and password sign-in with verified email addresses. User self-registration is enabled; super admins assign admin roles.
- **Supabase Storage** with private access policies for uploaded files. Suggested initial limit: up to five files per idea, 10 MB each, allowing PDF, DOCX, XLSX, CSV, PNG, and JPEG. Files are visible only to the submitter and admins.
- **Tailwind CSS and shadcn/ui** for a consistent, accessible interface. Start with a filterable admin table and status board; add charts for reporting.
- **Server-side authorization and database Row Level Security** for access checks. Check a user's role and idea access on every protected operation.

No additional third-party API is required for the first release beyond the chosen authentication, database, and file-storage services. Email delivery can use the provider selected during implementation.

## Reporting

The first dashboard should cover:

- Idea counts by status, category, and month.
- Ideas awaiting review and their age.
- Average time to first review and resolution.
- Budget requested, budget approved, and actual spend by budget period.
- Filters for date range, category, status, submitter, and assignee.

Categories and budget periods should be manageable by super admins. Use one configured default currency and save the currency alongside each amount so reports do not add unlike currencies together.

## Later deployment choice

Deployment is intentionally undecided. The hosting provider should be selected after confirming the client's identity, data-location, and operational requirements.
