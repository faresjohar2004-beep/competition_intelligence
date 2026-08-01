import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMissions, useCompleteMission } from '@/hooks/useMissions';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Slot = 'critical' | 'secondary1' | 'secondary2' | 'secondary3' | 'courage';

const SLOT_CONFIG: Record<Slot, { label: string; color: string; icon: string; priority: 'critical' | 'secondary' | 'courage' }> = {
  critical:   { label: 'Critical Mission',   color: '#8B5CF6', icon: 'flash',         priority: 'critical'   },
  secondary1: { label: 'Secondary Mission',  color: '#3B82F6', icon: 'target',        priority: 'secondary'  },
  secondary2: { label: 'Secondary Mission',  color: '#3B82F6', icon: 'target',        priority: 'secondary'  },
  secondary3: { label: 'Secondary Mission',  color: '#3B82F6', icon: 'target',        priority: 'secondary'  },
  courage:    { label: 'Courage Challenge',  color: '#F97316', icon: 'flame',         priority: 'courage'    },
};

function MissionCard({
  slot,
  text,
  completed,
  onComplete,
  loading,
  anyLoading,
  colors,
  index,
}: {
  slot: Slot;
  text: string;
  completed: boolean;
  onComplete: () => void;
  loading: boolean;   // this specific slot is submitting
  anyLoading: boolean; // any slot is submitting (disable all buttons)
  colors: ReturnType<typeof useColors>;
  index: number;
}) {
  const cfg = SLOT_CONFIG[slot];
  const isCritical = cfg.priority === 'critical';
  const isCourage = cfg.priority === 'courage';

  const handlePress = async () => {
    if (completed) return;
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComplete();
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: completed ? `${cfg.color}12` : isCritical ? `${cfg.color}0A` : colors.card,
            borderColor: completed ? `${cfg.color}50` : isCritical ? `${cfg.color}30` : colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.slotIcon, { backgroundColor: `${cfg.color}20` }]}>
            <Ionicons name={cfg.icon as any} size={isCritical ? 18 : 15} color={cfg.color} />
          </View>
          <Text style={[styles.slotLabel, { color: cfg.color }]}>{cfg.label}</Text>
          {completed && (
            <View style={[styles.doneBadge, { backgroundColor: `${cfg.color}20`, borderColor: `${cfg.color}40` }]}>
              <Ionicons name="checkmark" size={11} color={cfg.color} />
              <Text style={[styles.doneText, { color: cfg.color }]}>Done</Text>
            </View>
          )}
        </View>

        <Text style={[styles.missionText, { color: completed ? colors.mutedForeground : colors.foreground, fontSize: isCritical ? 16 : 14 }]}>
          {text}
        </Text>

        {!completed && (
          <TouchableOpacity
            onPress={handlePress}
            disabled={anyLoading}
            style={[styles.completeBtn, { backgroundColor: cfg.color + (anyLoading ? '60' : 'FF') }]}
            activeOpacity={0.82}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="checkmark-circle" size={15} color="#fff" />
                  <Text style={styles.completeBtnText}>Complete</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  slotIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  doneText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  missionText: {
    fontWeight: '600',
    lineHeight: 22,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
});

export default function MissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [completingSlot, setCompletingSlot] = useState<Slot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: missions, isLoading, refetch } = useGetMissions();
  const completeMission = useCompleteMission();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleComplete = async (slot: Slot) => {
    setCompletingSlot(slot);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await completeMission.mutateAsync({ slot });
    } catch (e) {
      console.error('Complete mission failed', e);
    } finally {
      setCompletingSlot(null);
    }
  };

  const pageStyles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    title: { fontSize: 26, fontWeight: '900', color: colors.foreground, fontFamily: 'Inter_700Bold', marginBottom: 4 },
    subtitle: { fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 20, lineHeight: 18 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
    dividerLabel: { fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', backgroundColor: colors.background, paddingHorizontal: 12 },
    dividerWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    emptyCard: { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 15, fontWeight: '600', color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
    emptySubtext: { fontSize: 13, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  });

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;

  const slotsToRender: Array<{ slot: Slot; text: string | null; completed: boolean }> = missions
    ? [
        { slot: 'critical',   text: missions.criticalMission,   completed: !!missions.criticalCompleted   },
        { slot: 'secondary1', text: missions.secondaryMission1, completed: !!missions.secondary1Completed },
        { slot: 'secondary2', text: missions.secondaryMission2, completed: !!missions.secondary2Completed },
        { slot: 'secondary3', text: missions.secondaryMission3, completed: !!missions.secondary3Completed },
        { slot: 'courage',    text: missions.courageChallenge,  completed: !!missions.courageCompleted    },
      ]
    : [];

  return (
    <ScrollView
      style={pageStyles.root}
      contentContainerStyle={{ paddingTop: webTopPad + 16, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 96, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text style={pageStyles.title}>Today's Missions</Text>
        <Text style={pageStyles.subtitle}>AI-generated daily challenges built around your identity.</Text>
      </Animated.View>

      {isLoading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.mutedForeground, marginTop: 12, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            Generating your missions...
          </Text>
        </View>
      ) : !missions ? (
        <View style={pageStyles.emptyCard}>
          <Ionicons name="trophy-outline" size={32} color={colors.mutedForeground} />
          <Text style={pageStyles.emptyText}>No missions yet.</Text>
          <Text style={pageStyles.emptySubtext}>Pull to refresh to generate today's missions.</Text>
        </View>
      ) : (
        <>
          {/* Critical */}
          {slotsToRender
            .filter(s => s.slot === 'critical' && s.text)
            .map((s, i) => (
              <MissionCard
                key={s.slot}
                slot={s.slot}
                text={s.text!}
                completed={s.completed}
                onComplete={() => handleComplete(s.slot)}
                loading={completingSlot === s.slot}
                anyLoading={completingSlot !== null}
                colors={colors}
                index={i}
              />
            ))}

          {/* Secondary divider */}
          <View style={pageStyles.dividerWrap}>
            <View style={pageStyles.dividerLine} />
            <Text style={pageStyles.dividerLabel}>Secondary</Text>
            <View style={pageStyles.dividerLine} />
          </View>

          {/* Secondaries */}
          {slotsToRender
            .filter(s => s.slot.startsWith('secondary') && s.text)
            .map((s, i) => (
              <MissionCard
                key={s.slot}
                slot={s.slot}
                text={s.text!}
                completed={s.completed}
                onComplete={() => handleComplete(s.slot)}
                loading={completingSlot === s.slot}
                anyLoading={completingSlot !== null}
                colors={colors}
                index={i + 1}
              />
            ))}

          {/* Courage divider */}
          <View style={pageStyles.dividerWrap}>
            <View style={pageStyles.dividerLine} />
            <Text style={[pageStyles.dividerLabel, { color: '#F97316' }]}>Courage Challenge</Text>
            <View style={pageStyles.dividerLine} />
          </View>

          {/* Courage */}
          {slotsToRender
            .filter(s => s.slot === 'courage' && s.text)
            .map((s, i) => (
              <MissionCard
                key={s.slot}
                slot={s.slot}
                text={s.text!}
                completed={s.completed}
                onComplete={() => handleComplete(s.slot)}
                loading={completingSlot === s.slot}
                anyLoading={completingSlot !== null}
                colors={colors}
                index={i + 5}
              />
            ))}
        </>
      )}
    </ScrollView>
  );
}
