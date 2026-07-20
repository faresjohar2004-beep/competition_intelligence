import OpenAI from "openai";

const AI_AVAILABLE =
  !!process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY !== "sk-placeholder";

const openai = AI_AVAILABLE
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function callOpenAI(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: Partial<OpenAI.Chat.CompletionCreateParamsNonStreaming> = {},
): Promise<string | null> {
  if (!openai) return null;
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 600,
      ...options,
    });
    return resp.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });
  return (await callOpenAI(messages)) ?? "Your future self is being shaped by the actions you take today.";
}

const COACH_RESPONSES = [
  "Every action you take today is a vote for the person you want to become. Cast enough votes and the identity is inevitable.",
  "Consistency beats intensity every time. The person who shows up daily — even imperfectly — builds something the sprinter never will.",
  "Your future self is watching you make this decision. What story do you want to tell them?",
  "The gap between where you are and where you want to be is closed by a single discipline: doing what you said you would do.",
  "Discomfort is the price of growth. Every time you push through resistance, you are literally rewiring your brain for excellence.",
  "Most people overestimate what they can do in a day and underestimate what they can do in a decade. Start the decade today.",
  "You are not behind. You are exactly where you need to be to make the decision that changes everything.",
  "The version of you that achieves your goals isn't more talented — they're just more consistent. That's available to you right now.",
  "Clarity comes from action, not thought. Take one step and the path forward reveals itself.",
  "Your habits are a prophecy. What are yours predicting?",
  "Stop waiting for motivation. Motivation follows action — not the other way around.",
  "The compound effect is real. Small, consistent actions create results that look like overnight success to everyone watching.",
  "What is the ONE thing you could do today that would make everything else easier or unnecessary?",
  "You already know what to do. The question is whether you'll do it before you feel ready.",
  "Champions don't have more time. They have better priorities.",
];

const COACH_RESPONSES_BY_KEYWORD: Record<string, string[]> = {
  motivat: [
    "Motivation is a feeling — discipline is a decision. Make the decision and the feeling will follow.",
    "Don't wait to feel motivated. Act first. The motivation catches up.",
  ],
  anxious: [
    "Anxiety is excitement without direction. Channel it: what's the one action that would move you forward right now?",
    "The antidote to anxiety is always action. What's one thing you can control in this moment?",
  ],
  tired: [
    "Rest is part of the process — but make sure you're tired from building, not from avoiding.",
    "Your body needs rest to rebuild. Schedule it. Protect it. And then come back stronger.",
  ],
  fail: [
    "Every failure is a data point. What did it teach you? That lesson is worth more than the success would have been.",
    "Failure is just feedback wearing a dramatic costume. Strip the drama. Keep the lesson.",
  ],
  goal: [
    "A goal without a daily action attached to it is just a wish. What's the action you're committing to?",
    "Break it down: what does success look like in 90 days? 30 days? This week? Today?",
  ],
  habit: [
    "Habits are built through repetition, not willpower. Make the behavior so small it's impossible to skip.",
    "Identity drives habit. Start calling yourself the person who does the thing — and then prove it once a day.",
  ],
  help: [
    "Tell me more about what you're working on. The clearer your picture, the better I can guide you.",
    "I'm here. What's the real challenge — the one underneath the surface?",
  ],
};

