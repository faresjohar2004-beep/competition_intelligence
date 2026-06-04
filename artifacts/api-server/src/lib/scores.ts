export type ActionType =
  | "workout"
  | "reading"
  | "learning"
  | "content_creation"
  | "meditation"
  | "saving"
  | "deep_work"
  | "sleep"
  | "water";

export type ScoreImpact = {
  healthDelta: number;
  wealthDelta: number;
  disciplineDelta: number;
  confidenceDelta: number;
  knowledgeDelta: number;
  message: string;
};

const ACTION_IMPACTS: Record<ActionType, ScoreImpact> = {
  workout: {
    healthDelta: 2,
    wealthDelta: 0,
    disciplineDelta: 1,
    confidenceDelta: 1,
    knowledgeDelta: 0,
    message: "+2% Health, +1% Discipline, +1% Confidence",
  },
  reading: {
    healthDelta: 0,
    wealthDelta: 0.5,
    disciplineDelta: 0.5,
    confidenceDelta: 0.5,
    knowledgeDelta: 1.5,
    message: "+1.5% Knowledge, +0.5% Confidence",
  },
  learning: {
    healthDelta: 0,
    wealthDelta: 1,
    disciplineDelta: 0.5,
    confidenceDelta: 0.5,
    knowledgeDelta: 2,
    message: "+2% Knowledge, +1% Wealth",
  },
  content_creation: {
    healthDelta: 0,
    wealthDelta: 1.5,
    disciplineDelta: 1,
    confidenceDelta: 2,
    knowledgeDelta: 0.5,
    message: "+2% Confidence, +1.5% Wealth",
  },
  meditation: {
    healthDelta: 0.5,
    wealthDelta: 0,
    disciplineDelta: 1.5,
    confidenceDelta: 1,
    knowledgeDelta: 0.5,
    message: "+1.5% Discipline, +1% Confidence",
  },
  saving: {
    healthDelta: 0,
    wealthDelta: 2,
    disciplineDelta: 1,
    confidenceDelta: 0.5,
    knowledgeDelta: 0,
    message: "+2% Wealth, +1% Discipline",
  },
  deep_work: {
    healthDelta: 0,
    wealthDelta: 1.5,
    disciplineDelta: 2,
    confidenceDelta: 0.5,
    knowledgeDelta: 1,
    message: "+2% Discipline, +1.5% Wealth",
  },
  sleep: {
    healthDelta: 1.5,
    wealthDelta: 0,
    disciplineDelta: 0.5,
    confidenceDelta: 0.5,
    knowledgeDelta: 0.5,
    message: "+1.5% Health, +0.5% Discipline",
  },
  water: {
    healthDelta: 1,
    wealthDelta: 0,
    disciplineDelta: 0.5,
    confidenceDelta: 0,
    knowledgeDelta: 0,
    message: "+1% Health",
  },
};

export function getActionImpact(type: ActionType): ScoreImpact {
  return ACTION_IMPACTS[type] ?? {
    healthDelta: 0,
    wealthDelta: 0,
    disciplineDelta: 0,
    confidenceDelta: 0,
    knowledgeDelta: 0,
    message: "Action logged",
  };
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function calcOverallScore(scores: {
  healthScore: number;
  wealthScore: number;
  disciplineScore: number;
  confidenceScore: number;
  knowledgeScore: number;
}): number {
  return clampScore(
    (scores.healthScore + scores.wealthScore + scores.disciplineScore + scores.confidenceScore + scores.knowledgeScore) / 5,
  );
}
