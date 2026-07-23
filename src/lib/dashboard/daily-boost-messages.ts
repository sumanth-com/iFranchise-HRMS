export type DailyBoostMessage = {
  line1: string;
  line2: string;
};

export const DAILY_BOOST_MESSAGES: DailyBoostMessage[] = [
  {
    line1: "{name}, may your day be calm, happy, and full of small wins from home.",
    line2: "You matter more than you know — keep shining in your own gentle way.",
  },
  {
    line1: "{name}, hope today brings you peace, good energy, and a reason to smile.",
    line2: "Your kindness reaches people even through a screen. Thank you for that.",
  },
  {
    line1: "{name}, you're doing better than you think — one step at a time is enough.",
    line2: "Wishing you a light heart and a productive, happy work-from-home day.",
  },
  {
    line1: "{name}, may your coffee be warm and your mind feel clear today.",
    line2: "You bring something special to this team — never forget that.",
  },
  {
    line1: "{name}, hope today feels easy, meaningful, and a little brighter for you.",
    line2: "Your effort counts, your presence counts, and so do you.",
  },
  {
    line1: "{name}, sending you good vibes for a smooth and happy day ahead.",
    line2: "Keep trusting yourself — you're growing in all the right ways.",
  },
  {
    line1: "{name}, may today give you focus, comfort, and moments that make you happy.",
    line2: "The team is better because you're part of it. Truly.",
  },
  {
    line1: "{name}, hope you find joy in the little things while you work today.",
    line2: "You deserve a day that feels as good as you make others feel.",
  },
  {
    line1: "{name}, wishing you strength, patience, and a happy heart from home.",
    line2: "You're appreciated — not just for what you do, but for who you are.",
  },
  {
    line1: "{name}, may your day be balanced — work done, mind at ease, spirit lifted.",
    line2: "Keep going; you're making a real difference, quietly and beautifully.",
  },
  {
    line1: "{name}, hope today treats you with the same warmth you give others.",
    line2: "You have a good heart, {name} — let that guide your day.",
  },
  {
    line1: "{name}, may your home workspace feel cozy and your goals feel reachable.",
    line2: "Believe in yourself today. You're more capable than yesterday's doubts.",
  },
  {
    line1: "{name}, wishing you clarity, confidence, and a genuinely happy afternoon.",
    line2: "Your consistency inspires people more than you realize.",
  },
  {
    line1: "{name}, hope today leaves you proud of yourself in the softest, truest way.",
    line2: "Take a breath — you're allowed to be happy while you work hard.",
  },
  {
    line1: "{name}, may good news find you and stress stay far away today.",
    line2: "You are valued here, today and every day.",
  },
  {
    line1: "{name}, hope your day flows well — meetings, messages, and moments included.",
    line2: "Keep being you; it's one of the best things about this team.",
  },
  {
    line1: "{name}, wishing you a peaceful mind and a happily productive day.",
    line2: "Someone is grateful for you today. Let that make you smile.",
  },
  {
    line1: "{name}, may today feel lighter, kinder, and a little more yours.",
    line2: "You've got this — and you've got people cheering for you too.",
  },
  {
    line1: "{name}, hope you feel seen, supported, and happy while you work from home.",
    line2: "Your good energy doesn't go unnoticed. It really doesn't.",
  },
  {
    line1: "{name}, may your efforts today turn into progress you can feel good about.",
    line2: "End the day knowing you gave your best — that's always enough.",
  },
  {
    line1: "{name}, wishing you smiles between tasks and calm between calls.",
    line2: "You make remote work feel more human. Thank you, {name}.",
  },
  {
    line1: "{name}, hope today rewards your patience with something unexpectedly good.",
    line2: "Stay hopeful — good days have a way of finding good people.",
  },
  {
    line1: "{name}, may you feel healthy, happy, and proud of how far you've come.",
    line2: "The best version of today includes you feeling at peace with yourself.",
  },
  {
    line1: "{name}, sending a little sunshine your way for a warm, wonderful day.",
    line2: "You're doing great, {name}. Keep going with that beautiful heart.",
  },
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function personalizeDailyBoostText(template: string, name: string) {
  return template.replace(/\{name\}/g, name);
}

/** Picks a unique message per person per day so teammates never see the same line on the same date. */
export function dailyBoostIndex(
  referenceDate: string,
  personKey: string,
  poolSize = DAILY_BOOST_MESSAGES.length,
) {
  const ms = Date.parse(`${referenceDate}T00:00:00`);
  const day = Number.isNaN(ms) ? 0 : Math.floor(ms / 86_400_000);
  const personHash = hashString(personKey.trim().toLowerCase());
  return (day + personHash) % poolSize;
}

export function resolveDailyBoostMessage(referenceDate: string, personKey: string, name: string) {
  const boost = DAILY_BOOST_MESSAGES[dailyBoostIndex(referenceDate, personKey)];
  return {
    line1: personalizeDailyBoostText(boost.line1, name),
    line2: personalizeDailyBoostText(boost.line2, name),
  };
}
