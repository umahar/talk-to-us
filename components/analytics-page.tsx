"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePortal } from "@/components/portal-provider";
import { EmptyState, PageHeader, PanelHeading, StatusBadge } from "@/components/ui";
import {
  formatCurrency,
  formatRelativeDate,
  getAverageResolutionDays,
  getBudgetTotals,
  getMonthlySubmissionCounts,
  getStatusCounts,
  isAdmin,
  STATUS_META,
} from "@/lib/domain";
import { ArrowDownToLine, BarChart3, CalendarRange, Clock3, Gauge, WalletCards } from "lucide-react";

function averageFirstReviewDays(ideas: ReturnType<typeof usePortal>["ideas"], events: ReturnType<typeof usePortal>["events"]): number | null {
  const durations = ideas.flatMap((idea) => {
    const submitted = idea.created_at;
    const firstReview = events
      .filter((event) => event.idea_id === idea.id && event.event_type === "status_changed" && ["under_consideration", "in_review", "budget_review", "approved"].includes(event.to_status ?? ""))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    if (!firstReview) return [];
    return [(new Date(firstReview.created_at).getTime() - new Date(submitted).getTime()) / 86_400_000];
  });
  if (!durations.length) return null;
  return Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10;
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function AnalyticsPage() {
  const { user, ideas, profiles, categories, events } = usePortal();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
  }, []);
  const monthly = getMonthlySubmissionCounts(ideas);
  const maxMonthly = Math.max(1, ...monthly.map((month) => month.count));
  const counts = getStatusCounts(ideas);
  const budgetTotals = getBudgetTotals(ideas);
  const avgResolution = getAverageResolutionDays(ideas);
  const avgReview = averageFirstReviewDays(ideas, events);
  const categoryStats = useMemo(() => categories
    .map((category) => ({ ...category, count: ideas.filter((idea) => idea.category_id === category.id).length }))
    .sort((a, b) => b.count - a.count), [categories, ideas]);
  const maxCategory = Math.max(1, ...categoryStats.map((category) => category.count));
  const financeByPeriod = useMemo(() => {
    const rows = new Map<string, { period: string; currency: string; requested: number; approved: number; actual: number }>();
    for (const idea of ideas) {
      const period = idea.budget_period || "Not assigned";
      const key = `${period}::${idea.cost_currency}`;
      const row = rows.get(key) ?? { period, currency: idea.cost_currency, requested: 0, approved: 0, actual: 0 };
      row.requested += idea.estimated_cost ?? 0;
      row.approved += idea.approved_amount ?? 0;
      row.actual += idea.actual_spend ?? 0;
      rows.set(key, row);
    }
    return [...rows.values()].sort((a, b) => a.period.localeCompare(b.period));
  }, [ideas]);
  const agingIdeas = now === null ? [] : ideas
    .filter((idea) => !["resolved", "closed", "declined", "deferred", "duplicate"].includes(idea.status))
    .map((idea) => ({ idea, age: (now - new Date(idea.created_at).getTime()) / 86_400_000 }))
    .filter(({ age }) => age > 14)
    .sort((a, b) => b.age - a.age)
    .slice(0, 5);

  function exportCsv() {
    const rows = [
      ["Title", "Category", "Submitter", "Status", "Assignee", "Created", "Estimated cost", "Approved amount", "Actual spend", "Currency", "Budget period"],
      ...ideas.map((idea) => [
        idea.title,
        categories.find((category) => category.id === idea.category_id)?.name ?? "",
        profiles.find((profile) => profile.id === idea.submitted_by)?.display_name ?? "",
        STATUS_META[idea.status].label,
        profiles.find((profile) => profile.id === idea.assigned_to)?.display_name ?? "",
        idea.created_at,
        idea.estimated_cost,
        idea.approved_amount,
        idea.actual_spend,
        idea.cost_currency,
        idea.budget_period,
      ]),
    ];
    const content = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const objectUrl = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `talk-to-us-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  if (!isAdmin(user?.role)) {
    return <EmptyState title="Reporting is for administrators" description="The admin team uses reports to understand what is moving, what needs attention, and how budgets are being used." action={<Link className="button button-primary button-small" href="/">Back to overview</Link>} />;
  }

  const statusColors: Record<string, string> = {
    submitted: "fill-coral",
    under_consideration: "fill-blue",
    in_review: "fill-gold",
    budget_review: "fill-coral",
    approved: "fill-lime",
    assigned: "fill-blue",
    in_progress: "fill-blue",
    resolved: "",
  };

  return (
    <>
      <PageHeader
        eyebrow="The bigger picture"
        title="Ideas in motion"
        subtitle="See how ideas move through the workspace and how funding is being considered."
        action={<button className="button button-primary" type="button" onClick={exportCsv}><ArrowDownToLine size={14} /> Export CSV</button>}
      />

      <section className="stats-grid" aria-label="Reporting metrics">
        <article className="stat-card"><div className="stat-top"><span>All ideas</span><span className="stat-icon"><BarChart3 size={14} /></span></div><div className="stat-bottom"><strong className="stat-value">{ideas.length}</strong><span className="stat-change">from {profiles.length} members</span></div></article>
        <article className="stat-card"><div className="stat-top"><span>Average to first review</span><span className="stat-icon icon-coral"><Clock3 size={14} /></span></div><div className="stat-bottom"><strong className="stat-value">{avgReview === null ? "—" : `${avgReview}d`}</strong><span className="stat-change">from submission</span></div></article>
        <article className="stat-card"><div className="stat-top"><span>Average to resolution</span><span className="stat-icon icon-blue"><Gauge size={14} /></span></div><div className="stat-bottom"><strong className="stat-value">{avgResolution === null ? "—" : `${avgResolution}d`}</strong><span className="stat-change">for completed ideas</span></div></article>
        <article className="stat-card"><div className="stat-top"><span>Budget periods tracked</span><span className="stat-icon icon-purple"><WalletCards size={14} /></span></div><div className="stat-bottom"><strong className="stat-value">{new Set(ideas.filter((idea) => idea.budget_period).map((idea) => idea.budget_period)).size}</strong><span className="stat-change">with a stated period</span></div></article>
      </section>

      <div className="analytics-grid">
        <section className="panel chart-card">
          <div className="chart-head"><div><h2>Ideas shared over time</h2><p>Monthly submissions · last six months</p></div><span className="chart-legend"><span className="legend-dot" /> New ideas</span></div>
          <div className="chart-total"><strong>{ideas.length}</strong><span>ideas in the workspace</span></div>
          <div className="bar-chart" role="img" aria-label={`Monthly submissions: ${monthly.map((month) => `${month.label} ${month.count}`).join(", ")}`}>
            {monthly.map((month, index) => {
              const height = month.count ? Math.max(8, (month.count / maxMonthly) * 100) : 2;
              return <div className="bar-column" key={month.key}><div className="bar-track"><span className={`bar${index === monthly.length - 1 ? " current" : ""}`} style={{ height: `${height}%` }} title={`${month.count} ideas`} /></div><span className="bar-value">{month.count || ""}</span><span className="bar-label">{month.label}</span></div>;
            })}
          </div>
        </section>

        <section className="panel chart-card">
          <div className="chart-head"><div><h2>Where ideas land</h2><p>Submissions by category</p></div><span className="chart-legend"><span className="legend-dot" /> Categories</span></div>
          <div className="category-breakdown">
            {categoryStats.map((category) => (
              <div className="category-breakdown-row" key={category.id}>
                <div><div className="category-breakdown-label"><span>{category.name}</span><span>{category.count} {category.count === 1 ? "idea" : "ideas"}</span></div><div className="category-breakdown-track"><div className="category-breakdown-fill" style={{ width: `${category.count ? Math.max(6, (category.count / maxCategory) * 100) : 0}%`, background: category.color }} /></div></div>
                <strong>{ideas.length ? Math.round((category.count / ideas.length) * 100) : 0}%</strong>
              </div>
            ))}
            {!categoryStats.length && <p className="field-hint">Categories will appear as ideas are submitted.</p>}
          </div>
        </section>
      </div>

      <div className="analytics-grid" style={{ marginTop: 14 }}>
        <section className="panel chart-card">
          <div className="chart-head"><div><h2>Budget overview</h2><p>Requested, approved and spent · grouped by period and currency</p></div><span className="chart-legend"><span className="legend-dot" style={{ background: "#a6bc84" }} /> Finance</span></div>
          {financeByPeriod.length ? (
            <div className="table-scroll"><table className="finance-table">
              <thead><tr><th>Budget period</th><th>Requested</th><th>Approved</th><th>Actual spend</th></tr></thead>
              <tbody>{financeByPeriod.map((row) => <tr key={`${row.period}-${row.currency}`}><td><span className="finance-period"><span className="finance-dot" />{row.period} · {row.currency}</span></td><td><strong>{formatCurrency(row.requested, row.currency)}</strong></td><td>{formatCurrency(row.approved, row.currency)}</td><td>{formatCurrency(row.actual, row.currency)}</td></tr>)}</tbody>
            </table></div>
          ) : <p className="field-hint">Budget information will appear here when ideas include financial estimates.</p>}
          <div className="finance-currency-summary">
            {[...budgetTotals.entries()].map(([currency, totals]) => <div className="finance-summary-item" key={currency}><span>{currency} requested</span><strong>{formatCurrency(totals.requested, currency)}</strong><span>Approved {formatCurrency(totals.approved, currency)} · spent {formatCurrency(totals.actual, currency)}</span></div>)}
          </div>
        </section>

        <div className="side-column">
          <section className="panel">
            <PanelHeading title="Status distribution" subtitle="A snapshot of every idea" action={<CalendarRange size={13} color="#809571" />} />
            <div className="status-summary">
              {["submitted", "under_consideration", "in_review", "budget_review", "approved", "assigned", "in_progress", "resolved", "declined", "deferred"].map((status) => {
                const count = counts[status as keyof typeof counts];
                const width = ideas.length ? Math.max(count ? 4 : 0, count / ideas.length * 100) : 0;
                return <div className="summary-row" key={status}><span>{STATUS_META[status as keyof typeof STATUS_META].label}</span><span className="summary-track"><span className={`summary-fill ${statusColors[status] ?? "fill-lime"}`} style={{ width: `${width}%` }} /></span><strong className="summary-value">{count}</strong></div>;
              })}
            </div>
          </section>
          <section className="panel">
            <PanelHeading title="Waiting a while" subtitle="Open ideas older than two weeks" action={<span className="panel-count"><Clock3 size={10} /> {agingIdeas.length}</span>} />
            <div className="queue-list">
              {agingIdeas.length ? agingIdeas.map(({ idea, age }) => <Link className="queue-item" href={`/ideas/${idea.id}`} key={idea.id}><span className="queue-item-copy"><strong>{idea.title}</strong><span>{formatRelativeDate(idea.created_at)} · {Math.floor(age)} days old</span></span><StatusBadge status={idea.status} compact /></Link>) : <p className="field-hint">Nothing is waiting longer than two weeks. Lovely.</p>}
            </div>
          </section>
        </div>
      </div>
      <p className="report-footnote">Financial totals are separated by currency. “Requested”, “approved” and “actual spend” are kept distinct to make budget decisions easier to follow.</p>
    </>
  );
}
