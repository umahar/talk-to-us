import type { ReactNode } from "react";
import {
  Bell,
  Check,
  CircleAlert,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import type { IdeaStatus, Profile, UserRole } from "@/lib/domain";
import { getInitials, STATUS_META } from "@/lib/domain";

export function BrandLockup({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand-lockup${light ? " brand-light" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <Lightbulb size={19} strokeWidth={2.2} />
      </span>
      <span className="brand-copy">
        <span className="brand-name">talk to us</span>
        <span className="brand-tagline">Ideas, made visible</span>
      </span>
    </div>
  );
}

const avatarColors = ["", "avatar-peach", "avatar-blue", "avatar-lilac", "avatar-dark"];

export function Avatar({ profile, size = "regular" }: { profile: Profile; size?: "regular" | "small" | "large" }) {
  const color = avatarColors[Math.abs(profile.display_name.charCodeAt(0)) % avatarColors.length];
  return (
    <span className={`avatar ${color}${size === "small" ? " mini-avatar" : ""}${size === "large" ? " avatar-large" : ""}`} aria-label={profile.display_name}>
      {getInitials(profile.display_name)}
    </span>
  );
}

export function StatusBadge({ status, compact = false }: { status: IdeaStatus; compact?: boolean }) {
  const meta = STATUS_META[status];
  return <span className={`status-pill status-${meta.tone}${compact ? " status-compact" : ""}`}>{meta.label}</span>;
}

export function RoleLabel({ role }: { role: UserRole }) {
  const labels: Record<UserRole, string> = {
    user: "Member",
    admin: "Admin",
    super_admin: "Super admin",
  };
  return <span className={`role-badge role-${role}`}>{labels[role]}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-copy">
        {eyebrow && <p className="page-kicker">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="page-head-actions">{action}</div>}
    </header>
  );
}

export function PanelHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="panel-head">
      <div>
        <h2 className="panel-title">{title}</h2>
        {subtitle && <p className="panel-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-mark"><Sparkles size={19} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  const Icon = tone === "success" ? Check : CircleAlert;
  return (
    <div className={`error-banner${tone === "success" ? " success-banner" : ""}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={15} />
      <span>{children}</span>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading Talk To Us">
      <span className="loading-mark"><LoaderCircle size={20} className="spin" /></span>
    </div>
  );
}

export function DemoPill() {
  return <span className="demo-chip">Demo workspace</span>;
}

export function NotificationButton() {
  return (
    <button className="icon-button" type="button" aria-label="Email notifications are sent to the people in each idea discussion" title="Email notifications are sent to the people in each idea discussion">
      <Bell size={15} />
      <span className="notification-dot" aria-hidden="true" />
    </button>
  );
}

export function PrivacyLock() {
  return <LockKeyhole size={13} aria-hidden="true" />;
}
