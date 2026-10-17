import type {
  Category,
  Idea,
  IdeaAttachment,
  IdeaComment,
  IdeaEvent,
  Profile,
} from "@/lib/domain";

function daysAgo(days: number, hours = 10): string {
  const value = new Date();
  value.setDate(value.getDate() - days);
  value.setHours(hours, 0, 0, 0);
  return value.toISOString();
}

export const DEMO_PROFILES: Profile[] = [
  { id: "person-jamie", display_name: "Jamie Parker", role: "user", created_at: daysAgo(280), email: "jamie@talktous.demo" },
  { id: "person-taylor", display_name: "Taylor Chen", role: "user", created_at: daysAgo(210), email: "taylor@talktous.demo" },
  { id: "person-sam", display_name: "Sam Okafor", role: "user", created_at: daysAgo(160), email: "sam@talktous.demo" },
  { id: "person-alex", display_name: "Alex Morgan", role: "user", created_at: daysAgo(132), email: "alex@talktous.demo" },
  { id: "admin-morgan", display_name: "Morgan Ellis", role: "admin", created_at: daysAgo(360), email: "morgan@talktous.demo" },
  { id: "admin-riley", display_name: "Riley Bennett", role: "admin", created_at: daysAgo(345), email: "riley@talktous.demo" },
  { id: "super-ava", display_name: "Ava Patel", role: "super_admin", created_at: daysAgo(400), email: "ava@talktous.demo" },
];

export const DEMO_CATEGORIES: Category[] = [
  { id: "category-workplace", name: "Workplace", color: "#8ec7a4", is_active: true },
  { id: "category-culture", name: "Culture & community", color: "#f4bd8b", is_active: true },
  { id: "category-tools", name: "Tools & technology", color: "#9db7ef", is_active: true },
  { id: "category-sustainability", name: "Sustainability", color: "#a7c979", is_active: true },
  { id: "category-process", name: "Ways of working", color: "#d5a4cb", is_active: true },
];

export const DEMO_IDEAS: Idea[] = [
  {
    id: "idea-quiet-space",
    title: "Make room bookings easier to see",
    description:
      "A simple live view of room availability would save people a lot of time. It could include the quiet room and the small meeting pods, with clear guidance on how long each space can be booked for.",
    category_id: "category-workplace",
    submitted_by: "person-jamie",
    status: "in_review",
    estimated_cost: 0,
    cost_currency: "GBP",
    budget_period: null,
    approved_amount: null,
    actual_spend: null,
    assigned_to: "admin-morgan",
    created_at: daysAgo(16, 9),
    updated_at: daysAgo(1, 13),
    resolved_at: null,
  },
  {
    id: "idea-community-lunch",
    title: "A monthly lunch, hosted by a different team",
    description:
      "Once a month, one team could pick a theme and host an informal lunch. It would help people meet colleagues outside their usual circles and give newer starters an easy way in.",
    category_id: "category-culture",
    submitted_by: "person-alex",
    status: "budget_review",
    estimated_cost: 850,
    cost_currency: "GBP",
    budget_period: "FY 2026 / 27",
    approved_amount: null,
    actual_spend: null,
    assigned_to: "admin-riley",
    created_at: daysAgo(13, 11),
    updated_at: daysAgo(2, 14),
    resolved_at: null,
  },
  {
    id: "idea-onboarding",
    title: "Bring new starter checklists into one place",
    description:
      "The first week can feel like a scavenger hunt. A shared checklist by role, with named owners and links to the right systems, would make onboarding smoother for new joiners and managers.",
    category_id: "category-process",
    submitted_by: "person-taylor",
    status: "submitted",
    estimated_cost: null,
    cost_currency: "GBP",
    budget_period: null,
    approved_amount: null,
    actual_spend: null,
    assigned_to: null,
    created_at: daysAgo(1, 15),
    updated_at: daysAgo(1, 15),
    resolved_at: null,
  },
  {
    id: "idea-focus-hours",
    title: "Introduce a couple of focus hours each week",
    description:
      "Could we trial two meeting-free blocks each week? It would give people a predictable time to do deep work, while still leaving plenty of room for collaboration on the rest of the calendar.",
    category_id: "category-workplace",
    submitted_by: "person-sam",
    status: "under_consideration",
    estimated_cost: 0,
    cost_currency: "GBP",
    budget_period: null,
    approved_amount: null,
    actual_spend: null,
    assigned_to: null,
    created_at: daysAgo(5, 10),
    updated_at: daysAgo(3, 16),
    resolved_at: null,
  },
  {
    id: "idea-reusable-cups",
    title: "Add a reusable cup shelf by the kitchen",
    description:
      "A clearly labelled shelf for clean reusable cups could cut down on disposable ones. We could start with a small set of spare mugs and a simple sign asking everyone to wash and return theirs.",
    category_id: "category-sustainability",
    submitted_by: "person-jamie",
    status: "assigned",
    estimated_cost: 160,
    cost_currency: "GBP",
    budget_period: "FY 2026 / 27",
    approved_amount: 160,
    actual_spend: null,
    assigned_to: "admin-morgan",
    created_at: daysAgo(24, 9),
    updated_at: daysAgo(4, 12),
    resolved_at: null,
  },
  {
    id: "idea-knowledge-library",
    title: "Build a small library of useful team guides",
    description:
      "We already have great guides in lots of places. A lightweight home for the most useful how-tos, with an owner and review date for each one, would make it easier to find and keep advice current.",
    category_id: "category-tools",
    submitted_by: "person-taylor",
    status: "approved",
    estimated_cost: 2400,
    cost_currency: "GBP",
    budget_period: "FY 2026 / 27",
    approved_amount: 1800,
    actual_spend: null,
    assigned_to: "admin-riley",
    created_at: daysAgo(32, 10),
    updated_at: daysAgo(6, 14),
    resolved_at: null,
  },
  {
    id: "idea-screen-refresh",
    title: "Replace the meeting room screens",
    description:
      "The screens in the large rooms are difficult to connect to and make hybrid calls harder than they need to be. A refresh would give teams a more reliable setup for workshops and customer sessions.",
    category_id: "category-tools",
    submitted_by: "person-alex",
    status: "in_progress",
    estimated_cost: 3600,
    cost_currency: "GBP",
    budget_period: "FY 2026 / 27",
    approved_amount: 3200,
    actual_spend: 2100,
    assigned_to: "admin-morgan",
    created_at: daysAgo(58, 9),
    updated_at: daysAgo(2, 9),
    resolved_at: null,
  },
  {
    id: "idea-supplies",
    title: "Create a simpler way to order shared supplies",
    description:
      "A short monthly order form for stationery and kitchen basics could prevent duplicate requests and help us see what the office actually uses. It might also make it easier to buy in sensible quantities.",
    category_id: "category-process",
    submitted_by: "person-sam",
    status: "resolved",
    estimated_cost: 300,
    cost_currency: "GBP",
    budget_period: "FY 2025 / 26",
    approved_amount: 300,
    actual_spend: 278,
    assigned_to: "admin-riley",
    created_at: daysAgo(94, 13),
    updated_at: daysAgo(19, 12),
    resolved_at: daysAgo(19, 12),
  },
  {
    id: "idea-bike-racks",
    title: "Add covered bike racks near the entrance",
    description:
      "A small covered rack would make cycling to the office feel more practical in wet weather and give bikes a safer, more visible place to be stored during the day.",
    category_id: "category-sustainability",
    submitted_by: "person-jamie",
    status: "deferred",
    estimated_cost: 1400,
    cost_currency: "GBP",
    budget_period: "FY 2027 / 28",
    approved_amount: null,
    actual_spend: null,
    assigned_to: null,
    created_at: daysAgo(125, 11),
    updated_at: daysAgo(42, 15),
    resolved_at: null,
  },
  {
    id: "idea-digital-signage",
    title: "Share weekly team updates on a screen",
    description:
      "A rotating screen in the main kitchen could highlight upcoming events, helpful reminders, and a small win from each team. We could start with a shared slide deck and see what people find useful.",
    category_id: "category-culture",
    submitted_by: "person-taylor",
    status: "declined",
    estimated_cost: 500,
    cost_currency: "GBP",
    budget_period: null,
    approved_amount: null,
    actual_spend: null,
    assigned_to: null,
    created_at: daysAgo(148, 10),
    updated_at: daysAgo(110, 13),
    resolved_at: daysAgo(110, 13),
  },
];

