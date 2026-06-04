import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-placeholder" });

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 600,
    });
    return resp.choices[0]?.message?.content ?? "";
  } catch {
    return "";
  }
}

export async function generateCoachResponse(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  userContext: string,
): Promise<string> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are ASTRA — a world-class AI life strategist and personal coach. You speak with precision, warmth, and conviction. You see the user's potential clearly and call it out directly. You give specific, actionable guidance, not vague platitudes. You know the user's context: ${userContext}. Keep responses concise (2-4 sentences) but powerful.`,
      },
      ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: "user", content: userMessage },
    ];

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300,
    });
    return resp.choices[0]?.message?.content ?? "I'm here to help you become your best self.";
  } catch {
    return "Focus on consistency today — every action compounds into the person you're becoming.";
  }
}

export function generateFutureLetter(userName: string, scores: Record<string, number>, streakDays: number): string {
  const templates = [
    `${userName},\n\nI'm writing to you from a place you can barely imagine right now. The consistency you built — those ${streakDays} days — that was the turning point.\n\nThank you for not quitting.\n\nYour health score is ${Math.round(scores.health ?? 50)}. Your wealth is growing. Your discipline is what they see first when they look at you.\n\nYou almost gave up. I remember. I'm grateful you kept going.\n\n— Your Future Self`,
    `To the version of me still building,\n\nEvery morning you chose to show up changed everything. Your knowledge score of ${Math.round(scores.knowledge ?? 50)} opened doors you couldn't see yet.\n\nYour consistency changed everything.\n\nThe person you're becoming is worth every hard day.\n\n— Future ${userName}`,
    `${userName},\n\nI know some days felt pointless. Keep going.\n\nYour discipline score of ${Math.round(scores.discipline ?? 50)} is now your identity. People see it before you speak. Your confidence — ${Math.round(scores.confidence ?? 50)} — is no longer something you have to manufacture.\n\nYou earned this.\n\n— The You You're Becoming`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

export function generateBiographyEntry(userName: string, actionsToday: string[], chapterNumber: number): string {
  const chapterNames: Record<number, string> = {
    1: "Awakening",
    2: "Momentum",
    3: "Discipline",
    4: "Growth",
    5: "Mastery",
    6: "Legacy",
  };
  const chapter = chapterNames[chapterNumber] || "Journey";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (actionsToday.length === 0) {
    return `${today} — Chapter ${chapterNumber}: ${chapter}. Today was a rest day. ${userName} chose recovery, understanding that stillness is also part of the story.`;
  }

  const actionText = actionsToday.join(", ");
  return `${today} — Chapter ${chapterNumber}: ${chapter}. Today, ${userName} chose growth. They completed ${actionText} — not because it was easy, but because they understood that each action writes the next chapter of their story. This is how legends are built, one day at a time.`;
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

  return {
    fitnessProjection: `If you continue this habit pattern, your fitness score may increase by ${Math.round(health * 0.36)}% within 12 months.`,
    wealthProjection: `If your current savings rate continues, your projected wealth score increases by ${Math.round(wealth * 0.44)}% in the next year.`,
    disciplineProjection: `Your discipline consistency puts you in the top ${Math.max(5, 50 - Math.round(discipline * 0.3))}% of ASTRA users at your stage.`,
    overallNarrative: `Your current trajectory shows strong compounding potential. The habits you're building now are creating exponential returns in your future self.`,
    topRecommendation: discipline < 60
      ? "Your biggest leverage point right now is discipline. Consistent daily actions, even small ones, will compound into dramatic life changes within 90 days."
      : health < 60
      ? "Prioritizing your physical health will unlock energy and confidence that amplifies every other area of your life."
      : "You're in a strong position. Focus on deepening your knowledge — it's the highest-ROI investment at your current stage.",
  };
}
