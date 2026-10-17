"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FilePlus2, Search, SlidersHorizontal } from "lucide-react";
import { usePortal } from "@/components/portal-provider";
import { IdeaListItem } from "@/components/idea-list-item";
import { EmptyState, PageHeader } from "@/components/ui";
import { filterIdeas, IDEA_STATUSES, STATUS_META, type IdeaStatus } from "@/lib/domain";

const boardFilters: { value: "all" | "active" | "complete" | "closed"; label: string }[] = [
  { value: "all", label: "All ideas" },
  { value: "active", label: "In progress" },
  { value: "complete", label: "Completed" },
  { value: "closed", label: "Closed out" },
];

export function IdeasPage({ mine = false }: { mine?: boolean }) {
  const { user, ideas, profiles, categories, comments, demo } = usePortal();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<(typeof boardFilters)[number]["value"]>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<"all" | IdeaStatus>("all");
  const [sort, setSort] = useState("newest");
  const base = mine ? ideas.filter((idea) => idea.submitted_by === user?.id) : ideas;
  const filtered = useMemo(() => {
    const byBasicFilters = filterIdeas(base, { query, categoryId, status });
    const byGroup = group === "all"
      ? byBasicFilters
      : byBasicFilters.filter((idea) => STATUS_META[idea.status].group === group);
    return byGroup.sort((a, b) => sort === "oldest"
      ? a.created_at.localeCompare(b.created_at)
      : sort === "updated"
        ? b.updated_at.localeCompare(a.updated_at)
        : b.created_at.localeCompare(a.created_at));
  }, [base, categoryId, group, query, sort, status]);
  const visibleComments = comments.filter((comment) => {
    const idea = ideas.find((item) => item.id === comment.idea_id);
    return idea?.submitted_by === user?.id || user?.role === "admin" || user?.role === "super_admin";
  });

  return (
    <>
      <PageHeader
        eyebrow={mine ? "Your space" : "The community board"}
        title={mine ? "Your ideas" : "Ideas from everyone"}
        subtitle={mine
          ? "Follow your submissions from the first note to the final outcome."
          : "Browse what people are thinking about, and see where each idea is in its journey."}
        action={<Link className="button button-primary" href="/ideas/new"><FilePlus2 size={14} /> Share an idea</Link>}
      />

      <section className="panel board-card">
        <div className="board-head">
          <div className="board-head-left">
            <span className="stat-icon"><SlidersHorizontal size={14} /></span>
            <div><h2>{mine ? "Your submissions" : "Idea board"}</h2><p>{filtered.length} {filtered.length === 1 ? "idea" : "ideas"} {mine ? "from you" : "shared by the community"}</p></div>
          </div>
          <div className="filters-row" aria-label="Filter idea stage">
            {boardFilters.map((filter) => (
              <button
                className={`filter-chip${group === filter.value ? " active" : ""}`}
                key={filter.value}
                type="button"
                onClick={() => setGroup(filter.value)}
                aria-pressed={group === filter.value}
              >
                {filter.label}
                {filter.value === "all" && <span>{base.length}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="board-toolbar">
          <label className="search-box"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ideas or descriptions" aria-label="Search ideas or descriptions" /></label>
          <label className="sr-only" htmlFor="category-filter">Filter by category</label>
          <select id="category-filter" className="select-control" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="all">All categories</option>
            {categories.filter((category) => category.is_active).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="status-filter">Filter by status</label>
          <select id="status-filter" className="select-control" value={status} onChange={(event) => setStatus(event.target.value as "all" | IdeaStatus)}>
            <option value="all">All statuses</option>
            {IDEA_STATUSES.map((value) => <option key={value} value={value}>{STATUS_META[value].label}</option>)}
          </select>
          <label className="sr-only" htmlFor="sort-ideas">Sort ideas</label>
          <select id="sort-ideas" className="select-control" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="updated">Recently updated</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div className="idea-list idea-list-full">
          {filtered.length ? filtered.map((idea) => (
            <IdeaListItem
              key={idea.id}
              idea={idea}
              profiles={profiles}
              categories={categories}
              commentCount={visibleComments.filter((comment) => comment.idea_id === idea.id).length}
            />
          )) : (
            <EmptyState
              title={mine ? "Your idea board is waiting" : "No ideas match those filters"}
              description={mine ? "When you share an idea, you can follow every conversation and decision here." : "Try changing your search or filters, or be the first to share a new thought."}
              action={mine || ideas.length === 0 ? <Link className="button button-primary button-small" href="/ideas/new"><FilePlus2 size={13} /> Share an idea</Link> : undefined}
            />
          )}
        </div>
        {demo && <div className="panel-divider" />}
        {demo && <div style={{ display: "flex", justifyContent: "center", padding: 11, color: "#a49aa3", fontSize: 8 }}>Demo board · changes stay in this browser</div>}
      </section>
    </>
  );
}
