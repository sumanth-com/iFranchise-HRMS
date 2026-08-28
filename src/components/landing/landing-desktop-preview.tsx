/** Decorative HRMS desktop mockup for landing mobile/tablet CTA. */
export function LandingDesktopPreview() {
  return (
    <div className="desktop-preview landing-desktop-experience-preview" aria-hidden>
      <div className="desktop-preview-window">
        <div className="desktop-preview-bar">
          <span className="desktop-preview-dot" />
          <span className="desktop-preview-dot" />
          <span className="desktop-preview-dot" />
        </div>

        <div className="desktop-preview-body">
          <div className="desktop-preview-rail">
            {[0, 1, 2, 3].map((item) => (
              <span key={item} className="desktop-preview-rail-item" />
            ))}
          </div>

          <div className="desktop-preview-content">
            <div className="desktop-preview-stats">
              {[0, 1, 2].map((item) => (
                <div key={item} className="desktop-preview-stat">
                  <span className="desktop-preview-stat-label" />
                  <span className="desktop-preview-stat-value" />
                </div>
              ))}
            </div>

            <div className="desktop-preview-chart">
              {[0, 1, 2, 3, 4, 5, 6].map((item) => (
                <span
                  key={item}
                  className="desktop-preview-chart-bar"
                  style={{ ["--bar-index" as string]: item }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="desktop-preview-sheen" />
      </div>

      <div className="desktop-preview-stand" />
    </div>
  );
}
