import React, { useState } from 'react';
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
import { ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'CONFIRM'>('REQUEST');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sanitizeEmail = (input: string) => {
    const clean = input.trim().split(' ').pop() || '';
    return clean.toLowerCase();
  };

  const handleRequestReset = async () => {
    setErrorMsg(null);
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
        Alert.alert('Success', `A reset code has been sent to ${nextStep.codeDeliveryDetails?.destination}`);
      }
    } catch (error: any) {
      console.error('Reset Password Request Error:', error);
      setErrorMsg(error.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    setErrorMsg(null);
    if (!code || !newPassword) {
      setErrorMsg('Please enter the verification code and your new password');
      return;
    }

    const cleanEmail = sanitizeEmail(email);

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await confirmResetPassword({
        username: cleanEmail,
        confirmationCode: code.trim(),
        newPassword
      });
      
      Alert.alert('Success', 'Your password has been reset successfully.', [
        { text: 'Log In', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      console.error('Reset Password Confirmation Error:', error);
      setErrorMsg(error.message || 'Failed to confirm password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => step === 'CONFIRM' ? setStep('REQUEST') : navigation.goBack()}
        >
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 'REQUEST' 
              ? "Enter your email and we'll send you a code to reset your password." 
              : `Enter the code sent to ${email} and your new password.`}
          </Text>
        </View>

        <View style={styles.form}>
          {errorMsg && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {step === 'REQUEST' ? (
            <>
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
              <TouchableOpacity style={styles.button} onPress={handleRequestReset} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput 
                style={styles.input}
                placeholder="Verification Code"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
                value={code}
                onChangeText={(val) => {
                  setCode(val);
                  if (errorMsg) setErrorMsg(null);
                }}
              />
              <TextInput 
                style={styles.input}
                placeholder="New Password"
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
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  backButton: {
    marginBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl * 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 24,
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
});

