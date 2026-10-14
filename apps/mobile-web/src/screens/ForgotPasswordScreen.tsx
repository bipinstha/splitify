import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../theme/theme';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { ArrowLeft, CheckCircle2, Mail, KeyRound, Lock } from 'lucide-react-native';

const STORAGE_KEY = 'splitify_pending_reset_email';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'CONFIRM' | 'SUCCESS'>('REQUEST');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Restore saved email if user switches tabs to copy code
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const savedEmail = window.sessionStorage.getItem(STORAGE_KEY);
        if (savedEmail) {
          setEmail(savedEmail);
          setStep('CONFIRM');
          setInfoMsg(`Restored session. Enter the code sent to ${savedEmail}`);
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, []);

  const sanitizeEmail = (input: string) => {
    const clean = input.trim().split(' ').pop() || '';
    return clean.toLowerCase();
  };

  const sanitizeCode = (input: string) => {
    // Remove all whitespace, hyphens, and non-alphanumeric characters
    return input.replace(/[^0-9a-zA-Z]/g, '').trim();
  };

  const handleRequestReset = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (!email) {
      setErrorMsg('Please enter your email address');
      return;
    }

    const cleanEmail = sanitizeEmail(email);

    setLoading(true);
    try {
      console.log(`[FORGOT_PASSWORD] Requesting reset for: "${cleanEmail}"`);
      const output = await resetPassword({ username: cleanEmail });
      const { nextStep } = output;
      
      if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
        setStep('CONFIRM');
        setInfoMsg(`A verification code was sent to ${nextStep.codeDeliveryDetails?.destination || cleanEmail}`);
        
        // Save to sessionStorage to survive tab switching on mobile/desktop web
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
          try {
            window.sessionStorage.setItem(STORAGE_KEY, cleanEmail);
          } catch (e) {}
        }
      }
    } catch (error: any) {
      console.error('Reset Password Request Error:', error);
      setErrorMsg(error.message || 'Failed to request password reset. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = sanitizeEmail(email);
    const cleanCode = sanitizeCode(code);

    if (!cleanEmail) {
      setErrorMsg('Email address is missing. Please enter your email.');
      setStep('REQUEST');
      return;
    }

    if (!cleanCode) {
      setErrorMsg('Please enter the verification code sent to your email');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Please enter your new password');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await confirmResetPassword({
        username: cleanEmail,
        confirmationCode: cleanCode,
        newPassword,
      });
      
      // Clear saved session storage
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
      }

      setStep('SUCCESS');

      // Automatically redirect to Login after 2.5 seconds
      setTimeout(() => {
        navigation.navigate('Login', { 
          message: 'Password reset successful! Please log in with your new password.',
          email: cleanEmail
        });
      }, 2500);

    } catch (error: any) {
      console.error('Reset Password Confirmation Error:', error);
      let message = error.message || 'Failed to confirm password reset';
      if (error.name === 'CodeMismatchException') {
        message = 'Invalid verification code. Please double-check the code from your email.';
      } else if (error.name === 'ExpiredCodeException') {
        message = 'Verification code has expired. Please request a new code.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
    navigation.navigate('Login', { email: sanitizeEmail(email) });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step !== 'SUCCESS' && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => step === 'CONFIRM' ? setStep('REQUEST') : navigation.goBack()}
            >
              <ArrowLeft color={COLORS.text} size={24} />
            </TouchableOpacity>
          )}

          {step === 'SUCCESS' ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 color={COLORS.primary} size={64} />
              </View>
              <Text style={styles.successTitle}>Password Reset Complete!</Text>
              <Text style={styles.successSubtitle}>
                Your password has been successfully updated. You can now log in to Splitify with your new password.
              </Text>

              <TouchableOpacity style={styles.button} onPress={handleBackToLogin}>
                <Text style={styles.buttonText}>Proceed to Log In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  {step === 'REQUEST' 
                    ? "Enter your email and we'll send you a verification code to reset your password." 
                    : `Enter the verification code sent to ${email} along with your new password.`}
                </Text>
              </View>

              <View style={styles.form}>
                {infoMsg && (
                  <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>{infoMsg}</Text>
                  </View>
                )}

                {errorMsg && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {step === 'REQUEST' ? (
                  <>
                    <View style={styles.inputWrapper}>
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
                    </View>
                    <TouchableOpacity style={styles.button} onPress={handleRequestReset} disabled={loading}>
                      {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send Code</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.secondaryLink} 
                      onPress={() => {
                        setErrorMsg(null);
                        setStep('CONFIRM');
                      }}
                    >
                      <Text style={styles.secondaryLinkText}>Already have a verification code? Enter it here</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.emailPillContainer}>
                      <Text style={styles.emailPillText}>Resetting password for: <Text style={styles.emailPillBold}>{email}</Text></Text>
                      <TouchableOpacity onPress={() => setStep('REQUEST')}>
                        <Text style={styles.changeEmailText}>Change</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput 
                      style={styles.input}
                      placeholder="Verification Code (e.g. 123456)"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={code}
                      onChangeText={(val) => {
                        setCode(sanitizeCode(val));
                        if (errorMsg) setErrorMsg(null);
                      }}
                    />

                    <TextInput 
                      style={styles.input}
                      placeholder="New Password (min 8 characters)"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry
                      value={newPassword}
                      onChangeText={(val) => {
                        setNewPassword(val);
                        if (errorMsg) setErrorMsg(null);
                      }}
                    />

                    <TouchableOpacity style={styles.button} onPress={handleConfirmReset} disabled={loading}>
                      {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Reset Password</Text>}
                    </TouchableOpacity>

                    <View style={styles.confirmFooter}>
                      <TouchableOpacity onPress={handleRequestReset} disabled={loading}>
                        <Text style={styles.secondaryLinkText}>Didn't receive a code? Resend</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    marginBottom: SPACING.xl,
    padding: 4,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  inputWrapper: {
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryLink: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    padding: SPACING.sm,
  },
  secondaryLinkText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  emailPillContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  emailPillText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  emailPillBold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  changeEmailText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: SPACING.sm,
  },
  confirmFooter: {
    marginTop: SPACING.md,
    alignItems: 'center',
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
  infoContainer: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#4CAF5033',
  },
  infoText: {
    color: '#2E7D32',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  successIconWrapper: {
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl * 1.5,
  },
});
