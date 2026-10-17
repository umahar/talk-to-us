"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePortal } from "@/components/portal-provider";
import { Alert, Avatar, EmptyState, PageHeader, RoleLabel } from "@/components/ui";
import { type UserRole } from "@/lib/domain";
import { Bell, Check, FolderHeart, LockKeyhole, Plus, ShieldCheck, UserRoundCog } from "lucide-react";

export function SettingsPage() {
  const {
    user,
    profiles,
    categories,
    demo,
    updateUser,
    createCategory,
    setCategoryActive,
  } = usePortal();
  const [newCategory, setNewCategory] = useState("");
  const [busyId, setBusyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (user?.role !== "super_admin") {
    return <EmptyState title="Super admin access only" description="Only a super admin can change user roles, categories and workspace settings." action={<Link className="button button-primary button-small" href="/">Back to overview</Link>} />;
  }

  async function changeAccess(profileId: string, role: UserRole, active: boolean) {
    setBusyId(profileId);
    setError("");
    setSuccess("");
    try {
      if (profileId === user?.id && (!active || role !== "super_admin")) {
        throw new Error("Keep at least one active super admin so the workspace can always be managed.");
      }
      await updateUser(profileId, role, active);
      setSuccess("Access settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The access change could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await createCategory(newCategory);
      setNewCategory("");
      setSuccess("Your new category is ready to use.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The category could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(categoryId: string, active: boolean) {
    setBusyId(categoryId);
    setError("");
    setSuccess("");
    try {
      await setCategoryActive(categoryId, active);
      setSuccess(active ? "Category is available again." : "Category has been archived.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The category could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace settings"
        title="The people behind the ideas"
        subtitle="Keep access thoughtful, and make sure every idea has a home."
        action={<span className="panel-count"><ShieldCheck size={12} /> Super admin</span>}
      />
      {error && <Alert>{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="settings-grid">
        <nav className="panel settings-nav" aria-label="Settings sections">
          <a className="settings-nav-link active" href="#people"><UserRoundCog size={14} /> People & access</a>
          <a className="settings-nav-link" href="#categories"><FolderHeart size={14} /> Idea categories</a>
          <a className="settings-nav-link" href="#notifications"><Bell size={14} /> Notifications</a>
        </nav>

        <div className="settings-main-column">
          <section className="panel settings-content" id="people">
            <div className="settings-section-title"><span className="stat-icon"><UserRoundCog size={15} /></span><div><h2>People & access</h2><p>Anyone can join with a verified email. Admin roles are assigned here.</p></div></div>
            <div className="table-scroll">
              <table className="user-table">
                <thead><tr><th>Person</th><th>Role</th><th>Access</th><th>Joined</th><th>Manage</th></tr></thead>
                <tbody>
                  {[...profiles].sort((a, b) => a.display_name.localeCompare(b.display_name)).map((profile) => {
                    const active = profile.is_active !== false;
                    const locked = profile.id === user.id;
                    return (
                      <tr key={profile.id}>
                        <td><div className="user-cell"><Avatar profile={profile} /><div><strong>{profile.display_name}{locked ? " (you)" : ""}</strong><span>{profile.email ?? (profile.role === "user" ? "Community member" : "Workspace administrator")}</span></div></div></td>
                        <td><RoleLabel role={profile.role} /></td>
                        <td><span className={active ? "active-label" : "inactive-label"}>{active ? "Active" : "Paused"}</span></td>
                        <td>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(profile.created_at))}</td>
                        <td>
                          <div className="access-controls">
                            <label className="sr-only" htmlFor={`role-${profile.id}`}>Role for {profile.display_name}</label>
                            <select
                              id={`role-${profile.id}`}
                              className="table-select"
                              value={profile.role}
                              disabled={busyId === profile.id || locked}
                              onChange={(event) => void changeAccess(profile.id, event.target.value as UserRole, active)}
                            >
                              <option value="user">Member</option><option value="admin">Admin</option><option value="super_admin">Super admin</option>
                            </select>
                            <button className={`access-toggle${active ? " active" : ""}`} type="button" title={active ? "Pause account" : "Reactivate account"} aria-label={`${active ? "Pause" : "Reactivate"} ${profile.display_name}`} disabled={busyId === profile.id || locked} onClick={() => void changeAccess(profile.id, profile.role, !active)}><span /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="settings-note"><LockKeyhole size={13} /><span>Members can submit ideas, browse the board and see submitter names. Admins manage ideas; super admins manage access.</span></div>
          </section>

          <section className="panel settings-content" id="categories">
            <div className="settings-section-title"><span className="stat-icon icon-purple"><FolderHeart size={15} /></span><div><h2>Idea categories</h2><p>Use a small set of clear categories to keep browsing and reporting useful.</p></div></div>
            <div className="category-settings-list">
              {categories.map((category) => (
                <div className={`category-settings-item${category.is_active ? "" : " archived"}`} key={category.id}>
                  <span className="category-color" style={{ background: category.color }} />
                  <span className="category-name">{category.name}</span>
                  <span className="category-state">{category.is_active ? "Available" : "Archived"}</span>
                  <button className="button button-secondary button-small" type="button" disabled={busyId === category.id} onClick={() => void toggleCategory(category.id, !category.is_active)}>{category.is_active ? "Archive" : "Restore"}</button>
                </div>
              ))}
            </div>
            <form className="settings-form" onSubmit={addCategory}>
              <label className="sr-only" htmlFor="new-category">New category name</label>
              <input id="new-category" className="input" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Customer experience" minLength={2} maxLength={48} required />
              <button className="button button-primary" type="submit" disabled={busy}><Plus size={14} /> Add category</button>
            </form>
          </section>

          <section className="panel settings-content" id="notifications">
            <div className="settings-section-title"><span className="stat-icon icon-coral"><Bell size={15} /></span><div><h2>Email notifications</h2><p>Keep the right people in the loop without sending updates to every board viewer.</p></div></div>
            <div className="notification-setting-row"><span className="notification-setting-icon"><Check size={14} /></span><span><strong>Submitter updates</strong><span>Send status changes and admin replies to the person who submitted the idea.</span></span><span className="setting-on">On</span></div>
            <div className="notification-setting-row"><span className="notification-setting-icon"><Check size={14} /></span><span><strong>Admin updates</strong><span>Notify admins about new ideas and replies from submitters.</span></span><span className="setting-on">On</span></div>
            <div className="settings-note"><Bell size={13} /><span>{demo ? "Demo mode keeps notifications in the browser. " : ""}Live email delivery requires a Resend API key and verified sender address in the server environment.</span></div>
          </section>
          {demo && <div className="settings-context-note"><span className="demo-chip">Demo workspace</span><span>Role and category changes are saved in this browser only.</span></div>}
        </div>
      </div>
    </>
  );
}
