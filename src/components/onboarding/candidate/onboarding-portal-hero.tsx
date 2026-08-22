type OnboardingPortalHeroProps = {
  fullName: string;
  completionPercent: number;
};

export function OnboardingPortalHero({
  fullName,
  completionPercent,
}: OnboardingPortalHeroProps) {
  return (
    <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3.5 text-white sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Welcome aboard
          </p>
          <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight sm:text-xl">
            {fullName}
          </h1>
        </div>

        <div className="flex min-w-[10rem] shrink-0 flex-col justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 backdrop-blur-sm sm:min-w-[12rem] sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Overall progress
            </p>
            <p className="text-sm font-semibold tabular-nums leading-none text-white">
              {completionPercent}%
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
