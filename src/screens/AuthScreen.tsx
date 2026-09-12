import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

type AuthTab = 'login' | 'register';

type FocusField = 'name' | 'email' | 'password' | null;

export function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<AuthTab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<FocusField>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim() || password.length < 6) return false;
    if (tab === 'register' && !name.trim()) return false;
    return true;
  }, [email, password, name, tab]);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (tab === 'login') {
        const { error: signInError } = await signInWithEmail(
          email.trim(),
          password,
        );
        if (signInError) {
          setError(signInError.message);
        }
      } else {
        const { error: signUpError } = await signUpWithEmail(
          email.trim(),
          password,
          name.trim(),
        );
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage('Account created. Check your email if confirmation is required.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.center}>
          <Text style={styles.brand}>LockedIn</Text>
          <Text style={styles.subtitle}>Stay accountable. Stay locked in.</Text>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <Pressable
                onPress={() => {
                  setTab('login');
                  setError(null);
                  setMessage(null);
                }}
                style={[styles.tab, tab === 'login' && styles.tabActive]}
              >
                <Text style={[styles.tabLabel, tab === 'login' && styles.tabLabelActive]}>
                  Login
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTab('register');
                  setError(null);
                  setMessage(null);
                }}
                style={[styles.tab, tab === 'register' && styles.tabActive]}
              >
                <Text
                  style={[styles.tabLabel, tab === 'register' && styles.tabLabelActive]}
                >
                  Register
                </Text>
              </Pressable>
            </View>

            {tab === 'register' ? (
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                style={[styles.input, focused === 'name' && styles.inputFocused]}
              />
            ) : null}

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              style={[styles.input, focused === 'email' && styles.inputFocused]}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              style={[styles.input, focused === 'password' && styles.inputFocused]}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || submitting || authLoading}
              style={({ pressed }) => [
                styles.button,
                (!canSubmit || submitting || authLoading) && styles.buttonDisabled,
                pressed && canSubmit && !submitting ? styles.buttonPressed : null,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.buttonLabel}>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 4,
    padding: 20,
    gap: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    color: colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 2,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  message: {
    color: colors.safe,
    fontSize: 13,
  },
});

export default AuthScreen;
