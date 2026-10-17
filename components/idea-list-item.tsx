import Link from "next/link";
import {
  Leaf,
  Lightbulb,
  MonitorCog,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Category, Idea, Profile } from "@/lib/domain";
import { formatCurrency, formatRelativeDate } from "@/lib/domain";
import { Avatar, StatusBadge } from "@/components/ui";

function categoryIcon(name: string): ReactNode {
  const value = name.toLowerCase();
  if (value.includes("sustain")) return <Leaf size={16} strokeWidth={1.8} />;
  if (value.includes("culture")) return <UsersRound size={16} strokeWidth={1.8} />;
  if (value.includes("tool")) return <MonitorCog size={16} strokeWidth={1.8} />;
  if (value.includes("way") || value.includes("process")) return <Workflow size={16} strokeWidth={1.8} />;
  return <Lightbulb size={16} strokeWidth={1.8} />;
}

function categoryTone(name: string) {
  const value = name.toLowerCase();
  if (value.includes("culture")) return "warm";
  if (value.includes("tool")) return "blue";
  if (value.includes("way") || value.includes("process")) return "purple";
  if (value.includes("sustain")) return "gold";
  return "";
}

export function IdeaListItem({
  idea,
  profiles,
  categories,
  commentCount,
  showAssignee = false,
}: {
  idea: Idea;
  profiles: Profile[];
  categories: Category[];
  commentCount?: number;
  showAssignee?: boolean;
}) {
  const category = categories.find((item) => item.id === idea.category_id);
  const author = profiles.find((item) => item.id === idea.submitted_by);
  const assignee = idea.assigned_to ? profiles.find((item) => item.id === idea.assigned_to) : null;
  const tone = categoryTone(category?.name ?? "");
  const budget = idea.estimated_cost !== null ? formatCurrency(idea.estimated_cost, idea.cost_currency) : null;

  return (
    <article className="idea-row">
      <div className="idea-row-main">
        <span className={`idea-category-mark ${tone}`} aria-hidden="true">{categoryIcon(category?.name ?? "")}</span>
        <div className="idea-row-copy">
          <Link className="idea-row-title" href={`/ideas/${idea.id}`}>{idea.title}</Link>
          <p className="idea-row-description">{idea.description}</p>
          <div className="idea-row-meta">
            <span className="meta-author">
              {author ? <Avatar profile={author} size="small" /> : <span className="mini-avatar">?</span>}
              {author?.display_name ?? "Unknown member"}
            </span>
            <span className="meta-divider" />
            <span>{category?.name ?? "Uncategorised"}</span>
            <span className="meta-divider" />
            <span>{formatRelativeDate(idea.created_at)}</span>
            {typeof commentCount === "number" && commentCount > 0 && <>
              <span className="meta-divider" />
              <span>{commentCount} {commentCount === 1 ? "reply" : "replies"}</span>
            </>}
          </div>
        </div>
      </div>
      <div className="idea-row-side">
        <StatusBadge status={idea.status} />
        {showAssignee ? (
          <span className="idea-cost">{assignee ? `With ${assignee.display_name.split(" ")[0]}` : "Unassigned"}</span>
        ) : budget ? (
          <span className="idea-cost">{budget}</span>
        ) : (
          <span className="idea-cost"><Sparkles size={11} /> Idea</span>
        )}
      </div>
    </article>
  );
}
