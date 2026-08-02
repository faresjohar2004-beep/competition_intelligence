import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { onboardUser } from '@workspace/api-client-react';

const STEPS = 3;

export default function OnboardScreen() {
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(user?.fullName ?? '');
  const [career, setCareer] = useState('');
  const [goals, setGoals] = useState('');
  const [struggles, setStruggles] = useState('');

  const styles = makeStyles(colors);

  const next = () => {
    if (step < STEPS - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return career.trim().length > 0;
    return goals.trim().length > 0;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await onboardUser({
        clerkId: user.id,
        name: name.trim(),
        email: user.primaryEmailAddress?.emailAddress ?? '',
        avatarUrl: user.imageUrl ?? undefined,
        career: career.trim(),
        mainGoals: goals.trim(),
        biggestStruggles: struggles.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      queryClient.invalidateQueries();
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const stepContent = [
    {
      icon: 'person' as const,
      title: 'Who are you becoming?',
      subtitle: 'Let\'s start with the basics. This shapes everything.',
      fields: (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="First name is fine"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
              autoFocus
            />
          </View>
        </>
      ),
    },
    {
      icon: 'briefcase' as const,
      title: 'What do you do?',
      subtitle: 'Your career shapes which actions hit hardest for you.',
      fields: (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Career / Role</Text>
          <TextInput
            style={styles.input}
            value={career}
            onChangeText={setCareer}
            placeholder="e.g. Software engineer, student, entrepreneur"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
          />
        </View>
      ),
    },
    {
      icon: 'trophy' as const,
      title: 'What are you building toward?',
      subtitle: 'The clearer your target, the more powerful your daily actions.',
      fields: (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your main goals</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={goals}
              onChangeText={setGoals}
              placeholder="e.g. Build a business, get in shape, become financially free"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              autoFocus
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Biggest struggles (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={struggles}
              onChangeText={setStruggles}
              placeholder="e.g. Consistency, focus, motivation"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={2}
            />
          </View>
        </>
      ),
    },
  ];

  const current = stepContent[step];

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <Text style={styles.stepLabel}>{step + 1} of {STEPS}</Text>

        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name={current.icon} size={28} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>

        {/* Fields */}
        <View style={styles.fields}>{current.fields}</View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, (!canNext() || loading) && styles.nextBtnDisabled, { flex: step > 0 ? 1 : undefined, width: step === 0 ? '100%' : undefined }]}
          onPress={next}
          disabled={!canNext() || loading}
          activeOpacity={0.82}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.nextBtnText}>
                {step < STEPS - 1 ? 'Continue' : 'Start My Journey'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    progressTrack: {
      height: 3,
      backgroundColor: colors.border,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 24,
    },
    stepLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.primary,
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: 'Inter_600SemiBold',
      marginBottom: 24,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: `${colors.primary}18`,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '900' as const,
      color: colors.foreground,
      marginBottom: 8,
      lineHeight: 30,
      fontFamily: 'Inter_700Bold',
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 20,
      marginBottom: 32,
      fontFamily: 'Inter_400Regular',
    },
    fields: {
      gap: 4,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.mutedForeground,
      marginBottom: 6,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      fontFamily: 'Inter_600SemiBold',
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: colors.radius - 2,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
    },
    multiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    error: {
      fontSize: 13,
      color: colors.destructive,
      marginBottom: 12,
      fontFamily: 'Inter_400Regular',
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      gap: 12,
    },
    backBtn: {
      width: 52,
      height: 52,
      borderRadius: colors.radius,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: 'center',
    },
    nextBtnDisabled: {
      opacity: 0.45,
    },
    nextBtnText: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
    },
  });
}
