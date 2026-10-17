import { z } from "zod";

export const USER_ROLES = ["user", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const IDEA_STATUSES = [
  "submitted",
  "under_consideration",
  "in_review",
  "budget_review",
  "approved",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "declined",
  "deferred",
  "duplicate",
] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const STATUS_META: Record<
  IdeaStatus,
  { label: string; tone: string; group: "active" | "complete" | "closed" }
> = {
  submitted: { label: "Submitted", tone: "blue", group: "active" },
  under_consideration: {
    label: "Under consideration",
    tone: "violet",
    group: "active",
  },
  in_review: { label: "In review", tone: "amber", group: "active" },
  budget_review: { label: "Budget review", tone: "coral", group: "active" },
  approved: { label: "Approved / budgeted", tone: "green", group: "active" },
  assigned: { label: "Assigned", tone: "teal", group: "active" },
  in_progress: { label: "In progress", tone: "green", group: "active" },
  resolved: { label: "Resolved", tone: "green", group: "complete" },
  closed: { label: "Closed", tone: "slate", group: "complete" },
  declined: { label: "Declined", tone: "rose", group: "closed" },
  deferred: { label: "Deferred", tone: "slate", group: "closed" },
  duplicate: { label: "Duplicate", tone: "slate", group: "closed" },
};

export const STATUS_SEQUENCE: IdeaStatus[] = [
  "submitted",
  "under_consideration",
  "in_review",
  "budget_review",
  "approved",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
];

export const FILE_LIMIT = 10 * 1024 * 1024;
export const FILE_COUNT_LIMIT = 5;
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/csv": [".csv"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  is_active?: boolean;
  email?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at?: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category_id: string;
  submitted_by: string;
  status: IdeaStatus;
  estimated_cost: number | null;
  cost_currency: string;
  budget_period: string | null;
  approved_amount: number | null;
  actual_spend: number | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface IdeaEvent {
  id: string;
  idea_id: string;
  actor_id: string | null;
  event_type: "submitted" | "status_changed" | "assigned" | "budget_updated";
  from_status: IdeaStatus | null;
  to_status: IdeaStatus | null;
  note: string | null;
  created_at: string;
}

export interface IdeaAttachment {
  id: string;
  idea_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export const ideaFormSchema = z.object({
  title: z.string().trim().min(8, "Give your idea a little more detail.").max(120),
  description: z
    .string()
    .trim()
    .min(30, "Add a few sentences so others can understand the idea.")
    .max(5000),
  categoryId: z.string().min(1, "Choose a category."),
  estimatedCost: z.number().nonnegative().max(100_000_000).nullable(),
  costCurrency: z.string().length(3),
  budgetPeriod: z.string().max(32).nullable(),
});

export const commentSchema = z
  .string()
  .trim()
  .min(2, "Write a little more before sending.")
  .max(3000, "Keep comments under 3,000 characters.");

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(value));
}

export function formatRelativeDate(value: string, now = Date.now()): string {
  const delta = new Date(value).getTime() - now;
  const minutes = Math.round(delta / 60_000);
  const hours = Math.round(delta / 3_600_000);
  const days = Math.round(delta / 86_400_000);
  const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  if (Math.abs(days) < 30) return relative.format(days, "day");
  return formatDate(value);
}

export function formatCurrency(
  value: number | null | undefined,
  currency = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "GBP",
  compact = false,
): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function getFileError(file: File): string | null {
  if (file.size > FILE_LIMIT) return `${file.name} is over the 10 MB limit.`;
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const allowed = Object.entries(ALLOWED_FILE_TYPES).some(
    ([mimeType, extensions]) =>
      (file.type === mimeType || !file.type) && extensions.includes(extension),
  );
  if (!allowed) return `${file.name} is not a supported file type.`;
  return null;
}

export interface IdeaFilter {
  query?: string;
  status?: IdeaStatus | "all";
  categoryId?: string | "all";
  submittedBy?: string | "all";
}

export function filterIdeas(ideas: Idea[], filter: IdeaFilter): Idea[] {
  const query = filter.query?.trim().toLocaleLowerCase() ?? "";
  return ideas.filter((idea) => {
    const matchesQuery =
      !query ||
      `${idea.title} ${idea.description}`.toLocaleLowerCase().includes(query);
    const matchesStatus = !filter.status || filter.status === "all" || idea.status === filter.status;
    const matchesCategory =
      !filter.categoryId || filter.categoryId === "all" || idea.category_id === filter.categoryId;
    const matchesSubmitter =
      !filter.submittedBy || filter.submittedBy === "all" || idea.submitted_by === filter.submittedBy;
    return matchesQuery && matchesStatus && matchesCategory && matchesSubmitter;
  });
}

export function getStatusCounts(ideas: Idea[]): Record<IdeaStatus, number> {
  return IDEA_STATUSES.reduce(
    (counts, status) => {
      counts[status] = ideas.filter((idea) => idea.status === status).length;
      return counts;
    },
    Object.fromEntries(IDEA_STATUSES.map((status) => [status, 0])) as Record<
      IdeaStatus,
      number
    >,
  );
}

export function getAverageResolutionDays(ideas: Idea[]): number | null {
  const completed = ideas.filter((idea) => idea.resolved_at);
  if (!completed.length) return null;
  const total = completed.reduce((sum, idea) => {
    return (
      sum +
      (new Date(idea.resolved_at!).getTime() - new Date(idea.created_at).getTime()) /
        86_400_000
    );
  }, 0);
  return Math.max(0, Math.round((total / completed.length) * 10) / 10);
}

export function getMonthlySubmissionCounts(
  ideas: Idea[],
  now = new Date(),
  monthCount = 6,
): { key: string; label: string; count: number }[] {
  return Array.from({ length: monthCount }, (_, offset) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - offset), 1);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat("en", { month: "short" }).format(monthDate),
      count: ideas.filter((idea) => idea.created_at.startsWith(key)).length,
    };
  });
}

export function getBudgetTotals(ideas: Idea[]): Map<string, { requested: number; approved: number; actual: number }> {
  const totals = new Map<string, { requested: number; approved: number; actual: number }>();
  for (const idea of ideas) {
    const current = totals.get(idea.cost_currency) ?? { requested: 0, approved: 0, actual: 0 };
    current.requested += idea.estimated_cost ?? 0;
    current.approved += idea.approved_amount ?? 0;
    current.actual += idea.actual_spend ?? 0;
    totals.set(idea.cost_currency, current);
  }
  return totals;
}
