import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { KeyboardAvoidingView as RNKAVController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetCoachingMessages, useSendCoachingMessage, getGetCoachingMessagesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

function MessageBubble({ message, colors }: { message: Message; colors: ReturnType<typeof useColors> }) {
  const isUser = message.role === 'user';
  return (
    <View style={[{ alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 12, paddingHorizontal: 16 }]}>
      {!isUser && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="sparkles" size={11} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 10, color: colors.primary, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' }}>ASTRA Coach</Text>
        </View>
      )}
      <View style={{
        maxWidth: '82%',
        backgroundColor: isUser ? colors.primary : colors.card,
        borderRadius: 18,
        borderBottomRightRadius: isUser ? 4 : 18,
        borderBottomLeftRadius: isUser ? 18 : 4,
        borderWidth: 1,
        borderColor: isUser ? `${colors.primary}60` : colors.border,
        padding: 13,
      }}>
        <Text style={{ fontSize: 14, color: isUser ? '#FFFFFF' : colors.foreground, lineHeight: 21, fontFamily: 'Inter_400Regular' }}>
          {message.content}
        </Text>
      </View>
      <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 3, fontFamily: 'Inter_400Regular' }}>
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useGetCoachingMessages();
  const sendMessage = useSendCoachingMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCoachingMessagesQueryKey() });
      },
    },
  });

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await sendMessage.mutateAsync({ data: { content: text } });
    } catch (e) {
      console.error('Send message failed', e);
    } finally {
      setSending(false);
    }
  };

  const styles = makeStyles(colors);
  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBotPad = Platform.OS === 'web' ? 34 : 0;

  const reversed = [...messages].reverse();

  return (
    <View style={[styles.root, { paddingTop: webTopPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>ASTRA Coach</Text>
          <Text style={styles.headerSub}>Your AI identity architect</Text>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={reversed}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
          inverted
          contentContainerStyle={{ paddingVertical: 16 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-ellipses" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.emptySub}>
                Ask your AI coach anything — about your progress, habits, mindset, or next steps. It knows your data.
              </Text>
              <View style={styles.suggestionsRow}>
                {[
                  "How am I progressing?",
                  "What should I focus on?",
                  "Rate my consistency.",
                ].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setInput(s)}
                    style={styles.suggestion}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Typing indicator */}
      {sending && (
        <View style={styles.typingRow}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text style={styles.typingText}>ASTRA is thinking...</Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + webBotPad + 8 }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${colors.primary}18`,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
    },
    headerSub: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginTop: 1,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyWrap: {
      padding: 32,
      alignItems: 'center',
      // Inverted FlatList reverses content, so we use scaleY to flip back visually
      transform: [{ scaleY: -1 }],
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: `${colors.primary}15`,
      borderWidth: 1,
      borderColor: `${colors.primary}25`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
      marginBottom: 20,
    },
    suggestionsRow: {
      gap: 8,
      width: '100%',
    },
    suggestion: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.card,
      borderRadius: colors.radius - 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionText: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
    },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    typingText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontStyle: 'italic',
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      maxHeight: 100,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
  });
}
