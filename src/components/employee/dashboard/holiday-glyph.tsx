import { cn } from "@/lib/utils";

const BALA_GANESH_IMAGE = "/images/holidays/bala-ganesh.webp";
/** Colorful square portrait; cache-bust when asset is replaced in-place. */
const GANDHI_JAYANTI_IMAGE = "/images/holidays/gandhi.webp?v=3";

const FEST_IMAGE_DIR = "/images/holidays/fest";

function matchesHoliday(name: string, ...keys: string[]) {
  const key = name.toLowerCase();
  return keys.some((token) => key.includes(token));
}

/** "holi" is also a prefix of "holiday", so it must match as a whole word. */
function isHoli(name: string) {
  return /\bholi\b/i.test(name);
}

/**
 * Festival artwork, checked in order. Eid runs before Rama so "Ramadan" is not
 * read as Rama Navami, and Ugadi runs before New Year ("Telugu New Year").
 */
const FESTIVAL_IMAGES: Array<{ keys: string[]; file: string }> = [
  { keys: ["dusshera", "dussehra", "dasara", "vijayadashami", "navratri", "durga"], file: "durga-maa.webp" },
  { keys: ["diwali", "deepavali"], file: "deepavali.webp" },
  { keys: ["sankranti", "pongal"], file: "sankranti.webp" },
  { keys: ["ugadi", "gudi padwa"], file: "ugadi.webp" },
  { keys: ["shivaratri", "sivaratri", "shivratri"], file: "shiva.webp" },
  { keys: ["muharram", "moharrum", "moharram", "ashura"], file: "muharram.webp" },
  { keys: ["eid", "ramzan", "ramadan", "bakrid", "milad"], file: "eid.webp" },
  { keys: ["rama navami", "ram navami", "srirama", "sri rama"], file: "rama.webp" },
  { keys: ["janmashtami", "krishnaashtami", "krishnashtami", "krishna"], file: "krishna.webp" },
  { keys: ["christmas"], file: "christmas.webp" },
  { keys: ["good friday", "easter"], file: "good-friday.webp" },
  { keys: ["independence", "republic"], file: "india-national.webp" },
  { keys: ["may day", "labour", "labor"], file: "may-day.webp" },
  { keys: ["new year"], file: "new-year.webp" },
];

function festivalImage(name: string): string | null {
  if (isHoli(name)) return `${FEST_IMAGE_DIR}/holi.webp`;
  const match = FESTIVAL_IMAGES.find((entry) => matchesHoliday(name, ...entry.keys));
  return match ? `${FEST_IMAGE_DIR}/${match.file}` : null;
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

function HolidayPhotoGlyph({
  src,
  className,
  frameClassName,
  imageClassName,
}: {
  src: string;
  className?: string;
  frameClassName?: string;
  /** Defaults to cover; use contain for portraits that must stay fully visible. */
  imageClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative block aspect-square size-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5",
        frameClassName,
        className,
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public holiday asset; lazy so celebrations never block LCP */}
      <img
        src={src}
        alt=""
        className={cn("size-full object-cover object-center", imageClassName)}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
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
    return (
      <HolidayPhotoGlyph
        src={BALA_GANESH_IMAGE}
        frameClassName="bg-amber-50"
        className={className}
      />
    );
  }

  if (matchesHoliday(name, "gandhi")) {
    return (
      <HolidayPhotoGlyph
        src={GANDHI_JAYANTI_IMAGE}
        frameClassName="bg-gradient-to-b from-amber-50 to-orange-50/80 p-1.5"
        imageClassName="rounded-xl object-contain object-center"
        className={className}
      />
    );
  }

  const festivalSrc = festivalImage(name);
  if (festivalSrc) {
    return (
      <HolidayPhotoGlyph src={festivalSrc} frameClassName="bg-amber-50" className={className} />
    );
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
