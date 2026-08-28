import type { ReactNode } from "react";

type LandingSectionHeadingProps = {
  /** Short label shown in the pill above the title. */
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  /** Wired to the section's aria-labelledby. */
  id: string;
};

/**
 * Shared heading block for every landing section, so the eyebrow, title and
 * subtitle keep one consistent rhythm down the page.
 */
export function LandingSectionHeading({
  eyebrow,
  title,
  subtitle,
  id,
}: LandingSectionHeadingProps) {
  return (
    <div className="landing-section-head">
      <span className="landing-eyebrow">
        <span className="landing-eyebrow-dot" aria-hidden />
        {eyebrow}
      </span>
      <h2 id={id} className="landing-section-title">
        {title}
      </h2>
      <p className="landing-section-copy">{subtitle}</p>
    </div>
  );
}
