import { cn } from "@/lib/utils";

const BALA_GANESH_IMAGE = "/images/holidays/bala-ganesh.png";

function DussheraBowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-full text-orange-600", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 5.5c3.5-3 7.5-3 11 0" />
      <path d="M7 18.5c3.5 3 7.5 3 11 0" />
      <path d="M18 5.5v13" />
      <path d="M4.5 12h9.5" />
      <path d="M14 12l4.5-3v6L14 12Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function matchesHoliday(name: string, ...keys: string[]) {
  const key = name.toLowerCase();
  return keys.some((token) => key.includes(token));
}

/** Maps a holiday to a festive glyph so each row reads at a glance. */
export function holidayEmoji(name: string): string {
  if (matchesHoliday(name, "diwali", "deepavali")) return "🪔";
  if (matchesHoliday(name, "christmas")) return "🎄";
  if (matchesHoliday(name, "new year")) return "🎉";
  if (matchesHoliday(name, "holi")) return "🎨";
  if (matchesHoliday(name, "independence")) return "🇮🇳";
  if (matchesHoliday(name, "republic")) return "🇮🇳";
  if (matchesHoliday(name, "gandhi")) return "🕊️";
  if (matchesHoliday(name, "eid", "ramzan", "bakrid", "milad", "muharram")) return "🌙";
  if (matchesHoliday(name, "sankranti", "pongal")) return "🌾";
  if (matchesHoliday(name, "ambedkar")) return "📘";
  if (matchesHoliday(name, "buddha")) return "☸️";
  if (matchesHoliday(name, "mahavir")) return "🙏";
  if (matchesHoliday(name, "ram navami")) return "🚩";
  if (matchesHoliday(name, "janmashtami", "krishnaashtami", "krishna")) return "🦚";
  if (matchesHoliday(name, "navratri", "durga")) return "🪔";
  if (matchesHoliday(name, "guru nanak", "gurpurab")) return "🪯";
  if (matchesHoliday(name, "good friday", "easter")) return "✝️";
  if (matchesHoliday(name, "shivaratri", "shivratri")) return "🔱";
  if (matchesHoliday(name, "onam")) return "🌸";
  if (matchesHoliday(name, "raksha", "rakhi")) return "🧵";
  return "📅";
}

function BalaGaneshImage({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative block aspect-square size-full overflow-hidden rounded-2xl bg-amber-50 shadow-sm ring-1 ring-black/5",
        className,
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public holiday asset */}
      <img
        src={BALA_GANESH_IMAGE}
        alt=""
        className="size-full object-cover object-center"
        draggable={false}
      />
    </span>
  );
}

export function HolidayGlyph({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  if (matchesHoliday(name, "ganesh", "vinayaka", "vinavaka", "chavithi", "ganapati")) {
    return <BalaGaneshImage className={className} />;
  }

  if (matchesHoliday(name, "dusshera", "dussehra", "vijayadashami", "dasara")) {
    return <DussheraBowIcon className={className} />;
  }

  return (
    <span
      className={cn("flex size-full items-center justify-center leading-none", className)}
      aria-hidden
    >
      {holidayEmoji(name)}
    </span>
  );
}
