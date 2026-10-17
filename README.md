# Talk To Us

A private portal where authorized users can submit ideas and administrators can review, discuss, assign, and track them through to an outcome.

## Initial product brief

- Users submit an idea or issue with a description and optional files.
- Administrators review submissions, update their status, and assign work.
- The history records who submitted each idea, when it was submitted, status changes, discussion, and the final outcome.
- Users and administrators can discuss an idea in its history.
- Access is restricted to approved users, with administrator permissions for managing submissions and access.

## Recommended starting stack

- **Next.js App Router and TypeScript** for the user portal, administrator dashboard, forms, and server-side operations in one application.
- **Supabase Postgres** for users, ideas, assignments, comments, status history, and audit records. Keep status changes and outcomes as timestamped history so the current status does not erase prior decisions.
- **Supabase Auth** for sign-in, configured for the client's approved users. Use the client's existing identity provider for single sign-on if one is available; otherwise use an invitation-only sign-in flow.
- **Supabase Storage** with private access policies for uploaded files. Store attachment metadata alongside the idea and grant access only to users allowed to view that idea.
- **Tailwind CSS and shadcn/ui** for a consistent, accessible interface. Start with a filterable table or status board for administration; add charts only when useful reporting questions are known.
- **Server-side authorization and database Row Level Security** for access checks. A user's role and allowed ideas must be checked on every protected operation.

No additional third-party API is required for the core submission and review flow beyond the chosen auth, database, and file-storage services. Email alerts, live updates, or links to a ticketing system can be added if the client wants them.

## Decisions to confirm before implementation

1. **Who can use the portal?** Employees in one organization, invited external users, or another group? Is there an existing Microsoft Entra ID, Google Workspace, or other identity provider?
2. **What can users see?** Should each submitter see only their own ideas, or can users browse and comment on other submissions? Which admin roles are needed?
3. **What is the workflow?** Confirm the status list, who can change each status, whether statuses need to be configurable, and how completed, declined, or duplicate ideas are handled.
4. **How should discussion work?** Should comments be visible only to the submitter and admins, or to everyone who can see the idea? Should the app send email alerts for replies and status changes?
5. **What files are allowed?** Confirm file types, size limits, and whether submissions may contain sensitive or regulated information.
6. **What integrations are expected?** For example, Microsoft Teams, Slack, Jira, ServiceNow, or an existing email system. Is an API needed to export or sync ideas?
7. **What reporting is useful?** For example, categories, departments, priorities, aging, budget, duplicate detection, or voting.

## Later deployment choice

Deployment is intentionally undecided. The hosting provider should be selected after confirming the client's identity, data-location, and operational requirements.