function pickCoachFallback(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  for (const [keyword, responses] of Object.entries(COACH_RESPONSES_BY_KEYWORD)) {
    if (lower.includes(keyword)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  return COACH_RESPONSES[Math.floor(Math.random() * COACH_RESPONSES.length)];
}

// ─── Coach memory digest ──────────────────────────────────────────────────────
// Summarises older coaching messages so the coach retains context even after
// the live message window rolls past them. Called in the background — never
// blocks the chat response.
export async function generateCoachMemorySummary(
  messages: { role: string; content: string }[],
): Promise<string | null> {
  if (messages.length < 5) return null;

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "ASTRA"}: ${m.content}`)
    .join("\n");

  return callOpenAI(
    [
      {
        role: "system",
        content:
          "You are a coaching memory assistant. Read this coaching transcript and extract the essential context into exactly 3 concise sentences. Focus on: (1) the user's stated goals and core struggles, (2) specific wins, breakthroughs or commitments mentioned, (3) recurring patterns, habits, or behaviors. Be specific and personal — avoid generic statements.",
      },
      {
        role: "user",
        content: `Coaching transcript:\n\n${transcript}\n\nWrite a 3-sentence coaching memory digest.`,
      },
    ],
    { max_tokens: 200 },
  );
}

// ─── AI-generated coach insights ─────────────────────────────────────────────
// Produces 3 personalised insight cards (strength / recommendation / warning)
// grounded in the user's real scores, actions, and coach memory digest.
// Called fire-and-forget — never blocks a response.
export async function generateCoachInsights(
  userName: string,
  lifeScores: { health: number; discipline: number; wealth: number; knowledge: number; confidence: number } | null,
  recentActionTypes: string[],
  streakDays: number,
  goals: string | null,
  struggles: string | null,
  coachMemory: string | null,
): Promise<Array<{ type: string; content: string; priority: number }> | null> {
  const scoreStr = lifeScores
    ? `Health: ${Math.round(lifeScores.health)}, Discipline: ${Math.round(lifeScores.discipline)}, Wealth: ${Math.round(lifeScores.wealth)}, Knowledge: ${Math.round(lifeScores.knowledge)}, Confidence: ${Math.round(lifeScores.confidence)}`
    : "Scores not yet available";

  const actionStr = recentActionTypes.length
    ? [...new Set(recentActionTypes)].slice(0, 8).join(", ")
    : "none logged yet";

  const prompt = `Generate 3 highly specific coaching insights for ${userName}.

DATA:
- Streak: ${streakDays} days
- Goals: ${goals || "not specified"}
- Struggles: ${struggles || "not specified"}
- Life scores: ${scoreStr}
- Recent actions (14 days): ${actionStr}
- Coach conversation memory: ${coachMemory || "No prior sessions yet"}

Output ONLY this exact JSON object (no markdown):
{"insights":[
  {"type":"strength","content":"<1-2 sentences — reference their ACTUAL streak number, a specific score, or a real pattern from their data — not generic praise>","priority":1},
  {"type":"recommendation","content":"<1-2 sentences — a concrete next action tied to their LOWEST score or stated goals — name the specific score and gap>","priority":2},
  {"type":"warning","content":"<1-2 sentences — a specific risk grounded in their stated struggles and data — be direct and precise, not vague>","priority":3}
]}`;

  const result = await callOpenAI(
    [
      {
        role: "system",
        content:
          "You are ASTRA — an elite life strategist. Generate deeply personalised coaching insights anchored to real user data. Output ONLY the requested JSON object.",
      },
      { role: "user", content: prompt },
    ],
    { max_tokens: 400, response_format: { type: "json_object" } },
  );

  if (!result) return null;
  try {
    const parsed = JSON.parse(result);
    const arr: any[] = Array.isArray(parsed) ? parsed : (parsed.insights ?? parsed.data ?? Object.values(parsed)[0]);
    if (Array.isArray(arr) && arr.length >= 3) {
      return arr.slice(0, 3).map((item: any, i: number) => ({
        type: item.type ?? ["strength", "recommendation", "warning"][i],
        content: String(item.content ?? ""),
        priority: typeof item.priority === "number" ? item.priority : i + 1,
      }));
    }
  } catch {
    return null;
  }
  return null;
}

export async function generateCoachResponse(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  userContext: string,
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are ASTRA — a world-class AI life strategist and personal coach. You speak with precision, warmth, and conviction. You see the user's potential clearly and call it out directly. You give specific, actionable guidance, not vague platitudes. You know the user's context: ${userContext}. Keep responses concise (2-4 sentences) but powerful.`,
    },
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
    { role: "user", content: userMessage },
  ];

  const result = await callOpenAI(messages, { max_tokens: 300 });
  return result ?? pickCoachFallback(userMessage);
}