export const DEMO_COMMENTS: IdeaComment[] = [
  { id: "comment-1", idea_id: "idea-quiet-space", author_id: "person-jamie", body: "The quiet room is the main one I had in mind, but seeing all the smaller spaces together would be great too.", created_at: daysAgo(15, 12) },
  { id: "comment-2", idea_id: "idea-quiet-space", author_id: "admin-morgan", body: "Thanks, Jamie. We are looking at what is already available in the booking system before we shape a small trial.", created_at: daysAgo(12, 16) },
  { id: "comment-3", idea_id: "idea-quiet-space", author_id: "person-jamie", body: "Happy to help test the first version if that would be useful.", created_at: daysAgo(1, 13) },
  { id: "comment-4", idea_id: "idea-community-lunch", author_id: "admin-riley", body: "This has a lot of support. I am checking a low-cost pilot for the next quarter.", created_at: daysAgo(2, 14) },
  { id: "comment-5", idea_id: "idea-reusable-cups", author_id: "admin-morgan", body: "Approved for a small first order. I have asked the office team to source a few durable options.", created_at: daysAgo(4, 12) },
  { id: "comment-6", idea_id: "idea-supplies", author_id: "admin-riley", body: "The new form is live. We will review the first month's orders and share the results.", created_at: daysAgo(19, 12) },
];

export const DEMO_EVENTS: IdeaEvent[] = DEMO_IDEAS.flatMap((idea) => {
  const submitted: IdeaEvent = {
    id: `${idea.id}-event-submitted`,
    idea_id: idea.id,
    actor_id: idea.submitted_by,
    event_type: "submitted",
    from_status: null,
    to_status: "submitted",
    note: null,
    created_at: idea.created_at,
  };
  const latest: IdeaEvent = {
    id: `${idea.id}-event-current`,
    idea_id: idea.id,
    actor_id: idea.assigned_to ?? "admin-morgan",
    event_type: "status_changed",
    from_status: "submitted",
    to_status: idea.status,
    note: null,
    created_at: idea.updated_at,
  };
  return idea.status === "submitted" ? [submitted] : [submitted, latest];
});

export const DEMO_ATTACHMENTS: IdeaAttachment[] = [
  {
    id: "file-1",
    idea_id: "idea-community-lunch",
    uploaded_by: "person-alex",
    storage_path: "demo/idea-community-lunch/lunch-pilot-outline.pdf",
    file_name: "lunch-pilot-outline.pdf",
    mime_type: "application/pdf",
    size_bytes: 248_000,
    created_at: daysAgo(13, 11),
  },
  {
    id: "file-2",
    idea_id: "idea-screen-refresh",
    uploaded_by: "person-alex",
    storage_path: "demo/idea-screen-refresh/room-screen-options.xlsx",
    file_name: "room-screen-options.xlsx",
    mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 612_000,
    created_at: daysAgo(58, 9),
  },
];
