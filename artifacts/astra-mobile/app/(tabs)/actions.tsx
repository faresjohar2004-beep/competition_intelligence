import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useLogAction, useGetTodayActions, getGetTodayActionsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

type ActionType = 'workout' | 'deep_work' | 'learning' | 'content_creation' | 'saving' | 'reading' | 'meditation' | 'sleep' | 'water';

const ACTIONS: Array<{
  type: ActionType;
  label: string;
  color: string;
  icon: string;
  identity: string;
  impact: string;
}> = [
  { type: 'workout',          label: 'Workout',        color: '#10B981', icon: 'barbell-outline',      identity: 'You are someone who refuses to let their body fail them.',    impact: '+2% Health' },
  { type: 'deep_work',        label: 'Deep Work',      color: '#6366F1', icon: 'laptop-outline',       identity: 'You are someone who does the real work.',                    impact: '+2% Discipline' },
  { type: 'learning',         label: 'Learning',       color: '#3B82F6', icon: 'book-outline',         identity: 'You are someone who invests in their future every day.',     impact: '+2% Knowledge' },
  { type: 'content_creation', label: 'Content',        color: '#F97316', icon: 'videocam-outline',     identity: 'You are someone who creates value in the world.',            impact: '+2% Confidence' },
  { type: 'saving',           label: 'Saving',         color: '#F59E0B', icon: 'wallet-outline',       identity: 'You are someone who builds wealth with intention.',          impact: '+2% Wealth' },
  { type: 'reading',          label: 'Reading',        color: '#8B5CF6', icon: 'library-outline',      identity: 'You are someone who never stops growing.',                   impact: '+1.5% Knowledge' },
  { type: 'meditation',       label: 'Meditation',     color: '#14B8A6', icon: 'leaf-outline',         identity: 'You are someone who masters their own mind.',                impact: '+1.5% Discipline' },
  { type: 'sleep',            label: 'Sleep',          color: '#0EA5E9', icon: 'moon-outline',         identity: 'You are someone who plays the long game.',                   impact: '+1.5% Health' },
  { type: 'water',            label: 'Water',          color: '#06B6D4', icon: 'water-outline',        identity: 'You are someone who takes care of their body.',              impact: '+1% Health' },
];

function ActionCard({
  action,
  logged,
  onPress,
  colors,
}: {
  action: typeof ACTIONS[0];
  logged: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.94, { duration: 80 }), withTiming(1, { duration: 200 }));
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <Animated.View
        style={[
          {
            backgroundColor: logged ? `${action.color}18` : colors.card,
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor: logged ? `${action.color}50` : colors.border,
            padding: 16,
            alignItems: 'center',
            gap: 8,
          },
          animStyle,
        ]}
      >
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${action.color}20`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={action.icon as any} size={22} color={action.color} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: logged ? action.color : colors.foreground, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
          {action.label}
        </Text>
        {logged && <Ionicons name="checkmark-circle" size={14} color={action.color} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function ActionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState<typeof ACTIONS[0] | null>(null);
  const [notes, setNotes] = useState('');
  const [successType, setSuccessType] = useState<string | null>(null);

  const { data: todayData, refetch } = useGetTodayActions();
  const logAction = useLogAction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayActionsQueryKey() });
      },
    },
  });

  const loggedTypes = new Set(todayData?.actions?.map(a => a.type) ?? []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSelect = (action: typeof ACTIONS[0]) => {
    setSelected(action);
    setNotes('');
  };

  const handleLog = async () => {
    if (!selected) return;
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await logAction.mutateAsync({ data: { type: selected.type, notes: notes.trim() || undefined } });
      setSuccessType(selected.type);
      setSelected(null);
      setNotes('');
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => setSuccessType(null), 2500);
    } catch (e) {
      console.error('Log action failed', e);
    }
  };

  const styles = makeStyles(colors);
  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: webTopPad + 16, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 96, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Log an Action</Text>
          <Text style={styles.subtitle}>Every action is evidence of who you're becoming.</Text>
        </Animated.View>

        {/* Success toast */}
        {successType && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.successText}>
              {ACTIONS.find(a => a.type === successType)?.identity ?? 'Action logged!'}
            </Text>
          </Animated.View>
        )}

        {/* Grid */}
        <View style={styles.grid}>
          {ACTIONS.map((action, i) => (
            <Animated.View key={action.type} entering={FadeInDown.duration(350).delay(i * 40)} style={{ width: '31%' }}>
              <ActionCard
                action={action}
                logged={loggedTypes.has(action.type)}
                onPress={() => handleSelect(action)}
                colors={colors}
              />
            </Animated.View>
          ))}
        </View>

        {/* Today's count */}
        <View style={styles.todayRow}>
          <Ionicons name="flash" size={14} color={colors.primary} />
          <Text style={styles.todayText}>
            {loggedTypes.size} of {ACTIONS.length} actions logged today
          </Text>
        </View>
      </ScrollView>

      {/* Log action modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSelected(null)} />
        {selected && (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Action info */}
            <View style={[styles.sheetIcon, { backgroundColor: `${selected.color}20` }]}>
              <Ionicons name={selected.icon as any} size={28} color={selected.color} />
            </View>
            <Text style={[styles.sheetTitle, { color: selected.color }]}>{selected.label}</Text>
            <Text style={styles.sheetIdentity}>"{selected.identity}"</Text>
            <View style={styles.sheetImpactRow}>
              <Ionicons name="trending-up" size={13} color={colors.mutedForeground} />
              <Text style={styles.sheetImpact}>{selected.impact}</Text>
            </View>

            {/* Optional notes */}
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note (optional)..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={2}
            />

            {/* Log button */}
            <TouchableOpacity
              style={[styles.logBtn, { backgroundColor: selected.color }, logAction.isPending && styles.logBtnDisabled]}
              onPress={handleLog}
              disabled={logAction.isPending}
              activeOpacity={0.82}
            >
              {logAction.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.logBtnText}>Log {selected.label}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelected(null)} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 26,
      fontWeight: '900' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginBottom: 20,
      lineHeight: 18,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: '#10B98115',
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: '#10B98130',
      padding: 14,
      marginBottom: 16,
    },
    successText: {
      flex: 1,
      fontSize: 13,
      color: '#10B981',
      fontFamily: 'Inter_500Medium',
      lineHeight: 18,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'flex-start',
    },
    todayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 20,
      justifyContent: 'center',
    },
    todayText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    sheetIcon: {
      width: 60,
      height: 60,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: 22,
      fontWeight: '900' as const,
      textAlign: 'center',
      fontFamily: 'Inter_700Bold',
      marginBottom: 8,
    },
    sheetIdentity: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 10,
      opacity: 0.7,
    },
    sheetImpactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      marginBottom: 20,
    },
    sheetImpact: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_500Medium',
    },
    notesInput: {
      backgroundColor: colors.secondary,
      borderRadius: colors.radius - 2,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      color: colors.foreground,
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      minHeight: 70,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    logBtn: {
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: 'center',
    },
    logBtnDisabled: {
      opacity: 0.6,
    },
    logBtnText: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
    },
  });
}
