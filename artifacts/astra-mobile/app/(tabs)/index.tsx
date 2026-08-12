import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Platform, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetMe, useGetUserStats, useGetTodayActions, useGetFutureSelf, useUpdateMe, getGetMeQueryKey, useGetActions } from '@workspace/api-client-react';
import { PROMISE_SUGGESTIONS, DEFAULT_SUGGESTIONS, getDominantActionType } from '@/utils/promiseSuggestions';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useNotifications } from '@/hooks/useNotifications';

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  workout:          { label: 'Workout',          color: '#10B981', icon: 'barbell' },
  deep_work:        { label: 'Deep Work',        color: '#6366F1', icon: 'laptop' },
  learning:         { label: 'Learning',         color: '#3B82F6', icon: 'brain' },
  content_creation: { label: 'Content',          color: '#F97316', icon: 'videocam' },
  saving:           { label: 'Saving',           color: '#F59E0B', icon: 'wallet' },
  reading:          { label: 'Reading',          color: '#8B5CF6', icon: 'book' },
  meditation:       { label: 'Meditation',       color: '#14B8A6', icon: 'leaf' },
  sleep:            { label: 'Sleep',            color: '#0EA5E9', icon: 'moon' },
  water:            { label: 'Water',            color: '#06B6D4', icon: 'water' },
  promise:          { label: 'Promise Kept',     color: '#8B5CF6', icon: 'star' },
};

const STREAK_WORDS: Array<{ word: string; color: string; min: number }> = [
  { word: 'BEGIN',    color: '#FFFFFF',  min: 0  },
  { word: 'COMMIT',   color: '#3B82F6',  min: 1  },
  { word: 'MOMENTUM', color: '#8B5CF6',  min: 4  },
  { word: 'IDENTITY', color: '#A78BFA',  min: 8  },
  { word: 'RARE',     color: '#F59E0B',  min: 15 },
  { word: 'FORGED',   color: '#F97316',  min: 31 },
  { word: 'LEGEND',   color: '#10B981',  min: 61 },
];

function getStreakWord(streak: number) {
  for (let i = STREAK_WORDS.length - 1; i >= 0; i--) {
    if (streak >= STREAK_WORDS[i].min) return STREAK_WORDS[i];
  }
  return STREAK_WORDS[0];
}


