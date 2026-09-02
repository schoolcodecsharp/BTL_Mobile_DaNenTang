import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Dynamic theme colors
  const theme = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    cardBg: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#0F172A',
    subText: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    inputBg: isDark ? '#0F172A' : '#F8FAFC',
    primary: '#4F46E5', // Indigo-600
    primaryLight: isDark ? '#6366F1' : '#4F46E5',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: theme.border };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Yếu', color: theme.danger };
    if (score <= 3) return { score: 2, label: 'Trung bình', color: theme.warning };
    return { score: 3, label: 'Mạnh', color: theme.success };
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ và tên.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập email.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Thông báo', 'Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsLoading(true);

    // Giả lập quá trình tạo tài khoản
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Đăng ký thành công! 🎉',
        `Tài khoản ${email} đã sẵn sàng. Hãy bắt đầu lên kế hoạch cho ngày hôm nay!`,
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    }, 1500);
  };

  const handleSocialRegister = (provider: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Alert.alert(`Đăng ký với ${provider}`, `Đang kết nối tới tài khoản ${provider}...`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
              ]}
              onPress={() => router.back()}
              activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Tạo tài khoản mới 🚀</Text>
            <Text style={[styles.subtitle, { color: theme.subText }]}>
              Bắt đầu hành trình quản lý mục tiêu và công việc hiệu quả mỗi ngày.
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
              },
            ]}>
            
            {/* Full Name Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Họ và tên</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: nameFocused ? theme.primaryLight : theme.border,
                  },
                ]}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={nameFocused ? theme.primaryLight : theme.subText}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor={theme.subText}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Địa chỉ Email</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: emailFocused ? theme.primaryLight : theme.border,
                  },
                ]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailFocused ? theme.primaryLight : theme.subText}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="email@domain.com"
                  placeholderTextColor={theme.subText}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Mật khẩu</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: passwordFocused ? theme.primaryLight : theme.border,
                  },
                ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={passwordFocused ? theme.primaryLight : theme.subText}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor={theme.subText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.subText}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBars}>
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            strength.score >= 1 ? strength.color : theme.border,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            strength.score >= 2 ? strength.color : theme.border,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            strength.score >= 3 ? strength.color : theme.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    Độ mạnh: {strength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>
                  Xác nhận mật khẩu
                </Text>
                {passwordsMatch && (
                  <View style={styles.matchBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                    <Text style={[styles.matchText, { color: theme.success }]}>Khớp</Text>
                  </View>
                )}
                {passwordsMismatch && (
                  <View style={styles.matchBadge}>
                    <Ionicons name="close-circle" size={14} color={theme.danger} />
                    <Text style={[styles.matchText, { color: theme.danger }]}>Chưa khớp</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: passwordsMismatch
                      ? theme.danger
                      : confirmPasswordFocused
                      ? theme.primaryLight
                      : theme.border,
                  },
                ]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={confirmPasswordFocused ? theme.primaryLight : theme.subText}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={theme.subText}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.subText}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms and Conditions Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
              activeOpacity={0.7}>
              <Ionicons
                name={agreeTerms ? 'checkbox' : 'square-outline'}
                size={22}
                color={agreeTerms ? theme.primaryLight : theme.subText}
              />
              <Text style={[styles.termsText, { color: theme.subText }]}>
                Tôi đồng ý với{' '}
                <Text style={{ color: theme.primaryLight, fontWeight: '600' }}>
                  Điều khoản sử dụng
                </Text>{' '}
                và{' '}
                <Text style={{ color: theme.primaryLight, fontWeight: '600' }}>
                  Chính sách bảo mật
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Register Action Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary },
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.submitButtonText}>Tạo tài khoản</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Social Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.subText, backgroundColor: theme.bg }]}>
              hoặc đăng ký bằng
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtonsRow}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => handleSocialRegister('Google')}
              activeOpacity={0.75}>
              <FontAwesome name="google" size={20} color="#EA4335" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => handleSocialRegister('Apple')}
              activeOpacity={0.75}>
              <FontAwesome name="apple" size={22} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => handleSocialRegister('Facebook')}
              activeOpacity={0.75}>
              <FontAwesome name="facebook" size={20} color="#1877F2" />
            </TouchableOpacity>
          </View>

          {/* Footer - Switch to Login */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.subText }]}>
              Đã có tài khoản?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.loginLink, { color: theme.primaryLight }]}>
                  Đăng nhập
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 36,
  },
  topBar: {
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    marginBottom: 18,
  },
  termsText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  submitButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '500',
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    width: 58,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
