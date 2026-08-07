import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../theme/theme';
import { signIn, signInWithRedirect } from 'aws-amplify/auth';
import { debugAmplifyConfig, getDetailedAuthError } from '../utils/authDebug';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debug Amplify config on mount
  useEffect(() => {
    debugAmplifyConfig();
  }, []);

  const sanitizeEmail = (input: string) => {
    // Some users might accidentally paste paths or have weird browser autofill
    // This strips everything before the last space and trims
    const clean = input.trim().split(' ').pop() || '';
    return clean.toLowerCase();
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    const cleanEmail = sanitizeEmail(email);

    setLoading(true);
    try {
      console.log(`[LOGIN] Attempting login with clean email: "${cleanEmail}"`);
      const { isSignedIn, nextStep } = await signIn({ username: cleanEmail, password });
      console.log('Login result:', { isSignedIn, nextStep });
      
      if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        Alert.alert('Verification Required', 'Please verify your email before logging in.', [
          { text: 'Verify', onPress: () => navigation.navigate('Signup', { email: cleanEmail }) }
        ]);
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      const details = getDetailedAuthError(error);
      setErrorMsg(details);
      // Fallback alert for mobile
      if (Platform.OS !== 'web') {
        Alert.alert('Login Failed', details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'Google' | 'Facebook' | 'Apple') => {
    setErrorMsg(null);
    try {
      await signInWithRedirect({ provider });
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Splitify</Text>
          <Text style={styles.subtitle}>Split expenses with friends and family</Text>
        </View>

        <View style={styles.form}>
          {errorMsg && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TextInput 
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errorMsg) setErrorMsg(null);
            }}
          />
          <TextInput 
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginButtonText}>Log In</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.forgotPassword} 
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.socialSection}>
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('Google')}>
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('Apple')}>
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('Facebook')}>
              <Text style={[styles.socialButtonText, { color: '#1877F2' }]}>Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  form: {
    marginBottom: SPACING.xl,
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FF000033',
  },
  errorText: {
    color: '#D8000C',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  socialSection: {
    marginTop: SPACING.xl,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl * 2,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  signUpText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
