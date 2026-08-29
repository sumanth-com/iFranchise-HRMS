import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Wallet,
} from "lucide-react";

/** Decorative HRMS workspace mock for landing mobile/tablet CTA. */

const RAIL_ICONS = [LayoutDashboard, Users, CalendarDays, Wallet] as const;

const TEAM_ROWS = [
  { initials: "AR", name: "Alex Rivera", role: "Engineering", tone: "violet" },
  { initials: "SC", name: "Sophia Chen", role: "Operations", tone: "sky" },
  { initials: "JM", name: "Jordan Miles", role: "People Ops", tone: "emerald" },
] as const;

export function LandingDesktopPreview() {
  return (
    <div className="landing-desktop-experience-preview-wrap">
      <div className="landing-workspace-preview" aria-hidden>
        <div className="landing-workspace-preview-screen">
          <div className="landing-workspace-preview-chrome">
            <span />
            <span />
            <span />
          </div>

          <div className="landing-workspace-preview-body">
            <aside className="landing-workspace-preview-rail">
              {RAIL_ICONS.map((Icon, index) => (
                <span
                  key={index}
                  className={
                    index === 0
                      ? "landing-workspace-preview-rail-item is-active"
                      : "landing-workspace-preview-rail-item"
                  }
                >
                  <Icon className="size-3" strokeWidth={2.4} />
                </span>
              ))}
            </aside>

            <div className="landing-workspace-preview-main">
              <div className="landing-workspace-preview-header">
                <span className="landing-workspace-preview-title">People overview</span>
                <span className="landing-workspace-preview-status">Live</span>
              </div>

              <div className="landing-workspace-preview-kpis">
                <div className="landing-workspace-preview-kpi">
                  <em>Team</em>
                  <strong>128</strong>
                </div>
                <div className="landing-workspace-preview-kpi">
                  <em>Present</em>
                  <strong>96%</strong>
                </div>
                <div className="landing-workspace-preview-kpi">
                  <em>On leave</em>
                  <strong>4</strong>
                </div>
              </div>

              <ul className="landing-workspace-preview-list">
                {TEAM_ROWS.map((row) => (
                  <li key={row.initials} className="landing-workspace-preview-row">
                    <span
                      className={`landing-workspace-preview-avatar tone-${row.tone}`}
                    >
                      {row.initials}
                    </span>
                    <span className="landing-workspace-preview-meta">
                      <strong>{row.name}</strong>
                      <em>{row.role}</em>
                    </span>
                    <span className="landing-workspace-preview-pill">Active</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="landing-workspace-preview-base" />
      </div>
    </div>
  );
}
