export type DailyBoostTone = "team" | "executive";

/** All 9 chars — keeps every team line the same length. */
const TEAM_WHO = [
  "this crew",
  "this team",
  "this room",
  "this hall",
  "our group",
  "our squad",
  "the floor",
  "this desk",
] as const;

/** All 8 chars. */
const TEAM_FEEL = [
  "brighter",
  "stronger",
  "steadier",
  "composed",
  "grounded",
  "inspired",
  "complete",
  "grateful",
] as const;

/** All 16 chars. */
const TEAM_WHEN = [
  "when you walk in",
  "when you show up",
  "with you in here",
  "by your side now",
  "as you walked in",
  "as you logged on",
  "while you are in",
  "next to us today",
] as const;

/** All 20 chars. */
const EXEC_LEAD = [
  "Aap ho the backbone.",
  "System aap pe chale.",
  "Aap the pillar, aaj.",
  "Lead aap, speed hum.",
  "Aapki spine pe fire.",
  "Aapke hold pe chalo.",
  "Aap ho backbone aaj.",
  "Soch aapki, kaam ab.",
  "Engine aapka, chalo.",
  "Team follows aap ab.",
  "Aap ho — hum strong.",
  "Tum iska pillar ho —",
  "Company aap par hai.",
  "Vision aapka, chalo.",
  "Poori company aapki.",
  "Team aapke saath ab.",
  "Dum aapka, chalo ab.",
  "Aap captain, chalo —",
  "Haath aapke, result.",
  "Strength aapki, aaj.",
] as const;

/** All 21 chars. */
const EXEC_PUSH = [
  "Aaj crack karke jao —",
  "Humko productive karo",
  "Aaj aage le ke chalo.",
  "Team ko sharp rakhna.",
  "Speed do, clarity do.",
  "Aaj ka din jeetna hai",
  "Lead tight, move fast",
  "Make us sharp aaj hi.",
  "Pillar banke khade ho",
  "Focus tight, go hard.",
  "Crack it — next gear.",
  "Productive mode on ab",
  "Aaj fire on karke jao",
  "Keep us moving aaj hi",
  "Aaj results nikal do.",
  "Chalo crack this day.",
  "Aaj productive raho —",
  "Humein aage le jao ab",
  "Team ko fire do aaj —",
  "Prove it, aaj dikhao.",
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function cartesian3<A extends string, B extends string, C extends string>(
  a: readonly A[],
  b: readonly B[],
  c: readonly C[],
  join: (left: A, mid: B, right: C) => string,
) {
  const out: string[] = [];
  for (const left of a) {
    for (const mid of b) {
      for (const right of c) {
        out.push(join(left, mid, right));
      }
    }
  }
  return out;
}

function cartesian2<A extends string, B extends string>(
  a: readonly A[],
  b: readonly B[],
  join: (left: A, right: B) => string,
) {
  const out: string[] = [];
  for (const left of a) {
    for (const right of b) {
      out.push(join(left, right));
    }
  }
  return out;
}

const TEAM_BODIES = cartesian3(
  TEAM_WHO,
  TEAM_FEEL,
  TEAM_WHEN,
  (who, feel, when) => `${who} feels ${feel} ${when}.`,
);

const EXEC_BODIES = cartesian2(
  EXEC_LEAD,
  EXEC_PUSH,
  (lead, push) => `${lead} ${push}`,
);

function dayIndex(referenceDate: string) {
  const ms = Date.parse(`${referenceDate}T00:00:00`);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 86_400_000);
}

/** One unique line per person per day. Does not repeat until the pool wraps. */
export function resolveDailyBoostLine(options: {
  tone: DailyBoostTone;
  referenceDate: string;
  personKey: string;
  name: string;
}) {
  const pool = options.tone === "executive" ? EXEC_BODIES : TEAM_BODIES;
  const start = hashString(options.personKey.trim().toLowerCase() || options.name) % pool.length;
  const index = (start + dayIndex(options.referenceDate)) % pool.length;
  const body = pool[index] ?? pool[0];
  return `${options.name}, ${body}`;
}

export const DAILY_BOOST_POOL_SIZE = {
  team: TEAM_BODIES.length,
  executive: EXEC_BODIES.length,
};
