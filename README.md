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

## Deploy to Cloudflare Workers

Supabase provides the database, authentication, and private file storage. The Next.js app and its notification route run on Cloudflare Workers because Supabase does not host a Next.js server.

1. Configure `.env.local` with the production Supabase URL and publishable key before building. These public values are bundled into the browser app; never add a Supabase service-role key.
2. Sign in to Cloudflare with `npx wrangler login` and verify the account with `npx wrangler whoami`.
3. Preview the Worker runtime locally with `npm run preview:worker`.
4. Deploy with `npm run deploy:worker`. This creates or updates the `talk-to-us` Worker using the free Workers tier by default.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to the deployed Worker URL and add that origin plus `/**` to the redirect URL allowlist.
6. Sign up the first administrator, confirm the account, and promote it using the SQL in **Connect Supabase** above.

Email delivery remains off until `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured in Cloudflare Worker environment settings. Supabase's default SMTP is limited to project team addresses, so configure a custom SMTP provider for confirmations to the wider staff group. The app uses the request origin for notification links; set the optional server-only `SITE_URL` variable if you later add a custom domain.

The deployment uses the OpenNext Cloudflare adapter with the existing Next.js App Router, including its server-side notification endpoint. Cloudflare Worker runtime environment settings live in the Cloudflare dashboard or secret store; `.env.local` remains local and ignored by Git.

## Automatic deployment from GitHub

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs validation on pull requests to `main`. On every push to `main`, it runs tests, type checks, lint, and a Worker build, then applies pending Supabase migrations and deploys the app to Cloudflare Workers. You can also run it manually from the **Actions** tab on the `main` branch.

Before the first deployment, add these repository secrets under **Settings → Secrets and variables → Actions → Secrets**:

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with **Edit Cloudflare Workers** access, scoped to the account hosting Talk To Us. See [Cloudflare's GitHub Actions guide](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).
- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token. Use project-scoped Database write access if scoped tokens are available for your account. See [Supabase personal access tokens](https://supabase.com/docs/guides/platform/personal-access-tokens).
- `SUPABASE_DB_PASSWORD`: the database password for the Talk To Us Supabase project.

The repository variables `CLOUDFLARE_ACCOUNT_ID` and `SUPABASE_PROJECT_ID` are already configured. The workflow marks the initial schema migration as applied because the production schema was originally created through the Supabase dashboard; after that, it applies only new migration files from `supabase/migrations/`. Keep future schema changes in migration files so they can be deployed consistently.

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

The SQL migration must be applied to a Supabase project before using the live backend.
