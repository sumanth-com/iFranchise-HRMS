export type DailyBoostTone = "team" | "executive";

export type DailyBoostMessage = {
  line1: string;
  line2: string;
};

/**
 * Heartfelt two-line team messages.
 * `open` and `close` are kept near the same length so every day reads evenly.
 */
const TEAM_LINES = [
  {
    open: "your care lifts everyone around you.",
    close: "Today feels warmer with you beside us.",
  },
  {
    open: "your kindness settles the rush of work.",
    close: "Grateful you walked into this day here.",
  },
  {
    open: "you bring a calm that steadies our day.",
    close: "Your presence makes this team feel safe.",
  },
  {
    open: "your heart shows in quiet, honest ways.",
    close: "Thank you for arriving with real warmth.",
  },
  {
    open: "you make hard hours feel a little lighter.",
    close: "We notice the care you give every day.",
  },
  {
    open: "your smile softens the edges of this day.",
    close: "It means more than words can ever say.",
  },
  {
    open: "you remind us why showing up still matters.",
    close: "Grateful for the heart you carry today.",
  },
  {
    open: "your steady care holds this team together.",
    close: "We feel stronger simply because you came.",
  },
  {
    open: "you turn ordinary work into true belonging.",
    close: "Today starts better because you arrived.",
  },
  {
    open: "your warmth reaches past tasks and titles.",
    close: "Thank you for being part of our story.",
  },
  {
    open: "you leave people feeling seen and valued.",
    close: "That quiet care changes this workplace.",
  },
  {
    open: "your presence feels a little like home.",
    close: "Lucky we get to share this path with you.",
  },
  {
    open: "you carry grace into the smallest moments.",
    close: "May today return that kindness to you.",
  },
  {
    open: "your effort comes from a generous heart.",
    close: "We see it, and we deeply appreciate you.",
  },
  {
    open: "you make this team feel human and hopeful.",
    close: "Your honesty sets a gentle, lasting tone.",
  },
  {
    open: "your support means more than empty words.",
    close: "Thank you for standing with us always.",
  },
  {
    open: "you bring hope into quiet early mornings.",
    close: "Even soft days feel fuller with you here.",
  },
  {
    open: "your patience steadies everyone near you.",
    close: "We grow kinder because you are around.",
  },
  {
    open: "you make belonging look natural and easy.",
    close: "This place feels whole when you are in.",
  },
  {
    open: "your spirit softens the grind of the day.",
    close: "Grateful you chose to be here with us.",
  },
  {
    open: "you leave warmth in every quiet hallway.",
    close: "May this day treat your heart gently too.",
  },
  {
    open: "your care is felt deeply, never forced.",
    close: "That sincerity is a gift to this team.",
  },
  {
    open: "you help tired hearts feel less alone.",
    close: "Thank you for the quiet strength you give.",
  },
  {
    open: "your light reaches past roles and routines.",
    close: "Today we celebrate simply having you here.",
  },
] as const;

/**
 * Heartfelt two-line executive messages — warm leadership tone.
 */
const EXEC_LINES = [
  {
    open: "your leadership feels human and steady.",
    close: "People follow the heart you lead with.",
  },
  {
    open: "your calm guides this company with care.",
    close: "Thank you for leading with quiet strength.",
  },
  {
    open: "your vision carries real care for people.",
    close: "The team feels safer under your guidance.",
  },
  {
    open: "you lead with dignity and an open heart.",
    close: "That balance shapes how we work today.",
  },
  {
    open: "your judgment steadies everyone around you.",
    close: "Grateful for the trust you place in us.",
  },
  {
    open: "you make purpose feel personal and true.",
    close: "We rise because you lead with sincerity.",
  },
  {
    open: "your presence settles the room with grace.",
    close: "Leadership like yours feels deeply human.",
  },
  {
    open: "you hold this team with genuine respect.",
    close: "That respect returns to you every day.",
  },
  {
    open: "your courage opens kinder, braver paths.",
    close: "Thank you for choosing people, then pace.",
  },
  {
    open: "you lead without ever losing your kindness.",
    close: "That kindness is this company's true edge.",
  },
  {
    open: "your clarity comforts the whole team here.",
    close: "We move with confidence because of you.",
  },
  {
    open: "you carry weight with soft, steady hands.",
    close: "Strong and gentle — that is rare leadership.",
  },
  {
    open: "your care reaches every corridor and desk.",
    close: "People feel seen when you walk the floor.",
  },
  {
    open: "you turn pressure into shared purpose here.",
    close: "Today, we follow the example you set.",
  },
  {
    open: "your faith in us lifts the work we do.",
    close: "We will honor that faith with our best.",
  },
  {
    open: "you make ambition feel humane and worthy.",
    close: "Progress matters more with heart like yours.",
  },
  {
    open: "your steadiness is shelter for this team.",
    close: "Thank you for leading with quiet resolve.",
  },
  {
    open: "you keep people before process, always.",
    close: "That priority makes this place worth it.",
  },
  {
    open: "your words land with sincerity and care.",
    close: "We listen because we trust your intent.",
  },
  {
    open: "you build belonging from the very top.",
    close: "A culture of care starts with leaders like you.",
  },
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function dayIndex(referenceDate: string) {
  const trimmed = referenceDate.trim();
  const ms = Date.parse(`${trimmed}T12:00:00`);
  if (!Number.isNaN(ms)) return Math.floor(ms / 86_400_000);
  const fallback = Date.parse(`${new Date().toISOString().slice(0, 10)}T12:00:00`);
  return Math.floor(fallback / 86_400_000);
}

/** One heartfelt two-line message per person per calendar day. */
export function resolveDailyBoostMessage(options: {
  tone: DailyBoostTone;
  referenceDate: string;
  personKey: string;
  name: string;
}): DailyBoostMessage {
  const pool = options.tone === "executive" ? EXEC_LINES : TEAM_LINES;
  const key =
    options.personKey.trim().toLowerCase() ||
    options.name.trim().toLowerCase() ||
    "guest";
  const start = hashString(key) % pool.length;
  const index = (start + dayIndex(options.referenceDate)) % pool.length;
  const row = pool[index] ?? pool[0]!;
  return {
    line1: `${options.name}, ${row.open}`,
    line2: row.close,
  };
}

/** Flat string for callers that still expect a single line. */
export function resolveDailyBoostLine(options: {
  tone: DailyBoostTone;
  referenceDate: string;
  personKey: string;
  name: string;
}) {
  const message = resolveDailyBoostMessage(options);
  return `${message.line1} ${message.line2}`;
}

export const DAILY_BOOST_POOL_SIZE = {
  team: TEAM_LINES.length,
  executive: EXEC_LINES.length,
};
