/**
 * Tomorrow's promise suggestion chips, keyed by action type.
 * Shared between the home screen and the actions tab so personalization
 * stays consistent across the app.
 */
export const PROMISE_SUGGESTIONS: Record<string, string[]> = {
  workout:          ['I will work out again',          'I will train for 30 minutes',       'I will move my body'],
  deep_work:        ['I will do 90 min of deep work',  'I will focus without distraction',  'I will make real progress on my work'],
  learning:         ['I will study for an hour',       'I will learn something new',        'I will invest in my education'],
  content_creation: ['I will create and ship',         'I will put my work into the world', 'I will build something today'],
  saving:           ['I will make a wealth decision',  'I will track my spending',          'I will save money'],
  reading:          ['I will read for 30 minutes',     'I will finish a chapter',           'I will read before bed'],
  meditation:       ['I will meditate',                'I will find 10 minutes of calm',    'I will clear my mind'],
  sleep:            ['I will sleep by 10pm',           'I will protect my sleep',           'I will prioritize rest'],
  water:            ['I will drink 8 glasses',         'I will stay hydrated all day',      'I will take care of my body'],
};

export const DEFAULT_SUGGESTIONS = [
  'I will show up again',
  'I will do the work',
  'I will keep the streak alive',
];

/**
 * Given a list of action type strings (most recent first), returns the
 * type that appears most frequently — i.e. the user's dominant habit.
 * Falls back to null if the list is empty.
 */
export function getDominantActionType(types: string[]): string | null {
  if (!types.length) return null;
  const counts: Record<string, number> = {};
  for (const t of types) {
    counts[t] = (counts[t] ?? 0) + 1;
  }
  // exclude internal "promise" entries from influencing suggestions
  delete counts['promise'];
  if (!Object.keys(counts).length) return null;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
