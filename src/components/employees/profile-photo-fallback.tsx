import { UserRound } from "lucide-react";

type ProfilePhotoFallbackProps = {
  label: string;
  className?: string;
};

export function ProfilePhotoFallback({ label, className }: ProfilePhotoFallbackProps) {
  return (
    <div
      className={
        className ??
        "absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600"
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_42%)]" />
      <div className="pointer-events-none absolute bottom-[-18%] left-1/2 h-[55%] w-[70%] -translate-x-1/2 rounded-full bg-black/25 blur-2xl" />
      <span className="relative flex aspect-square w-[42%] max-w-[4.75rem] items-center justify-center rounded-full bg-white/15 shadow-[0_10px_24px_rgba(46,16,101,0.45)] ring-2 ring-white/25">
        <UserRound
          className="size-[58%] text-white drop-shadow-[0_6px_10px_rgba(0,0,0,0.28)]"
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