export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [promise, setPromise] = useState('');
  const [promiseSealed, setPromiseSealed] = useState(false);
  const [editingPromise, setEditingPromise] = useState(false);
  const [editPromiseText, setEditPromiseText] = useState('');

  useNotifications();

  const { data: me, isLoading: meLoading, refetch: refetchMe } = useGetMe();
  const { data: stats, refetch: refetchStats } = useGetUserStats();
  const { data: todayData, refetch: refetchToday } = useGetTodayActions();
  const { data: futureSelf } = useGetFutureSelf();
  // Fetch recent action history to personalize tomorrow's promise suggestions
  const { data: recentActions } = useGetActions({ limit: 30 });
  const updateMe = useUpdateMe();

  const currentScores = futureSelf?.find(f => f.timeframe === 'current');
  const overallScore = currentScores?.overallScore ?? 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMe(), refetchStats(), refetchToday()]);
    setRefreshing(false);
  }, [refetchMe, refetchStats, refetchToday]);

  const handleSealPromise = () => {
    const trimmed = promise.trim();
    if (!trimmed) return;
    updateMe.mutate({ data: { tomorrowPromise: trimmed } } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setPromiseSealed(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      },
    });
  };

  const styles = makeStyles(colors);

  if (meLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const firstName = me?.name?.split(' ')[0] ?? 'Explorer';
  const streak = stats?.streakDays ?? me?.streakDays ?? 0;
  const promiseStreak = me?.promiseStreak ?? 0;
  const actionsToday = todayData?.actions?.length ?? 0;
  const todayList = todayData?.actions ?? [];
  const promiseKept = todayList.some(a => (a.type as string) === 'promise');
  const tomorrowPromise = me?.tomorrowPromise;

  const PROMISE_MILESTONES = [3, 7, 14, 30, 60, 90];
  const isPromiseMilestone = actionsToday > 0 && PROMISE_MILESTONES.includes(promiseStreak);
  const promiseStreakMilestoneLabel =
    promiseStreak >= 90 ? '90-day promise legend' :
    promiseStreak >= 60 ? '60-day promise keeper' :
    promiseStreak >= 30 ? '30-day promise keeper' :
    promiseStreak >= 14 ? '14-day promise keeper' :
    promiseStreak >= 7  ? '7-day promise keeper' :
    '3-day promise keeper';

  const streakInfo = getStreakWord(streak);

  // Personalize suggestion chips based on the user's most-logged action type
  const historicalTypes = (recentActions ?? []).map((a: any) => a.type as string);
  const dominantType = getDominantActionType(historicalTypes);
  const homeSuggestions = PROMISE_SUGGESTIONS[dominantType ?? ''] ?? DEFAULT_SUGGESTIONS;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 17 ? 'This afternoon' : 'This evening';

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: webTopPad + 16, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 96 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{firstName}.</Text>
        </View>
        <View style={[styles.wordBadge, { borderColor: `${streakInfo.color}40` }]}>
          <Text style={styles.wordLabel}>Today</Text>
          <Text style={[styles.wordText, { color: streakInfo.color }]}>{streakInfo.word}</Text>
        </View>
      </Animated.View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.statsRow}>
        <StatCard
          label="Identity"
          value={`${Math.round(overallScore)}%`}
          icon="shield-checkmark"
          color="#3B82F6"
          colors={colors}
        />
        <StatCard
          label="Streak"
          value={`${streak}d`}
          icon="flame"
          color="#F97316"
          colors={colors}
        />
        <StatCard
          label="Promises"
          value={`${promiseStreak}d`}
          icon="star"
          color="#8B5CF6"
          colors={colors}
        />
      </Animated.View>

      {/* Promise streak milestone celebration */}
      {isPromiseMilestone && (
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.milestoneBanner}>
          <View style={styles.milestoneOrb} />
          <View style={styles.milestoneRow2}>
            <Ionicons name="star" size={14} color="#8B5CF6" style={{ marginRight: 6 }} />
            <Text style={styles.milestoneTag}>Promise Milestone</Text>
          </View>
          <Text style={styles.milestoneHeadline}>
            {promiseStreak} promises kept in a row.
          </Text>
          <Text style={styles.milestoneBody}>
            You are someone who follows through. The {promiseStreakMilestoneLabel} isn't just a number — it's proof of your character.
          </Text>
        </Animated.View>
      )}

      {/* Yesterday's promise — accountability hook (pending) or kept confirmation */}
      {!!tomorrowPromise && (
        <Animated.View
          entering={FadeInDown.duration(400).delay(120)}
          style={actionsToday > 0 ? styles.yesterdayCardKept : styles.yesterdayCard}
        >
          <View style={actionsToday > 0 ? styles.yesterdayOrbKept : styles.yesterdayOrb} />
          <View style={[styles.yesterdayRow, { justifyContent: 'space-between' }]}>
            <View style={styles.yesterdayRow}>
              <Ionicons
                name={actionsToday > 0 ? 'checkmark-circle' : 'sparkles'}
                size={11}
                color={actionsToday > 0 ? '#10B981' : colors.primary}
                style={{ marginRight: 5 }}
              />
              <Text style={actionsToday > 0 ? styles.yesterdayTagKept : styles.yesterdayTag}>
                {actionsToday > 0 ? 'Promise Kept' : "Yesterday's Promise"}
              </Text>
            </View>
            {/* Change plan — only when the user hasn't logged today yet */}
            {actionsToday === 0 && !editingPromise && (
              <TouchableOpacity
                onPress={() => { setEditPromiseText(tomorrowPromise); setEditingPromise(true); }}
                style={styles.changePlanBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil-outline" size={11} color={`${colors.primary}90`} style={{ marginRight: 4 }} />
                <Text style={styles.changePlanText}>Change plan</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingPromise ? (
            /* Inline edit mode */
            <Animated.View entering={FadeIn.duration(200)}>
              <TextInput
                style={styles.editPromiseInput}
                value={editPromiseText}
                onChangeText={setEditPromiseText}
                placeholder="What will you do tomorrow?"
                placeholderTextColor={colors.mutedForeground}
                maxLength={120}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  const trimmed = editPromiseText.trim();
                  if (!trimmed) return;
                  updateMe.mutate({ data: { tomorrowPromise: trimmed } } as any, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
                      setEditingPromise(false);
                      if (Platform.OS !== 'web') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                    },
                  });
                }}
              />
              <View style={styles.editPromiseActions}>
                <TouchableOpacity
                  onPress={() => setEditingPromise(false)}
                  style={styles.editCancelBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const trimmed = editPromiseText.trim();
                    if (!trimmed) return;
                    updateMe.mutate({ data: { tomorrowPromise: trimmed } } as any, {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
                        setEditingPromise(false);
                        if (Platform.OS !== 'web') {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      },
                    });
                  }}
                  disabled={!editPromiseText.trim() || updateMe.isPending}
                  style={[styles.editSaveBtn, { backgroundColor: editPromiseText.trim() ? colors.primary : colors.secondary }, (!editPromiseText.trim() || updateMe.isPending) && { opacity: 0.45 }]}
                  activeOpacity={0.82}
                >
                  {updateMe.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.editSaveText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <>
              <Text style={styles.yesterdayText}>"{tomorrowPromise}"</Text>
              <Text style={actionsToday > 0 ? styles.yesterdayHookKept : styles.yesterdayHook}>
                {actionsToday > 0 ? 'You said you would. You did.' : 'You committed to this. Deliver today.'}
              </Text>
            </>
          )}
        </Animated.View>
      )}

      {/* Daily briefing card */}
      <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.briefingCard}>
        <View style={styles.briefingOrb} />
        <View style={styles.briefingRow}>
          <Ionicons name="sparkles" size={12} color={`${colors.primary}80`} style={{ marginRight: 6 }} />
          <Text style={styles.briefingTag}>Daily Briefing</Text>
          {actionsToday > 0 && (
            <View style={styles.protectedBadge}>
              <Ionicons name="checkmark-circle" size={11} color="#10B981" />
              <Text style={styles.protectedText}>Protected</Text>
            </View>
          )}
        </View>
        <Text style={styles.briefingHeadline}>
          {streak === 0
            ? 'Every legend started with day one.'
            : streak < 4
            ? `Day ${streak}. The foundation is being laid.`
            : streak < 8
            ? `${streak} days in. You're building real momentum.`
            : streak < 15
            ? `${streak} days. You're not the same person who started.`
            : `${streak} consecutive kept promises. This is who you are now.`}
        </Text>
        <Text style={styles.briefingBody}>
          {streak === 0
            ? 'The gap between who you are and who you want to be closes with a single action. Log your first one today.'
            : 'Every action you log is evidence. Your future self is watching the proof accumulate.'}
        </Text>
        {streak > 0 && (
          <View style={styles.milestoneRow}>
            <View style={styles.milestoneBar}>
              <View style={[styles.milestoneFill, { width: `${Math.min((streak / getNextMilestone(streak)) * 100, 100)}%` as any }]} />
            </View>
            <Text style={styles.milestoneLabel}>
              {streak}/{getNextMilestone(streak)} → {getMilestoneLabel(streak)}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Commit to tomorrow — shown when no promise is set yet */}
      {!tomorrowPromise && !promiseSealed && (
        <Animated.View entering={FadeInDown.duration(400).delay(160)} style={styles.promiseOuter}>
          <View style={styles.promiseOrb} />
          <View style={styles.promiseHeader}>
            <Ionicons name="moon-outline" size={13} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.promiseHeaderText}>Commit to Tomorrow</Text>
          </View>
          <Text style={styles.promiseQuestion}>What will you do tomorrow?</Text>

          {/* Suggestion chips — personalized to the user's most-logged action type */}
          {dominantType && (
            <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 6, letterSpacing: 0.4, opacity: 0.7 }}>
              Based on your{' '}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: `${colors.primary}B0` }}>
                {dominantType.replace('_', ' ')}
              </Text>
              {' '}habit
            </Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {homeSuggestions.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setPromise(s)}
                style={[styles.chip, promise === s && { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}50` }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, promise === s && { color: colors.primary }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Free-text input */}
          <TextInput
            style={styles.promiseInput}
            value={promise}
            onChangeText={setPromise}
            placeholder="Or write your own..."
            placeholderTextColor={colors.mutedForeground}
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={handleSealPromise}
          />

          {/* Seal button */}
          <TouchableOpacity
            style={[styles.sealBtn, { backgroundColor: promise.trim() ? colors.primary : colors.secondary }, (updateMe.isPending || !promise.trim()) && styles.sealBtnDisabled]}
            onPress={handleSealPromise}
            disabled={!promise.trim() || updateMe.isPending}
            activeOpacity={0.82}
          >
            {updateMe.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sealBtnText}>Seal it →</Text>
            }
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Sealed confirmation after committing from dashboard */}
      {promiseSealed && !tomorrowPromise && (
        <Animated.View entering={FadeInDown.duration(350)} style={styles.sealedCard}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sealedLabel}>Tomorrow's Promise</Text>
            <Text style={styles.sealedText} numberOfLines={2}>"{promise}"</Text>
          </View>
        </Animated.View>
      )}

      {/* Today's actions */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Actions</Text>
          <Text style={styles.sectionCount}>{actionsToday} logged</Text>
        </View>

        {todayList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="add-circle-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No actions yet today.</Text>
            <Text style={styles.emptySubtext}>Every identity is built one action at a time.</Text>
          </View>
        ) : (
          <View style={styles.actionsList}>
            {todayList.slice().reverse().map((action, i) => {
              const cfg = ACTION_CONFIG[action.type] ?? { label: action.type, color: colors.primary, icon: 'checkmark-circle' };
              return (
                <View key={action.id} style={[styles.actionItem, { borderLeftColor: cfg.color }]}>
                  <View style={[styles.actionIcon, { backgroundColor: `${cfg.color}18` }]}>
                    <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionLabel}>{cfg.label}</Text>
                    {action.notes ? <Text style={styles.actionNotes} numberOfLines={1}>{action.notes}</Text> : null}
                  </View>
                  <Text style={styles.actionTime}>
                    {new Date(action.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color, colors }: {
  label: string; value: string; icon: string; color: string;
  colors: ReturnType<typeof useColors>;
}) {
  const styles = StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: `${color}25`,
      padding: 12,
      alignItems: 'center',
      gap: 4,
    },
    val: { fontSize: 18, fontWeight: '900' as const, color, fontFamily: 'Inter_700Bold' },
    lbl: { fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  });
  return (
    <View style={styles.card}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={styles.val}>{value}</Text>
      <Text style={styles.lbl}>{label}</Text>
    </View>
  );
}

function getNextMilestone(streak: number) {
  if (streak < 3) return 3;
  if (streak < 7) return 7;
  if (streak < 14) return 14;
  if (streak < 30) return 30;
  if (streak < 60) return 60;
  if (streak < 90) return 90;
  return streak + 30;
}

function getMilestoneLabel(streak: number) {
  if (streak < 3) return '3-day foundation';
  if (streak < 7) return '7-day streak';
  if (streak < 14) return '14-day streak';
  if (streak < 30) return '30-day streak';
  if (streak < 60) return '60-day streak';
  if (streak < 90) return '90-day streak';
  return `${streak + 30}-day streak`;
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    greeting: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    name: {
      fontSize: 28,
      fontWeight: '900' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
    },
    wordBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 72,
      height: 72,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: `${colors.primary}08`,
    },
    wordLabel: {
      fontSize: 9,
      color: colors.mutedForeground,
      fontFamily: 'Inter_500Medium',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    wordText: {
      fontSize: 12,
      fontWeight: '900' as const,
      fontFamily: 'Inter_700Bold',
      marginTop: 2,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    briefingCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 20,
      overflow: 'hidden',
    },
    briefingOrb: {
      position: 'absolute',
      top: -40,
      right: -40,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary,
      opacity: 0.05,
    },
    briefingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    briefingTag: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: `${colors.primary}80`,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      fontFamily: 'Inter_700Bold',
    },
    protectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginLeft: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: '#10B98120',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#10B98130',
    },
    protectedText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#10B981',
      fontFamily: 'Inter_700Bold',
    },
    briefingHeadline: {
      fontSize: 17,
      fontWeight: '800' as const,
      color: colors.foreground,
      lineHeight: 24,
      marginBottom: 8,
      fontFamily: 'Inter_700Bold',
    },
    briefingBody: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
    },
    milestoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
    },
    milestoneBar: {
      flex: 1,
      height: 3,
      backgroundColor: colors.border,
      borderRadius: 2,
      maxWidth: 180,
    },
    milestoneFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    milestoneLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    milestoneBanner: {
      backgroundColor: '#8B5CF608',
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: '#8B5CF630',
      padding: 20,
      marginBottom: 20,
      overflow: 'hidden',
    },
    milestoneOrb: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#8B5CF6',
      opacity: 0.06,
    },
    milestoneRow2: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    milestoneTag: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#8B5CF6',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      fontFamily: 'Inter_700Bold',
    },
    milestoneHeadline: {
      fontSize: 17,
      fontWeight: '800' as const,
      color: colors.foreground,
      lineHeight: 24,
      marginBottom: 8,
      fontFamily: 'Inter_700Bold',
    },
    milestoneBody: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
    },
    sectionCount: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_500Medium',
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
    },
    actionsList: {
      gap: 8,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: colors.radius - 2,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      padding: 12,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
    },
    actionNotes: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginTop: 1,
    },
    actionTime: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },

    // ── Yesterday's promise accountability card ──────────────────────
    yesterdayCard: {
      backgroundColor: `${colors.primary}0C`,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: `${colors.primary}35`,
      padding: 18,
      marginBottom: 16,
      overflow: 'hidden' as const,
    },
    yesterdayCardKept: {
      backgroundColor: '#10B98110',
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: '#10B98135',
      padding: 18,
      marginBottom: 16,
      overflow: 'hidden' as const,
    },
    yesterdayOrb: {
      position: 'absolute' as const,
      top: -24,
      right: -24,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      opacity: 0.08,
    },
    yesterdayOrbKept: {
      position: 'absolute' as const,
      top: -24,
      right: -24,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#10B981',
      opacity: 0.08,
    },
    yesterdayRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 8,
    },
    yesterdayTag: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: `${colors.primary}90`,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
      fontFamily: 'Inter_700Bold',
    },
    yesterdayTagKept: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#10B981CC',
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
      fontFamily: 'Inter_700Bold',
    },
    yesterdayText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      lineHeight: 23,
      marginBottom: 8,
      fontStyle: 'italic' as const,
    },
    yesterdayHook: {
      fontSize: 12,
      color: `${colors.primary}80`,
      fontFamily: 'Inter_500Medium',
      fontWeight: '600' as const,
    },
    yesterdayHookKept: {
      fontSize: 12,
      color: '#10B981AA',
      fontFamily: 'Inter_500Medium',
      fontWeight: '600' as const,
    },
    changePlanBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      backgroundColor: `${colors.primary}08`,
    },
    changePlanText: {
      fontSize: 10,
      color: `${colors.primary}90`,
      fontFamily: 'Inter_500Medium',
      fontWeight: '600' as const,
    },
    editPromiseInput: {
      backgroundColor: colors.secondary,
      borderRadius: colors.radius - 2,
      borderWidth: 1,
      borderColor: `${colors.primary}50`,
      padding: 10,
      color: colors.foreground,
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      marginTop: 4,
      marginBottom: 10,
    },
    editPromiseActions: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    editCancelBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center' as const,
      borderRadius: colors.radius - 2,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
    },
    editCancelText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_500Medium',
    },
    editSaveBtn: {
      flex: 2,
      paddingVertical: 10,
      alignItems: 'center' as const,
      borderRadius: colors.radius - 2,
    },
    editSaveText: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
    },

    // ── Commit to tomorrow card ──────────────────────────────────────
    promiseOuter: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      padding: 20,
      marginBottom: 20,
      overflow: 'hidden' as const,
    },
    promiseOrb: {
      position: 'absolute' as const,
      top: -30,
      right: -30,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary,
      opacity: 0.06,
    },
    promiseHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 6,
    },
    promiseHeaderText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: `${colors.primary}90`,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
      fontFamily: 'Inter_700Bold',
    },
    promiseQuestion: {
      fontSize: 18,
      fontWeight: '800' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      marginBottom: 14,
      lineHeight: 24,
    },
    chipsScroll: {
      marginBottom: 14,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 99,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_500Medium',
    },
    promiseInput: {
      backgroundColor: colors.secondary,
      borderRadius: colors.radius - 2,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      color: colors.foreground,
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      marginBottom: 14,
    },
    sealBtn: {
      borderRadius: colors.radius,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    sealBtnDisabled: {
      opacity: 0.45,
    },
    sealBtnText: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
    },
    sealedCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      backgroundColor: `${colors.primary}10`,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      padding: 16,
      marginBottom: 20,
    },
    sealedLabel: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: `${colors.primary}90`,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
      marginBottom: 3,
    },
    sealedText: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: 'Inter_500Medium',
      lineHeight: 20,
      fontStyle: 'italic' as const,
    },
  });
}
