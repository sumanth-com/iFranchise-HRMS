/** Decorative alive robot for What's New empty state — CSS-only, no image assets. */

export function WhatsNewRobot() {
  return (
    <div className="whats-new-robot" aria-hidden>
      <div className="whats-new-robot-float">
        <div className="whats-new-robot-head">
          <span className="whats-new-robot-disc whats-new-robot-disc--left" />
          <span className="whats-new-robot-disc whats-new-robot-disc--right" />

          <div className="whats-new-robot-face">
            <span className="whats-new-robot-cheek whats-new-robot-cheek--left" />
            <span className="whats-new-robot-cheek whats-new-robot-cheek--right" />
            <span className="whats-new-robot-eye">
              <span className="whats-new-robot-eye-core" />
            </span>
            <span className="whats-new-robot-eye">
              <span className="whats-new-robot-eye-core" />
            </span>
            <span className="whats-new-robot-smile" />
          </div>
        </div>

        <div className="whats-new-robot-neck" />

        <div className="whats-new-robot-body">
          <span className="whats-new-robot-limb whats-new-robot-limb--left" />
          <span className="whats-new-robot-chest" />
          <span className="whats-new-robot-limb whats-new-robot-limb--right" />
        </div>

        <div className="whats-new-robot-legs">
          <span className="whats-new-robot-leg" />
          <span className="whats-new-robot-leg" />
        </div>
      </div>

      <div className="whats-new-robot-shadow" />
    </div>
  );
}
