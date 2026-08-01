import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert,
} from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

type Mode = 'signIn' | 'signUp' | 'verify';

export default function SignInScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const styles = makeStyles(colors);

  const handleSignIn = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setError('');
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === 'complete') {
        await setSignInActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.message ?? err.message ?? 'Sign in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    setError('');
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setMode('verify');
    } catch (err: any) {
      const msg = err.errors?.[0]?.message ?? err.message ?? 'Sign up failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    setError('');
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setSignUpActive({ session: attempt.createdSessionId });
        router.replace('/(auth)/onboard');
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.message ?? err.message ?? 'Verification failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Background gradient orb */}
      <View style={styles.orb} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / brand */}
          <View style={styles.brand}>
            <View style={styles.logoRing}>
              <Ionicons name="star" size={28} color={colors.primary} />
            </View>
            <Text style={styles.appName}>ASTRAVITA</Text>
            <Text style={styles.tagline}>Build the identity you were meant to carry.</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {mode === 'verify' ? (
              <>
                <Text style={styles.cardTitle}>Check your email</Text>
                <Text style={styles.cardSubtitle}>
                  We sent a 6-digit code to {email}. Enter it below.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification code</Text>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={handleVerify}
                  disabled={loading}
                  activeOpacity={0.82}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnText}>Verify & Continue</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setMode('signUp')} style={styles.switchRow}>
                  <Text style={styles.switchText}>Back to sign up</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Mode tabs */}
                <View style={styles.tabs}>
                  {(['signIn', 'signUp'] as Mode[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => { setMode(m); setError(''); }}
                      style={[styles.tab, mode === m && styles.tabActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                        {m === 'signIn' ? 'Sign In' : 'Create Account'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={mode === 'signUp' ? 'At least 8 characters' : '••••••••'}
                      placeholderTextColor={colors.mutedForeground}
                      secureTextEntry={!showPassword}
                      autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={mode === 'signIn' ? handleSignIn : handleSignUp}
                  disabled={loading}
                  activeOpacity={0.82}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnText}>
                        {mode === 'signIn' ? 'Sign In' : 'Create Account'}
                      </Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.legal}>
            By continuing, you agree to build a life worth living.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    orb: {
      position: 'absolute',
      top: -80,
      left: -80,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: colors.primary,
      opacity: 0.06,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 24,
    },
    brand: {
      alignItems: 'center',
      marginBottom: 36,
    },
    logoRing: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: `${colors.primary}18`,
      borderWidth: 1,
      borderColor: `${colors.primary}40`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    appName: {
      fontSize: 22,
      fontWeight: '900' as const,
      color: colors.foreground,
      letterSpacing: 5,
      fontFamily: 'Inter_700Bold',
    },
    tagline: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 6,
      fontFamily: 'Inter_400Regular',
      letterSpacing: 0.3,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '800' as const,
      color: colors.foreground,
      marginBottom: 8,
      fontFamily: 'Inter_700Bold',
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 24,
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.secondary,
      borderRadius: colors.radius - 2,
      padding: 3,
      marginBottom: 24,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: colors.radius - 4,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.mutedForeground,
      marginBottom: 6,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      fontFamily: 'Inter_600SemiBold',
    },
    input: {
      backgroundColor: colors.secondary,
      borderRadius: colors.radius - 4,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      marginBottom: 0,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    eyeBtn: {
      width: 44,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
      borderRadius: colors.radius - 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    error: {
      fontSize: 13,
      color: colors.destructive,
      marginBottom: 12,
      fontFamily: 'Inter_400Regular',
    },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnText: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
    },
    switchRow: {
      alignItems: 'center',
      marginTop: 16,
    },
    switchText: {
      fontSize: 13,
      color: colors.primary,
      fontFamily: 'Inter_500Medium',
    },
    legal: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      opacity: 0.6,
      paddingHorizontal: 16,
    },
  });
}
