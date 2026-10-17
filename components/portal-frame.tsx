"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  FolderHeart,
  Gauge,
  Lightbulb,
  ListFilter,
  LogOut,
  Menu,
  MessageCircleMore,
  Settings2,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePortal } from "@/components/portal-provider";
import { Avatar, BrandLockup, DemoPill, LoadingScreen, NotificationButton } from "@/components/ui";
import { isAdmin } from "@/lib/domain";

const baseNavigation = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/ideas", label: "Explore ideas", icon: Lightbulb },
  { href: "/my-ideas", label: "My submissions", icon: FolderHeart },
];

export function PortalFrame({ children }: { children: ReactNode }) {
  const { initialized, user, demo, ideas, signOut, error, clearError } = usePortal();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const submittedCount = ideas.filter((idea) => idea.status === "submitted").length;

  useEffect(() => {
    if (initialized && !user) router.replace("/auth");
  }, [initialized, router, user]);

  if (!initialized || !user) return <LoadingScreen />;

  const navigation: { href: string; label: string; icon: LucideIcon; badge?: number }[] = [
    ...baseNavigation,
    ...(isAdmin(user.role)
      ? [
          { href: "/admin", label: "Admin desk", icon: ListFilter, badge: submittedCount },
          { href: "/analytics", label: "Reporting", icon: BarChart3 },
        ]
      : []),
    ...(user.role === "super_admin"
      ? [{ href: "/settings", label: "Access & settings", icon: Settings2 }]
      : []),
  ];

  const pageLabel = navigation.find((item) => item.href === pathname)?.label
    ?? (pathname === "/ideas/new" ? "Share an idea" : pathname.startsWith("/ideas/") ? "Idea details" : "Workspace");

  async function handleSignOut() {
    await signOut();
    router.replace("/auth");
  }

  return (
    <div className="app-shell">
      {menuOpen && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar${menuOpen ? " mobile-open" : ""}`} aria-label="Main navigation">
        <BrandLockup light />
        <p className="nav-section-label">Workspace</p>
        <nav className="nav-list">
          {navigation.slice(0, 3).map(({ href, label, icon: Icon }) => (
            <Link key={href} className={`nav-link${pathname === href ? " active" : ""}`} href={href} onClick={() => setMenuOpen(false)}>
              <Icon size={16} strokeWidth={1.9} />
              <span>{label}</span>
              {href === "/my-ideas" && <span className="nav-pill">{ideas.filter((idea) => idea.submitted_by === user.id).length}</span>}
            </Link>
          ))}
        </nav>
        {isAdmin(user.role) && (
          <>
            <p className="nav-section-label" style={{ marginTop: 27 }}>Manage</p>
            <nav className="nav-list">
              {navigation.slice(3).map(({ href, label, icon: Icon, badge }) => (
                <Link key={href} className={`nav-link${pathname === href ? " active" : ""}`} href={href} onClick={() => setMenuOpen(false)}>
                  <Icon size={16} strokeWidth={1.9} />
                  <span>{label}</span>
                  {badge ? <span className="nav-pill">{badge}</span> : null}
                </Link>
              ))}
            </nav>
          </>
        )}
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <span className="sidebar-note-mark"><Sparkles size={13} /></span>
          <strong>Small ideas add up.</strong>
          <p>Every thoughtful suggestion helps make work a little better.</p>
        </div>
        <div className="sidebar-bottom">
          <button className="profile-switcher" type="button" onClick={handleSignOut} title={demo ? "Switch demo account" : "Sign out"}>
            <Avatar profile={user} />
            <span className="profile-copy">
              <strong>{user.display_name}</strong>
              <span>{user.role === "super_admin" ? "Super admin" : user.role === "admin" ? "Administrator" : "Community member"}</span>
            </span>
            {demo ? <ArrowRight size={14} /> : <LogOut size={14} />}
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
              <Menu size={16} />
            </button>
            <span className="eyebrow">Ideas, made visible</span>
            <span className="breadcrumb">/</span>
            <span className="breadcrumb">{pageLabel}</span>
          </div>
          <div className="topbar-actions">
            {demo && <DemoPill />}
            <NotificationButton />
            <div className="user-chip">
              <Avatar profile={user} />
              <span className="profile-copy">
                <strong style={{ color: "#43574a", fontSize: 10 }}>{user.display_name}</strong>
                <span style={{ color: "#94a098", fontSize: 8 }}>{user.role === "user" ? "Member" : user.role === "admin" ? "Admin" : "Super admin"}</span>
              </span>
            </div>
          </div>
        </header>
        <div className="page-wrap">
          {error && (
            <div className="error-banner" role="alert">
              <MessageCircleMore size={15} />
              <span>{error}</span>
              <button className="button button-quiet button-small" type="button" onClick={clearError} aria-label="Dismiss error"><X size={13} /></button>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
