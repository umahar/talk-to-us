"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  Eye,
  FilePlus2,
  Gauge,
  Leaf,
  Lightbulb,
  MessageCircleMore,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { usePortal } from "@/components/portal-provider";
import { IdeaListItem } from "@/components/idea-list-item";
import { EmptyState, PageHeader, PanelHeading } from "@/components/ui";
import {
  formatDate,
  formatRelativeDate,
  getAverageResolutionDays,
  getStatusCounts,
  isAdmin,
  STATUS_META,
  type IdeaEvent,
} from "@/lib/domain";

function greeting(name: string) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${timeOfDay}, ${name.split(" ")[0]}`;
}

function statusIcon(status: IdeaEvent["to_status"]) {
  if (status === "resolved" || status === "closed") return CircleCheck;
  if (status === "in_review" || status === "budget_review") return Eye;
  return Sparkles;
}

export function Dashboard() {
  const { user, ideas, profiles, categories, comments, events } = usePortal();
  const [search, setSearch] = useState("");
  const counts = getStatusCounts(ideas);
  const active = ideas.filter((idea) => !["resolved", "closed", "declined", "duplicate"].includes(idea.status));
  const moving = ideas.filter((idea) => ["assigned", "in_progress"].includes(idea.status)).length;
  const completed = ideas.filter((idea) => ["resolved", "closed"].includes(idea.status)).length;
  const averageResolution = getAverageResolutionDays(ideas);
  const newestIdeas = useMemo(
    () => [...ideas]
      .filter((idea) => `${idea.title} ${idea.description}`.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5),
    [ideas, search],
  );
  const visibleComments = comments.filter((comment) =>
    isAdmin(user?.role) || ideas.find((idea) => idea.id === comment.idea_id)?.submitted_by === user?.id,
  );
  const recentEvents = [
    ...events.map((event) => ({ kind: "event" as const, date: event.created_at, event })),
    ...visibleComments.map((comment) => ({ kind: "comment" as const, date: comment.created_at, comment })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const progressStatuses = ["submitted", "in_review", "budget_review", "in_progress"] as const;
  const maxProgress = Math.max(1, ...progressStatuses.map((status) => counts[status]));

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date().toISOString(), { weekday: "long", month: "long", day: "numeric" })}
        title={greeting(user?.display_name ?? "there")}
        subtitle="A good idea can start anywhere. Here’s what your community has been thinking about."
        action={<Link className="button button-primary" href="/ideas/new"><FilePlus2 size={14} /> Share an idea</Link>}
      />

      <section className="welcome-card" aria-label="Share an idea">
        <div className="welcome-copy">
          <span className="welcome-label"><Sparkles size={12} /> Your voice belongs here</span>
          <h2 className="welcome-title">Make a small change. <em>Make a big difference.</em></h2>
          <p>Share what could work better. We’ll make sure it’s seen, discussed and followed through.</p>
          <Link className="button button-lime button-small" href="/ideas/new">Put an idea forward <ArrowRight size={13} /></Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="welcome-orbit" />
          <span className="orbit-dot dot-a"><Leaf size={14} /></span>
          <span className="orbit-dot dot-b"><Sparkles size={14} /></span>
          <span className="orbit-dot dot-c"><MessageCircleMore size={14} /></span>
          <span className="orbit-dot dot-d"><TrendingUp size={14} /></span>
          <span className="welcome-sun"><Lightbulb size={50} strokeWidth={1.5} /></span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Idea overview">
        <article className="stat-card">
          <div className="stat-top"><span>Ideas shared</span><span className="stat-icon"><Lightbulb size={14} /></span></div>
          <div className="stat-bottom"><strong className="stat-value">{ideas.length}</strong><span className="stat-change">across the community</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Open for review</span><span className="stat-icon icon-coral"><Eye size={14} /></span></div>
          <div className="stat-bottom"><strong className="stat-value">{counts.submitted + counts.under_consideration + counts.in_review + counts.budget_review}</strong><span className="stat-change">need a decision</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>In motion</span><span className="stat-icon icon-blue"><TrendingUp size={14} /></span></div>
          <div className="stat-bottom"><strong className="stat-value">{moving}</strong><span className="stat-change">assigned or in progress</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Seen through</span><span className="stat-icon icon-purple"><CircleCheck size={14} /></span></div>
          <div className="stat-bottom"><strong className="stat-value">{completed}</strong><span className="stat-change">{averageResolution === null ? "ready for their next step" : `avg. ${averageResolution} days to resolve`}</span></div>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel board-card">
          <PanelHeading
            title="Ideas around the table"
            subtitle="The latest thoughts from your community"
            action={<Link href="/ideas" className="text-link">Explore all <ArrowUpRight size={13} /></Link>}
          />
          <div className="board-toolbar">
            <label className="search-box"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an idea" aria-label="Find an idea" /></label>
            <span className="panel-count"><span className="meta-divider" /> {ideas.length} ideas</span>
          </div>
          <div className="idea-list">
            {newestIdeas.length ? newestIdeas.map((idea) => (
              <IdeaListItem
                key={idea.id}
                idea={idea}
                profiles={profiles}
                categories={categories}
                commentCount={visibleComments.filter((comment) => comment.idea_id === idea.id).length}
              />
            )) : <EmptyState title="No matches just yet" description="Try a different search, or share a new idea with the group." />}
          </div>
          <div className="panel-divider" />
          <div style={{ display: "flex", justifyContent: "center", padding: 13 }}>
            <Link className="text-link" href="/ideas">See the whole idea board <ArrowRight size={13} /></Link>
          </div>
        </section>

        <div className="side-column">
          <section className="panel">
            <PanelHeading title="Where ideas are now" subtitle="A quick look at the pipeline" action={<span className="panel-count"><Gauge size={11} /> {active.length} active</span>} />
            <div className="status-summary">
              {[
                { status: "submitted" as const, label: "New ideas", tone: "fill-lime" },
                { status: "in_review" as const, label: "Being reviewed", tone: "fill-gold" },
                { status: "budget_review" as const, label: "Budget check", tone: "fill-coral" },
                { status: "in_progress" as const, label: "In progress", tone: "fill-blue" },
              ].map(({ status, label, tone }) => (
                <div className="summary-row" key={status}>
                  <span>{label}</span>
                  <span className="summary-track"><span className={`summary-fill ${tone}`} style={{ width: `${Math.max(counts[status] > 0 ? 7 : 0, Math.round((counts[status] / maxProgress) * 100))}%` }} /></span>
                  <strong className="summary-value">{counts[status]}</strong>
                </div>
              ))}
            </div>
            <div className="panel-divider" />
            <div style={{ padding: "12px 19px 15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="field-hint">See the bigger picture</span>
              <Link className="text-link" href={isAdmin(user?.role) ? "/analytics" : "/ideas"}>{isAdmin(user?.role) ? "Open reports" : "Browse ideas"} <ArrowRight size={12} /></Link>
            </div>
          </section>

          <section className="panel">
            <PanelHeading title="Recent activity" subtitle="A little progress at a time" action={<span className="panel-count"><Clock3 size={11} /> Live history</span>} />
            <div className="activity-list">
              {recentEvents.length ? recentEvents.map((item) => {
                const ideaId = item.kind === "event" ? item.event.idea_id : item.comment.idea_id;
                const idea = ideas.find((candidate) => candidate.id === ideaId);
                if (!idea) return null;
                const actorId = item.kind === "event" ? item.event.actor_id : item.comment.author_id;
                const actor = profiles.find((profile) => profile.id === actorId);
                const Icon = item.kind === "comment" ? MessageCircleMore : statusIcon(item.event.to_status);
                const detail = item.kind === "comment"
                  ? "left a reply on"
                  : item.event.event_type === "submitted"
                    ? "shared a new idea"
                    : item.event.event_type === "assigned"
                      ? "updated the owner for"
                      : item.event.event_type === "budget_updated"
                        ? "updated the budget for"
                        : `moved an idea to ${STATUS_META[item.event.to_status ?? "submitted"].label.toLowerCase()}`;
                return (
                  <div className="activity-item" key={item.kind === "event" ? item.event.id : item.comment.id}>
                    <span className="activity-symbol"><Icon size={12} /></span>
                    <div className="activity-content">
                      <p><strong>{actor?.display_name ?? "A member"}</strong> {detail} <Link href={`/ideas/${idea.id}`}>{idea.title}</Link></p>
                      <time className="activity-time" dateTime={item.date}>{formatRelativeDate(item.date)}</time>
                    </div>
                  </div>
                );
              }) : <p className="field-hint">New activity will show up here.</p>}
            </div>
          </section>

          <div className="quote-card">
            <span className="quote-mark">“</span>
            <p>Better work starts when everyone has a voice in it.</p>
            <span>A thought worth sharing</span>
            <span className="quote-decoration" aria-hidden="true" />
          </div>
        </div>
      </div>
      {isAdmin(user?.role) && (
        <div style={{ marginTop: 13, color: "#98a29a", fontSize: 9, display: "flex", alignItems: "center", gap: 5 }}>
          <CalendarDays size={11} /> {counts.submitted} {counts.submitted === 1 ? "idea needs" : "ideas need"} first review · <Link className="text-link" href="/admin">Review queue <ArrowRight size={11} /></Link>
        </div>
      )}
    </>
  );
}
