import { cn } from "@/lib/utils";

function VinayakaElephantIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-5 text-amber-600", className)}
      fill="currentColor"
    >
      {/* ears */}
      <ellipse cx="5.5" cy="11" rx="3.2" ry="4.2" opacity="0.9" />
      <ellipse cx="18.5" cy="11" rx="3.2" ry="4.2" opacity="0.9" />
      {/* head */}
      <circle cx="12" cy="11.5" r="5.8" />
      {/* crown / tika */}
      <path d="M9.2 6.8 10.4 8.6 12 7.4l1.6 1.2 1.2-1.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* eyes */}
      <circle cx="9.6" cy="10.8" r="0.9" fill="#fff" />
      <circle cx="14.4" cy="10.8" r="0.9" fill="#fff" />
      <circle cx="9.8" cy="10.9" r="0.35" fill="#78350f" />
      <circle cx="14.6" cy="10.9" r="0.35" fill="#78350f" />
      {/* trunk */}
      <path d="M12 13.2c-.4 0-.8.3-.8.8 0 1.2.3 2.4.8 3.5.2.4.6.7 1 .7s.8-.3 1-.7c.5-1.1.8-2.3.8-3.5 0-.5-.4-.8-.8-.8h-1.2Z" />
    </svg>
  );
}

function DussheraBowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-5 text-orange-600", className)}
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

export function HolidayGlyph({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  if (matchesHoliday(name, "ganesh", "vinayaka", "chavithi", "ganapati")) {
    return <VinayakaElephantIcon className={className} />;
  }

  if (matchesHoliday(name, "dusshera", "dussehra", "vijayadashami", "dasara")) {
    return <DussheraBowIcon className={className} />;
  }

  return (
    <span className={cn("text-lg leading-none", className)} aria-hidden>
      {holidayEmoji(name)}
    </span>
  );
}
