"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgePoundSterling,
  Check,
  CircleCheck,
  Clock3,
  Download,
  FileText,
  Lightbulb,
  LockKeyhole,
  MessageCircleMore,
  Paperclip,
  Send,
  UserRoundCheck,
} from "lucide-react";
import { usePortal } from "@/components/portal-provider";
import { Alert, Avatar, EmptyState, PageHeader, RoleLabel, StatusBadge } from "@/components/ui";
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  IDEA_STATUSES,
  isAdmin,
  STATUS_META,
} from "@/lib/domain";

function fileSize(value: number) {
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1000))} KB`;
}

export function IdeaDetail({ ideaId }: { ideaId: string }) {
  const {
    user,
    ideas,
    profiles,
    categories,
    comments,
    events,
    attachments,
    demo,
    addComment,
    updateIdeaStatus,
    assignIdea,
    updateBudget,
    openAttachment,
  } = usePortal();
  const idea = ideas.find((item) => item.id === ideaId);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState(idea?.status ?? "submitted");
  const [statusNote, setStatusNote] = useState("");
  const [assignee, setAssignee] = useState(idea?.assigned_to ?? "");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(idea?.estimated_cost?.toString() ?? "");
  const [approvedAmount, setApprovedAmount] = useState(idea?.approved_amount?.toString() ?? "");
  const [actualSpend, setActualSpend] = useState(idea?.actual_spend?.toString() ?? "");
  const [currency, setCurrency] = useState(idea?.cost_currency ?? "GBP");
  const [budgetPeriod, setBudgetPeriod] = useState(idea?.budget_period ?? "");
  const [budgetNote, setBudgetNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const administrator = isAdmin(user?.role);
  const isAuthor = idea?.submitted_by === user?.id;
  const canDiscuss = administrator || isAuthor;
  const category = categories.find((item) => item.id === idea?.category_id);
  const author = profiles.find((item) => item.id === idea?.submitted_by);
  const currentAssignee = profiles.find((item) => item.id === idea?.assigned_to);
  const ideaComments = comments.filter((comment) => comment.idea_id === ideaId && canDiscuss);
  const ideaAttachments = attachments.filter((attachment) => attachment.idea_id === ideaId && canDiscuss);
  const history = [
    ...events.filter((event) => event.idea_id === ideaId).map((event) => ({ kind: "event" as const, date: event.created_at, event })),
    ...ideaComments.map((comment) => ({ kind: "comment" as const, date: comment.created_at, comment })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  useEffect(() => {
    if (!idea) return;
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      setStatus(idea.status);
      setAssignee(idea.assigned_to ?? "");
      setEstimatedCost(idea.estimated_cost?.toString() ?? "");
      setApprovedAmount(idea.approved_amount?.toString() ?? "");
      setActualSpend(idea.actual_spend?.toString() ?? "");
      setCurrency(idea.cost_currency);
      setBudgetPeriod(idea.budget_period ?? "");
    });
    return () => { current = false; };
  }, [idea]);

  if (!idea) {
    return <EmptyState title="We could not find that idea" description="It may have been removed, or the link may be out of date." action={<Link className="button button-primary button-small" href="/ideas">Back to the idea board</Link>} />;
  }

  async function perform(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(done);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That update could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(async () => {
      await addComment(ideaId, reply);
      setReply("");
    }, "Your reply has been added to the conversation.");
  }

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(async () => {
      await updateIdeaStatus(ideaId, status, statusNote);
      setStatusNote("");
    }, "The idea status has been updated.");
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(() => assignIdea(ideaId, assignee || null), assignee ? "The idea has been assigned." : "The idea is now unassigned.");
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(async () => {
      await updateBudget(ideaId, {
        estimatedCost: estimatedCost.trim() ? Number(estimatedCost) : null,
        costCurrency: currency,
        budgetPeriod: budgetPeriod.trim() || null,
        approvedAmount: approvedAmount.trim() ? Number(approvedAmount) : null,
        actualSpend: actualSpend.trim() ? Number(actualSpend) : null,
        note: budgetNote,
      });
      setBudgetNote("");
      setBudgetOpen(false);
    }, "The budget details have been saved.");
  }

  async function downloadAttachment(attachment: (typeof ideaAttachments)[number]) {
    try {
      const url = await openAttachment(attachment);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else setSuccess("Demo mode stores the attachment name only. Uploads will open here after Supabase is connected.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That file could not be opened.");
    }
  }

  const financeCurrency = idea.cost_currency || "GBP";

  return (
    <>
      <PageHeader
        eyebrow="Idea details"
        title="Follow the idea"
        subtitle="See its story, decisions and next steps in one place."
        action={<Link className="button button-secondary" href={isAuthor ? "/my-ideas" : "/ideas"}><ArrowLeft size={13} /> Back to ideas</Link>}
      />
      {error && <Alert>{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel detail-card">
            <div className="detail-category"><span className="category-color" style={{ background: category?.color ?? "#b77ba1" }} />{category?.name ?? "Uncategorised"}</div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
              <h2 className="detail-title">{idea.title}</h2>
              <StatusBadge status={idea.status} />
            </div>
            <p className="detail-description">{idea.description}</p>
            <div className="detail-byline">
              {author && <span className="meta-author"><Avatar profile={author} size="small" />{author.display_name}</span>}
              <span className="meta-divider" />
              <span>Shared {formatDate(idea.created_at)}</span>
              {currentAssignee && <><span className="meta-divider" /><span>With {currentAssignee.display_name}</span></>}
            </div>
          </section>

          <section className="panel detail-card">
            <div className="panel-head" style={{ padding: "0 0 15px" }}>
              <div><h2 className="panel-title">Idea history</h2><p className="panel-subtitle">Every update, in the order it happened</p></div>
              <span className="panel-count"><Clock3 size={11} /> {history.length} updates</span>
            </div>
            <div className="timeline">
              {history.map((item) => {
                if (item.kind === "comment") {
                  const commenter = profiles.find((profile) => profile.id === item.comment.author_id);
                  return (
                    <div className="timeline-item" key={item.comment.id}>
                      <span className="timeline-icon"><MessageCircleMore size={13} /></span>
                      <div className="timeline-copy">
                        <p><strong>{commenter?.display_name ?? "A member"}</strong> replied</p>
                        <p className="timeline-note">{item.comment.body}</p>
                        <time dateTime={item.date}>{formatDate(item.date, { hour: "numeric", minute: "2-digit" })}</time>
                      </div>
                    </div>
                  );
                }
                const event = item.event;
                const actor = profiles.find((profile) => profile.id === event.actor_id);
                return (
                  <div className="timeline-item" key={event.id}>
                    <span className="timeline-icon">{event.event_type === "submitted" ? <Lightbulb size={13} /> : event.event_type === "assigned" ? <UserRoundCheck size={13} /> : event.event_type === "budget_updated" ? <BadgePoundSterling size={13} /> : <CircleCheck size={13} />}</span>
                    <div className="timeline-copy">
                      {event.event_type === "submitted" ? (
                        <p><strong>{actor?.display_name ?? "A member"}</strong> shared this idea</p>
                      ) : event.event_type === "status_changed" ? (
                        <p><strong>{actor?.display_name ?? "An admin"}</strong> moved it to <StatusBadge status={event.to_status ?? idea.status} compact /></p>
                      ) : event.event_type === "assigned" ? (
                        <p><strong>{actor?.display_name ?? "An admin"}</strong> updated the idea owner{currentAssignee ? ` to ${currentAssignee.display_name}` : ""}</p>
                      ) : (
                        <p><strong>{actor?.display_name ?? "An admin"}</strong> updated the budget details</p>
                      )}
                      {event.note && <p className="timeline-note">{event.note}</p>}
                      <time dateTime={event.created_at}>{formatDate(event.created_at, { hour: "numeric", minute: "2-digit" })}</time>
                    </div>
                  </div>
                );
              })}
            </div>
            {canDiscuss ? (
              <form className="comment-form" onSubmit={submitReply}>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="field-label">Add to the conversation</span>
                  <textarea className="textarea" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Share a question, update or helpful detail…" maxLength={3000} required minLength={2} />
                </label>
                <div className="comment-footer"><span><LockKeyhole size={11} style={{ verticalAlign: "-2px", marginRight: 3 }} />Private to you and the admin team · {reply.length}/3,000</span><button className="button button-primary button-small" type="submit" disabled={busy || reply.trim().length < 2}><Send size={12} /> Send reply</button></div>
              </form>
            ) : (
              <div className="privacy-note" style={{ marginTop: 7 }}><LockKeyhole size={13} /><span>Replies are private to {author?.display_name ?? "the submitter"} and the admin team.</span></div>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="panel detail-side-card">
            <div className="detail-side-head"><h3>At a glance</h3><span className="panel-count"><Clock3 size={10} /> Updated {formatRelativeDate(idea.updated_at)}</span></div>
            <div className="detail-side-label">Current status</div><div className="detail-side-value"><StatusBadge status={idea.status} /></div>
            <div className="detail-side-label">Submitted by</div><div className="detail-side-value">{author?.display_name ?? "Unknown member"}</div>
            <div className="detail-side-label">Idea owner</div><div className="detail-side-value">{currentAssignee?.display_name ?? "Not assigned yet"}</div>
            <div className="detail-side-label">Budget requested</div><div className="detail-side-value">{idea.estimated_cost === null ? "No estimate provided" : formatCurrency(idea.estimated_cost, financeCurrency)}</div>
            {idea.budget_period && <><div className="detail-side-label">Budget period</div><div className="detail-side-value">{idea.budget_period}</div></>}
          </section>

          <section className="panel detail-side-card">
            <div className="detail-side-head"><h3>Supporting files</h3><span className="panel-count"><Paperclip size={10} /> {ideaAttachments.length}</span></div>
            {ideaAttachments.length ? ideaAttachments.map((attachment) => (
              <div className="file-row" key={attachment.id}>
                <span className="file-icon"><FileText size={14} /></span>
                <span className="file-copy"><strong>{attachment.file_name}</strong><span>{fileSize(attachment.size_bytes)}</span></span>
                <button className="file-download" type="button" aria-label={`Open ${attachment.file_name}`} onClick={() => void downloadAttachment(attachment)}><Download size={14} /></button>
              </div>
            )) : canDiscuss ? (
              <p className="field-hint">No files have been added to this idea.</p>
            ) : (
              <div className="privacy-note"><LockKeyhole size={13} /><span>Supporting files are private to the submitter and admin team.</span></div>
            )}
            {demo && ideaAttachments.length > 0 && <p className="field-hint" style={{ marginBottom: 0 }}>Demo files show names only.</p>}
          </section>

          {administrator ? (
            <>
              <section className="panel detail-side-card">
                <div className="detail-side-head"><h3>Review controls</h3><span className="panel-count"><RoleLabel role={user?.role === "super_admin" ? "super_admin" : "admin"} /></span></div>
                <form className="admin-control" onSubmit={saveStatus}>
                  <label htmlFor="status-select">Update status</label>
                  <select id="status-select" className="select-input" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                    {IDEA_STATUSES.map((value) => <option key={value} value={value}>{STATUS_META[value].label}</option>)}
                  </select>
                  <textarea className="textarea" value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Add a decision note (optional)" maxLength={1000} />
                  <button className="button button-primary button-small" type="submit" disabled={busy || status === idea.status}><Check size={12} /> Save status</button>
                </form>
                <form className="admin-control" onSubmit={saveAssignment}>
                  <label htmlFor="assignee-select">Assign to</label>
                  <select id="assignee-select" className="select-input" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                    <option value="">Unassigned</option>
                    {profiles.filter((profile) => isAdmin(profile.role) && profile.is_active !== false).map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}
                  </select>
                  <button className="button button-secondary button-small" type="submit" disabled={busy || (assignee || null) === idea.assigned_to}><UserRoundCheck size={12} /> Save owner</button>
                </form>
              </section>
              <section className="panel detail-side-card">
                <div className="detail-side-head"><h3>Budget tracking</h3><button className="button button-quiet button-small" type="button" onClick={() => setBudgetOpen((open) => !open)}>{budgetOpen ? "Cancel" : "Edit"}</button></div>
                {budgetOpen ? (
                  <form className="admin-control" onSubmit={saveBudget}>
                    <label htmlFor="estimate-input">Estimated cost</label>
                    <div className="control-grid">
                      <input id="estimate-input" className="input" type="number" min="0" step="0.01" value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} placeholder="Estimate" />
                      <select className="select-input" value={currency} onChange={(event) => setCurrency(event.target.value)}><option>GBP</option><option>USD</option><option>EUR</option><option>CAD</option><option>AUD</option></select>
                    </div>
                    <label htmlFor="approved-input">Approved amount</label>
                    <input id="approved-input" className="input" type="number" min="0" step="0.01" value={approvedAmount} onChange={(event) => setApprovedAmount(event.target.value)} placeholder="Not approved" />
                    <label htmlFor="actual-input">Actual spend</label>
                    <input id="actual-input" className="input" type="number" min="0" step="0.01" value={actualSpend} onChange={(event) => setActualSpend(event.target.value)} placeholder="Not recorded" />
                    <label htmlFor="period-input">Budget period</label>
                    <input id="period-input" className="input" value={budgetPeriod} onChange={(event) => setBudgetPeriod(event.target.value)} placeholder="e.g. FY 2026 / 27" maxLength={32} />
                    <textarea className="textarea" value={budgetNote} onChange={(event) => setBudgetNote(event.target.value)} placeholder="Note for the history (optional)" maxLength={1000} />
                    <button className="button button-primary button-small" type="submit" disabled={busy}><Check size={12} /> Save budget</button>
                  </form>
                ) : (
                  <div className="finance-quickview">
                    <div className="detail-fact"><span>Requested</span><strong>{formatCurrency(idea.estimated_cost, financeCurrency)}</strong></div>
                    <div className="detail-fact"><span>Approved</span><strong>{formatCurrency(idea.approved_amount, financeCurrency)}</strong></div>
                    <div className="detail-fact"><span>Actual spend</span><strong>{formatCurrency(idea.actual_spend, financeCurrency)}</strong></div>
                    <p className="field-hint">Keep estimates, approvals and actuals separate for clear reporting.</p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="panel detail-side-card">
              <div className="detail-side-head"><h3>Have a thought?</h3><MessageCircleMore size={14} color="#966984" /></div>
              <p className="field-hint">If you shared this idea, you can reply privately to the review team in the history above.</p>
              {!isAuthor && <Link className="text-link" href="/ideas">Find another idea <ArrowUpRight size={12} /></Link>}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
