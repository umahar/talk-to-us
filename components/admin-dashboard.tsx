"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgePoundSterling,
  BarChart3,
  CircleAlert,
  CircleCheck,
  Clock3,
  ListChecks,
  UserRoundCheck,
} from "lucide-react";
import { usePortal } from "@/components/portal-provider";
import { EmptyState, PageHeader, PanelHeading, StatusBadge } from "@/components/ui";
import { formatCurrency, formatRelativeDate, getStatusCounts, isAdmin, STATUS_META } from "@/lib/domain";

const reviewStatuses = ["submitted", "under_consideration", "in_review", "budget_review"];

export function AdminDashboard() {
  const { user, ideas, profiles, categories, comments, demo } = usePortal();
  const [search, setSearch] = useState("");
  const counts = getStatusCounts(ideas);
  const reviewQueue = useMemo(() => ideas
    .filter((idea) => reviewStatuses.includes(idea.status) && `${idea.title} ${idea.description}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const order = reviewStatuses.indexOf(a.status) - reviewStatuses.indexOf(b.status);
      return order === 0 ? a.created_at.localeCompare(b.created_at) : order;
    }), [ideas, search]);
  const unassigned = ideas.filter((idea) => !idea.assigned_to && !["resolved", "closed", "declined", "deferred", "duplicate"].includes(idea.status)).length;
  const budgetReview = ideas.filter((idea) => idea.status === "budget_review");
  const closedCount = ideas.filter((idea) => ["resolved", "closed", "declined", "duplicate"].includes(idea.status)).length;
  const budgetTotal = budgetReview.reduce((sum, idea) => sum + (idea.estimated_cost ?? 0), 0);
  const financeCurrency = budgetReview[0]?.cost_currency ?? "GBP";
  const visibleComments = comments.filter((comment) => {
    const idea = ideas.find((item) => item.id === comment.idea_id);
    return isAdmin(user?.role) || idea?.submitted_by === user?.id;
  });

  if (!isAdmin(user?.role)) {
    return <EmptyState title="Admin access only" description="This workspace is for the admin team. You can still explore ideas and follow your own submissions." action={<Link className="button button-primary button-small" href="/">Back to overview</Link>} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin desk"
        title="Keep good ideas moving"
        subtitle="Review new submissions, keep the next step clear, and make sure nothing gets lost."
        action={<Link className="button button-secondary" href="/analytics"><BarChart3 size={14} /> View reporting</Link>}
      />
      <section className="stats-grid" aria-label="Admin overview">
        <article className="stat-card"><div className="stat-top"><span>Waiting for a first look</span><span className="stat-icon icon-coral"><CircleAlert size={14} /></span></div><div className="stat-bottom"><strong className="stat-value">{counts.submitted}</strong><span className="stat-change">new submissions</span></div></article>
        <article className="stat-card"><div className="stat-top"><span>Under review</span><span className="stat-icon icon-blue"><ListChecks size={14} /></span></div><div className="stat-bottom"><strong className="stat-value">{counts.in_review + counts.under_consideration}</strong><span className="stat-change">being discussed</span></div></article>
        <article className="stat-card"><div className="stat-top"><span>Need an owner</span><span className="stat-icon icon-purple"><UserRoundCheck size={14} /></span></div><div className="stat-bottom"><strong className="stat-value">{unassigned}</strong><span className="stat-change">active ideas unassigned</span></div></article>
        <article className="stat-card"><div className="stat-top"><span>Decisions recorded</span><span className="stat-icon"><CircleCheck size={14} /></span></div><div className="stat-bottom"><strong className="stat-value">{closedCount}</strong><span className="stat-change">closed or completed</span></div></article>
      </section>

      <div className="admin-layout">
        <section className="panel admin-queue">
          <PanelHeading title="Needs a decision" subtitle="Ideas still moving through review" action={<span className="panel-count"><Clock3 size={11} /> {reviewQueue.length} in queue</span>} />
          <div className="board-toolbar">
            <label className="search-box"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7.1" cy="7.1" r="4.7" stroke="currentColor" strokeWidth="1.4"/><path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find something in the queue" aria-label="Search review queue" /></label>
          </div>
          {reviewQueue.length ? (
            <div className="idea-list-full">
              {reviewQueue.map((idea) => (
                <div className="admin-queue-row" key={idea.id}>
                  <div>
                    <Link className="admin-queue-title" href={`/ideas/${idea.id}`}>{idea.title}</Link>
                    <p className="admin-queue-description">{idea.description}</p>
                    <div className="admin-queue-meta">
                      <span>{profiles.find((profile) => profile.id === idea.submitted_by)?.display_name ?? "Member"}</span><span className="meta-divider" />
                      <span>{categories.find((category) => category.id === idea.category_id)?.name ?? "Uncategorised"}</span><span className="meta-divider" />
                      <span>{formatRelativeDate(idea.created_at)}</span><span className="meta-divider" />
                      <span>{visibleComments.filter((comment) => comment.idea_id === idea.id).length} replies</span>
                    </div>
                  </div>
                  <div className="admin-queue-right">
                    <StatusBadge status={idea.status} />
                    {idea.estimated_cost !== null && <span className="idea-cost">{formatCurrency(idea.estimated_cost, idea.cost_currency)}</span>}
                    <Link className="text-link" href={`/ideas/${idea.id}`}>Review <ArrowRight size={11} /></Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="The queue is clear" description="New ideas that need review will show up here." />
          )}
        </section>

        <div className="side-column admin-side-column">
          <section className="panel">
            <PanelHeading title="Budget check" subtitle="Ideas currently in budget review" action={<span className="stat-icon icon-coral"><BadgePoundSterling size={14} /></span>} />
            <div style={{ padding: "3px 19px 17px" }}>
              <div className="budget-summary-total">{budgetTotal ? formatCurrency(budgetTotal, financeCurrency, true) : "—"}</div>
              <p className="field-hint">{budgetReview.length ? `${budgetReview.length} ${budgetReview.length === 1 ? "idea is" : "ideas are"} waiting for a funding decision.` : "No ideas are waiting for a budget decision."}</p>
              {budgetReview.slice(0, 3).map((idea) => (
                <Link key={idea.id} className="budget-queue-row" href={`/ideas/${idea.id}`}>
                  <span><strong>{idea.title}</strong><span>{idea.budget_period ?? "Period not set"}</span></span>
                  <span>{formatCurrency(idea.estimated_cost, idea.cost_currency)}<ArrowRight size={11} /></span>
                </Link>
              ))}
              {budgetReview.length > 3 && <Link className="text-link" href="/ideas?status=budget_review">See all {budgetReview.length} budget reviews <ArrowRight size={11} /></Link>}
            </div>
          </section>
          <section className="panel admin-action-card">
            <h3>Good administration is visible.</h3>
            <p>Clear notes help everyone understand why a decision was made and what happens next.</p>
            <div className="admin-action-row"><Clock3 size={14} /><span><strong>Keep the status current</strong><span>Update it as the decision moves forward.</span></span></div>
            <div className="admin-action-row"><MessageCircleIcon /><span><strong>Leave a helpful note</strong><span>Explain the reasoning in plain language.</span></span></div>
            <div className="admin-action-row"><UserRoundCheck size={14} /><span><strong>Name an owner</strong><span>Give the next step a clear person.</span></span></div>
          </section>
          <section className="panel admin-action-card">
            <h3>Quick view</h3>
            <p>Current status distribution across every idea.</p>
            <div className="quick-status-grid">
              {["submitted", "in_review", "budget_review", "in_progress", "resolved", "declined"].map((status) => (
                <div className="quick-status" key={status}><StatusBadge status={status as keyof typeof STATUS_META} compact /><strong>{counts[status as keyof typeof counts]}</strong></div>
              ))}
            </div>
            {demo && <p className="field-hint" style={{ margin: "12px 0 0" }}>Local demo data · {profiles.length} sample accounts</p>}
          </section>
        </div>
      </div>
    </>
  );
}

function MessageCircleIcon() {
  return <span className="custom-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.7 7.6a5.7 5.7 0 0 1-5.9 5.7 6.3 6.3 0 0 1-2.5-.5l-2.6.7.7-2.3A5.5 5.5 0 0 1 2.4 7.6 5.7 5.7 0 0 1 8.2 2a5.7 5.7 0 0 1 5.5 5.6Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/><path d="M5.5 7.7h5M5.5 9.7h3.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg></span>;
}
