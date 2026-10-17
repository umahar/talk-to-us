# Talk To Us

Talk To Us gives a team one calm, visible place to share ideas, review them, discuss next steps, and see what changed over time. It includes a working local demo and a Supabase-backed mode for real accounts and shared data.

## Run it locally

Use Node.js 24 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no Supabase environment values, the development app starts in demo mode. Choose a member, admin, or super admin account on the sign-in screen. Demo edits persist in the current browser. Demo uploads save file names and metadata so the flow can be explored; the files themselves are uploaded after Supabase is connected.

To use shared accounts and data, copy `.env.example` to `.env.local` and follow **Connect Supabase** below. Never commit `.env.local` or server API keys.

## Stack

- **Next.js App Router, React, and TypeScript** keep the member portal, admin screens, and notification endpoint in one app.
- **Supabase Postgres, Auth, and Storage** provide managed accounts, shared records, and private file access with database row level security.
- **Tailwind CSS 4, React, and Lucide** support the responsive interface and its custom component design.
- **Resend** handles optional transactional email. It is only called by the server after the database confirms who should receive an update.

This keeps the starting system small: one app and one managed data service, with email delivery added only when its credentials are configured.

## Connect Supabase

1. Create a Supabase project and set its site URL and allowed redirect URL to your app address. For local work, use `http://localhost:3000`.
2. In Supabase Authentication, enable email and password sign-in and email confirmation. Self-registration is on; confirmed members start with the `user` role.
3. Run [`supabase/migrations/20261017000000_initial_schema.sql`](supabase/migrations/20261017000000_initial_schema.sql) in the Supabase SQL Editor. It creates the schema, access rules, starter categories, and private file bucket.
4. Copy `.env.example` to `.env.local`, then add the project URL and publishable key from **Project settings → API**.
5. Start the app again with `npm run dev`, sign up with the first administrator email, and confirm the email. In the Supabase SQL Editor, promote that account:

   ```sql
   update public.profiles
   set role = 'super_admin'
   where id = (
     select id from auth.users
     where lower(email) = lower('admin@example.com')
   );
   ```

6. The first super admin can promote other members to admin or super admin in **Access & settings**.

The migration uses database row level security as the access boundary. The browser only receives the Supabase publishable key. The service role key is not needed by this app.

## Email notifications

Notifications are sent for new ideas, submitter replies, admin replies, and admin status changes. The server checks the signed-in user's access and the source history/comment record before choosing recipients. Admins receive new ideas and submitter replies; the submitter receives admin replies and status changes. Other board viewers are not emailed.

To enable delivery, create a Resend API key and verify a sender domain, then set these server environment values in `.env.local`:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Talk To Us <ideas@example.com>
```

If they are absent, idea submission and discussion still work; email delivery stays disabled. The endpoint records delivery attempts and uses an idempotency key to avoid duplicate messages.

## What is included

- Email and password sign-in with confirmed accounts.
- Three roles: member, admin, and super admin.
- Idea submission, optional budget estimate, and private supporting uploads.
- A shared idea board with search, category/status filters, and visible submitter names.
- A private discussion between each idea's submitter and the admin team.
- A timestamped history of submissions, status changes, assignments, budget changes, and replies.
- Admin review controls for status, assignee, estimate, approved amount, and actual spend.
- Reporting for status, category, monthly submissions, review time, resolution time, budget, and CSV export.
- Super admin tools for access and category management.
- Private Supabase Storage files: up to five per idea, 10 MB each; PDF, DOCX, XLSX, CSV, PNG, and JPEG.

Reports keep totals grouped by currency and budget period. The default currency is GBP and can be changed with `NEXT_PUBLIC_DEFAULT_CURRENCY`.

## Checks

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

The SQL migration should be applied to a Supabase project before using the live backend. Deployment is intentionally out of scope for this project setup.