export function generateFutureLetter(userName: string, scores: Record<string, number>, streakDays: number): string {
  const name = userName || "Friend";
  const health = Math.round(scores.health ?? 50);
  const discipline = Math.round(scores.discipline ?? 50);
  const knowledge = Math.round(scores.knowledge ?? 50);
  const wealth = Math.round(scores.wealth ?? 50);

  const templates = [
    `${name},\n\nI'm writing to you from a place you can barely imagine right now. The consistency you built — those ${streakDays} days — that was the turning point that changed everything.\n\nYour health is at ${health}. Your discipline is what people see first when they look at you. And your wealth? Growing steadily, exactly the way you planned.\n\nYou almost gave up. I remember that day. I'm grateful you kept going.\n\nKeep writing this story. Every action today is me, tomorrow.\n\n— Your Future Self`,

    `To the version of me still in the arena,\n\nEvery morning you chose to show up changed something — even when it felt invisible. Your knowledge score of ${knowledge} opened doors you couldn't see from where you're standing.\n\nThe discipline you built at ${discipline} is not a habit anymore. It's your identity.\n\nThe person you're becoming is worth every hard day. Don't stop.\n\n— Future ${name}`,

    `${name},\n\nI know some days feel pointless. They're not.\n\nEvery single action you're taking is compounding. Your discipline score of ${discipline} is now your reputation. People feel it before you speak. Your confidence — earned through ${streakDays} days of showing up — is the real asset.\n\nThis is how it's supposed to feel. Keep going.\n\n— The You You're Becoming`,

    `Dear ${name},\n\nFrom where I'm standing, I can see exactly where your consistency led. The ${streakDays}-day streak was the foundation. The wealth you built — score ${wealth} — started with that first decision you made to take it seriously.\n\nYou were always capable. You just needed to prove it to yourself.\n\nYou did.\n\n— Future ${name}`,

    `${name},\n\nThe future is not something that happens to you. It's something you build — and you're building it right now, one action at a time.\n\nYour current trajectory, if you stay the course: extraordinary. The patterns you're establishing today are the architecture of the life you want.\n\nDon't let the temporary discomfort trick you into abandoning a permanent transformation.\n\n— Your Future Self`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

export function generateBiographyEntry(userName: string, actionsToday: string[], chapterNumber: number): string {
  const chapterNames: Record<number, string> = {
    1: "The Awakening",
    2: "Building Momentum",
    3: "Forging Discipline",
    4: "Accelerated Growth",
    5: "The Mastery Phase",
    6: "Building a Legacy",
  };
  const chapter = chapterNames[chapterNumber] || "The Journey";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const name = userName || "They";

  if (actionsToday.length === 0) {
    const restEntries = [
      `${today} — Chapter ${chapterNumber}: ${chapter}. ${name} chose rest. Not as surrender, but as strategy — understanding that recovery is as essential as effort in the long game of becoming.`,
      `${today} — Chapter ${chapterNumber}: ${chapter}. A quieter day. ${name} paused, reflected, and prepared. Even still waters run deep. The story continues tomorrow.`,
      `${today} — Chapter ${chapterNumber}: ${chapter}. Rest was the work today. ${name} honored their body and mind — two of the most powerful instruments in their arsenal.`,
    ];
    return restEntries[Math.floor(Math.random() * restEntries.length)];
  }

  const actionText = actionsToday.join(", ");
  const count = actionsToday.length;
  const entries = [
    `${today} — Chapter ${chapterNumber}: ${chapter}. Today, ${name} showed up. They completed ${actionText} — not because it was easy, but because they understood that each action writes the next chapter. Legends are built exactly like this: one day at a time.`,
    `${today} — Chapter ${chapterNumber}: ${chapter}. Another day added to the record. ${name} invested in ${count === 1 ? "one powerful action" : `${count} deliberate actions`}: ${actionText}. The compound effect does not announce itself. It simply works.`,
    `${today} — Chapter ${chapterNumber}: ${chapter}. The chapter continues. ${name} committed to ${actionText}. History is written by those who show up. Today, ${name} showed up.`,
    `${today} — Chapter ${chapterNumber}: ${chapter}. Future historians will note that on this day, ${name} chose growth: ${actionText}. No fanfare. No audience. Just the quiet, powerful decision to become more.`,
  ];
  return entries[Math.floor(Math.random() * entries.length)];
}

const MISSION_SETS = [
  {
    critical: "Complete a 90-minute deep work block on your single most important project — no distractions, no exceptions",
    secondary: [
      "Read for 25 minutes in a book that challenges your current thinking",
      "Drink 3 liters of water and take a 20-minute walk outside",
      "Review your top 3 goals and identify ONE action to take on each this week",
    ] as [string, string, string],
    courage: "Send a message to someone you've been meaning to reach out to — a mentor, collaborator, or opportunity",
  },
  {
    critical: "Plan and execute your most difficult task before noon — protect the morning for what matters most",
    secondary: [
      "Write 300 words: journal, plan, or content — get thoughts out of your head and onto the page",
      "Prepare one nutritious meal from scratch instead of ordering out",
      "Audit one recurring expense and decide: cut it or double down on it",
    ] as [string, string, string],
    courage: "Post one piece of content publicly — share a thought, lesson, or perspective you've been holding back",
  },
  {
    critical: "Spend 60 minutes learning a skill directly tied to your income or career — invest in your compounding asset",
    secondary: [
      "Do 20 minutes of intentional physical movement — sweat is medicine",
      "Set a hard cutoff on your phone tonight: no screens 1 hour before bed",
      "Write down 3 things you're grateful for AND 3 things you will accomplish before this day ends",
    ] as [string, string, string],
    courage: "Have one honest conversation you've been postponing — say the thing that needs to be said",
  },
  {
    critical: "Execute your most revenue-generating or career-advancing activity for 2 uninterrupted hours",
    secondary: [
      "Meditate or sit in silence for 10 minutes — stillness is a competitive advantage",
      "Clean and organize your primary workspace — environment shapes performance",
      "Track every dollar you spend today — awareness precedes mastery",
    ] as [string, string, string],
    courage: "Apply for something you feel slightly underqualified for — the gap is smaller than you think",
  },
  {
    critical: "Define your ONE most important goal this month and reverse-engineer the exact daily action required",
    secondary: [
      "Complete a 30-minute workout — your body is infrastructure, treat it that way",
      "Spend 20 minutes on financial learning: a book chapter, article, or course",
      "Declutter 10 things — physical chaos creates mental fog",
    ] as [string, string, string],
    courage: "Start something you've been planning for more than 30 days — done is better than perfect",
  },
];

export async function generateDailyMissions(
  userName: string,
  recentActionTypes: string[],
  streakDays: number,
): Promise<{ critical: string; secondary: [string, string, string]; courage: string }> {
  const actionSummary = recentActionTypes.length
    ? `Recent focus areas: ${[...new Set(recentActionTypes)].slice(0, 5).join(", ")}.`
    : "No recent actions yet — this user is just getting started.";

  const prompt = `Generate today's missions for ${userName}. ${actionSummary} Current streak: ${streakDays} days.
Output ONLY valid JSON (no markdown) in this exact shape:
{"critical":"<one powerful sentence — their most important mission today>","secondary":["<mission 1>","<mission 2>","<mission 3>"],"courage":"<a slightly uncomfortable challenge that pushes growth — e.g. make a sales call, post content, wake 30min earlier, start a conversation with a stranger, apply for something>"}
Make missions specific, measurable, and varied from generic advice. The courage challenge must feel slightly uncomfortable but achievable today.`;

  const result = await callOpenAI(
    [
      { role: "system", content: "You are ASTRA Mission Control — an elite AI life strategist. Generate personalized daily missions. Output only valid JSON." },
      { role: "user", content: prompt },
    ],
    { max_tokens: 400, response_format: { type: "json_object" } },
  );

  if (result) {
    try {
      const parsed = JSON.parse(result);
      if (parsed.critical && Array.isArray(parsed.secondary) && parsed.secondary.length >= 3 && parsed.courage) {
        return {
          critical: parsed.critical,
          secondary: [parsed.secondary[0], parsed.secondary[1], parsed.secondary[2]],
          courage: parsed.courage,
        };
      }
    } catch {
      // fall through to rotating fallbacks
    }
  }

  const dayIndex = new Date().getDay();
  return MISSION_SETS[dayIndex % MISSION_SETS.length];
}

export function generateProjection(scores: Record<string, number>): {
  fitnessProjection: string;
  wealthProjection: string;
  disciplineProjection: string;
  overallNarrative: string;
  topRecommendation: string;
} {
  const health = scores.health ?? 50;
  const wealth = scores.wealth ?? 50;
  const discipline = scores.discipline ?? 50;
  const knowledge = scores.knowledge ?? 50;

  const healthGain = Math.round(health * 0.36);
  const wealthGain = Math.round(wealth * 0.44);
  const topPercent = Math.max(5, 50 - Math.round(discipline * 0.3));

  return {
    fitnessProjection: `At your current consistency, your fitness score is projected to increase by ${healthGain}% within 12 months — placing you in elite physical condition relative to your peers.`,
    wealthProjection: `Your current financial habits compound to a ${wealthGain}% wealth score improvement over the next year — the difference between financial stress and financial freedom.`,
    disciplineProjection: `Your discipline consistency already puts you in the top ${topPercent}% of ASTRA users at your stage. Most people quit here. You haven't.`,
    overallNarrative: `Your trajectory shows strong compounding potential across all life domains. The habits you're building now are creating exponential returns — the kind that become unrecognizable in 3 years.`,
    topRecommendation:
      discipline < 60
        ? "Your biggest leverage point right now is discipline. Consistent daily actions — even small ones — will compound into dramatic life changes within 90 days. Show up every day, no matter what."
        : health < 60
          ? "Prioritizing your physical health will unlock energy and mental clarity that amplifies every other area of your life. Your body is your most important asset."
          : knowledge < 60
            ? "You're in a strong position. Double down on knowledge — it's the highest-ROI investment at your current stage. One hour of learning daily compounds into mastery within a year."
            : "You're firing on all cylinders. Your next level is wealth-building — invest in assets, skills, and relationships that pay dividends while you sleep.",
  };
}
