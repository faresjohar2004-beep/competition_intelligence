import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useClerk, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useGetMe, useGetUserStats, useUpdateMe, getGetMeQueryKey, getGetUserStatsQueryKey, useGetFutureSelf } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

// ── Avatar initials helper ──────────────────────────────────────────
function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Stat pill ───────────────────────────────────────────────────────
function StatPill({
  icon, label, value, color, colors,
}: {
  icon: string; label: string; value: string | number; color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[statStyles.pill, { borderColor: `${color}30`, backgroundColor: `${color}10` }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[statStyles.val, { color, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      <Text style={[statStyles.lbl, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    gap: 4,
  },
  val: { fontSize: 20, fontWeight: '900' as const },
  lbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ── Row item ────────────────────────────────────────────────────────
function RowItem({
  icon, label, value, onPress, destructive, colors,
}: {
  icon: string; label: string; value?: string; onPress?: () => void;
  destructive?: boolean; colors: ReturnType<typeof useColors>;
}) {
  const s = rowStyles(colors, !!destructive);
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={[s.iconWrap, { backgroundColor: destructive ? `${colors.destructive}15` : `${colors.primary}15` }]}>
        <Ionicons name={icon as any} size={16} color={destructive ? colors.destructive : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
        {value ? <Text style={s.value} numberOfLines={1}>{value}</Text> : null}
      </View>
      {onPress && !destructive && (
        <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}
function rowStyles(colors: ReturnType<typeof useColors>, destructive: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: destructive ? colors.destructive : colors.foreground,
      fontFamily: 'Inter_600SemiBold',
    },
    value: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginTop: 1,
    },
  });
}

// ── Edit modal ───────────────────────────────────────────────────────
function EditModal({
  visible, colors, initialName, initialCareer, initialGoals,
  onSave, onCancel, saving,
}: {
  visible: boolean; colors: ReturnType<typeof useColors>;
  initialName: string; initialCareer: string; initialGoals: string;
  onSave: (name: string, career: string, goals: string) => void;
  onCancel: () => void; saving: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [career, setCareer] = useState(initialCareer);
  const [goals, setGoals] = useState(initialGoals);
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const s = StyleSheet.create({
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: insets.bottom + 24,
    },
    title: {
      fontSize: 18, fontWeight: '800' as const, color: colors.foreground,
      fontFamily: 'Inter_700Bold', marginBottom: 20,
    },
    label: {
      fontSize: 11, fontWeight: '600' as const, color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase',
      letterSpacing: 0.5, marginBottom: 6,
    },
    input: {
      backgroundColor: colors.secondary, borderRadius: 10,
      borderWidth: 1, borderColor: colors.border,
      padding: 12, fontSize: 14, color: colors.foreground,
      fontFamily: 'Inter_400Regular', marginBottom: 16,
    },
    btns: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 10,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 14, fontWeight: '600' as const, color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
    },
    saveBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 10,
      backgroundColor: colors.primary, alignItems: 'center',
    },
    saveText: {
      fontSize: 14, fontWeight: '700' as const, color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.overlay}
    >
      <View style={s.sheet}>
        <Text style={s.title}>Edit Profile</Text>
        <Text style={s.label}>Name</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
        />
        <Text style={s.label}>Career / Role</Text>
        <TextInput
          style={s.input}
          value={career}
          onChangeText={setCareer}
          placeholder="e.g. Software Engineer"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={s.label}>Main Goals</Text>
        <TextInput
          style={[s.input, { minHeight: 72 }]}
          value={goals}
          onChangeText={setGoals}
          placeholder="What are you working toward?"
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
        />
        <View style={s.btns}>
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={() => onSave(name, career, goals)}
            disabled={saving}
            activeOpacity={0.82}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Main screen ─────────────────────────────────────────────────────
export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useGetMe();
  const { data: stats } = useGetUserStats();
  const { data: futureSelfList } = useGetFutureSelf();
  const { mutateAsync: updateMe } = useUpdateMe();

  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const styles = makeStyles(colors);

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (err) {
              setSigningOut(false);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSave = async (name: string, career: string, goals: string) => {
    setSaving(true);
    try {
      await updateMe({ data: { name: name || undefined, career: career || undefined, mainGoals: goals || undefined } });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
      setEditVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const name = me?.name ?? clerkUser?.fullName ?? 'Explorer';
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? me?.email ?? '';
  const streak = stats?.streakDays ?? me?.streakDays ?? 0;
  const totalActions = stats?.totalActions ?? 0;
  const chapter = stats?.currentChapter ?? me?.currentChapter ?? 1;
  const overallScore = stats?.overallScore ?? 50;
  const career = me?.career ?? '';
  const goals = me?.mainGoals ?? '';
  const joinedDaysAgo = stats?.joinedDaysAgo ?? 0;

  const currentProfile = Array.isArray(futureSelfList) ? futureSelfList[0] : null;
  const SCORE_DIMS = [
    { key: 'healthScore',     label: 'Health',     color: '#10B981', icon: 'fitness-outline' },
    { key: 'wealthScore',     label: 'Wealth',     color: '#F59E0B', icon: 'wallet-outline' },
    { key: 'disciplineScore', label: 'Discipline', color: '#6366F1', icon: 'shield-checkmark-outline' },
    { key: 'confidenceScore', label: 'Confidence', color: '#F97316', icon: 'flame-outline' },
    { key: 'knowledgeScore',  label: 'Knowledge',  color: '#3B82F6', icon: 'book-outline' },
  ] as const;

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingTop: webTopPad + 16,
          paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 96,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.screenTitle}>Profile</Text>
        </Animated.View>

        {/* Avatar + name card */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.avatarCard}>
          <View style={styles.avatarOrb} />
          <View style={[styles.avatarCircle, { borderColor: `${colors.primary}50` }]}>
            <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
          </View>
          <Text style={styles.displayName}>{name}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
          {career ? <Text style={styles.career}>{career}</Text> : null}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={13} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.statsRow}>
          <StatPill icon="flame" label="Streak" value={`${streak}d`} color="#F97316" colors={colors} />
          <StatPill icon="flash" label="Actions" value={totalActions} color="#8B5CF6" colors={colors} />
          <StatPill icon="shield-checkmark" label="Score" value={`${Math.round(overallScore)}%`} color="#3B82F6" colors={colors} />
        </Animated.View>

        {/* Life Scores */}
        {currentProfile && (
          <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.section}>
            <Text style={styles.sectionLabel}>Life Scores</Text>
            <View style={[styles.card, { padding: 16, gap: 14 }]}>
              {SCORE_DIMS.map(dim => {
                const score = Math.round((currentProfile as any)[dim.key] ?? 50);
                return (
                  <View key={dim.key} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <Ionicons name={dim.icon as any} size={14} color={dim.color} />
                        <Text style={{ fontSize: 13, fontWeight: '600' as const, color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                          {dim.label}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700' as const, color: dim.color, fontFamily: 'Inter_700Bold' }}>
                        {score}
                      </Text>
                    </View>
                    <View style={{ height: 5, backgroundColor: colors.secondary, borderRadius: 99, overflow: 'hidden' }}>
                      <View style={{ height: 5, width: `${Math.min(score, 100)}%` as any, backgroundColor: dim.color, borderRadius: 99, opacity: 0.85 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Account details */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)} style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <RowItem
              icon="book"
              label="Chapter"
              value={`Chapter ${chapter}`}
              colors={colors}
            />
            <RowItem
              icon="calendar"
              label="Member for"
              value={joinedDaysAgo === 0 ? 'Joined today' : `${joinedDaysAgo} day${joinedDaysAgo !== 1 ? 's' : ''}`}
              colors={colors}
            />
            {goals ? (
              <RowItem
                icon="flag"
                label="Goals"
                value={goals}
                colors={colors}
              />
            ) : null}
          </View>
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.duration(400).delay(240)} style={styles.section}>
          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[rowStyles(colors, true).row, { borderBottomWidth: 0 }]}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.7}
            >
              <View style={[{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.destructive}15` }]}>
                {signingOut
                  ? <ActivityIndicator color={colors.destructive} size="small" />
                  : <Ionicons name="log-out-outline" size={16} color={colors.destructive} />}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600' as const, color: colors.destructive, fontFamily: 'Inter_600SemiBold', flex: 1 }}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit modal */}
      <EditModal
        visible={editVisible}
        colors={colors}
        initialName={name}
        initialCareer={career}
        initialGoals={goals}
        onSave={handleSave}
        onCancel={() => setEditVisible(false)}
        saving={saving}
      />
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
    },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: {
      marginBottom: 20,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: '900' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
    },
    avatarCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      marginBottom: 16,
      overflow: 'hidden',
    },
    avatarOrb: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors.primary,
      opacity: 0.05,
    },
    avatarCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}20`,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    avatarInitials: {
      fontSize: 28,
      fontWeight: '900' as const,
      color: colors.primary,
      fontFamily: 'Inter_700Bold',
    },
    displayName: {
      fontSize: 20,
      fontWeight: '800' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      marginBottom: 4,
    },
    email: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginBottom: 4,
    },
    career: {
      fontSize: 12,
      color: `${colors.primary}B0`,
      fontFamily: 'Inter_500Medium',
      marginBottom: 4,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: `${colors.primary}15`,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
    },
    editBtnText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.primary,
      fontFamily: 'Inter_600SemiBold',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    section: {
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: colors.mutedForeground,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
  });
}
