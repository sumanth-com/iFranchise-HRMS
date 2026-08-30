/** Reuses landing hero atmosphere for What's New empty state. */

export function WhatsNewHeroBackground() {
  return (
    <div className="landing-whats-new-hero-bg" aria-hidden>
      <div className="landing-hero-bg-base" />
      <div className="landing-hero-bg-glow landing-hero-bg-glow--primary" />
      <div className="landing-hero-bg-glow landing-hero-bg-glow--secondary" />
      <div className="landing-hero-bg-glow landing-hero-bg-glow--accent" />
      <div className="landing-hero-bg-fade" />
    </div>
  );
}
