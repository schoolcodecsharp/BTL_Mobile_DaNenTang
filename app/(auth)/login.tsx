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

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
    accent: '#06B6D4',
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập email hoặc tên đăng nhập.');
      return;
    }
    if (!password) {
      Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics optional
    }

    setIsLoading(true);

    // Giả lập quá trình đăng nhập
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Thành công', `Chào mừng ${email.split('@')[0]} quay trở lại!`, [
        {
          text: 'Bắt đầu',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    }, 1200);
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Quên mật khẩu',
      'Vui lòng nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi yêu cầu',
          onPress: () => Alert.alert('Đã gửi', 'Vui lòng kiểm tra hộp thư của bạn!'),
        },
      ]
    );
  };

  const handleSocialLogin = (provider: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Alert.alert(`Đăng nhập với ${provider}`, `Đang kết nối tới ${provider}...`);
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
          
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
              <Ionicons name="checkbox-outline" size={44} color={theme.primaryLight} />
            </View>
            <Text style={[styles.appName, { color: theme.primaryLight }]}>TaskMaster</Text>
            <Text style={[styles.title, { color: theme.text }]}>Chào mừng trở lại! 👋</Text>
            <Text style={[styles.subtitle, { color: theme.subText }]}>
              Đăng nhập để theo dõi và hoàn thành các mục tiêu hôm nay.
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
            
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email hoặc Tên đăng nhập</Text>
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
                  placeholder="name@example.com"
                  placeholderTextColor={theme.subText}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
                {email.length > 0 && (
                  <TouchableOpacity onPress={() => setEmail('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={18} color={theme.subText} />
                  </TouchableOpacity>
                )}
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
                  placeholder="Nhập mật khẩu"
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
            </View>

            {/* Options Row: Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}>
                <Ionicons
                  name={rememberMe ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={rememberMe ? theme.primaryLight : theme.subText}
                />
                <Text style={[styles.rememberMeText, { color: theme.text }]}>Ghi nhớ</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={[styles.forgotPasswordText, { color: theme.primaryLight }]}>
                  Quên mật khẩu?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary },
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.submitButtonText}>Đăng nhập</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Guest / Skip Option */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}>
              <Text style={[styles.guestButtonText, { color: theme.subText }]}>
                Bỏ qua và dùng thử với tư cách Khách
              </Text>
            </TouchableOpacity>
          </View>

          {/* Social Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.subText, backgroundColor: theme.bg }]}>
              hoặc tiếp tục với
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtonsRow}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => handleSocialLogin('Google')}
              activeOpacity={0.75}>
              <FontAwesome name="google" size={20} color="#EA4335" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => handleSocialLogin('Apple')}
              activeOpacity={0.75}>
              <FontAwesome name="apple" size={22} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => handleSocialLogin('Facebook')}
              activeOpacity={0.75}>
              <FontAwesome name="facebook" size={20} color="#1877F2" />
            </TouchableOpacity>
          </View>

          {/* Footer - Switch to Register */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.subText }]}>
              Chưa có tài khoản?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.signupLink, { color: theme.primaryLight }]}>
                  Đăng ký ngay
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
    paddingTop: 16,
    paddingBottom: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
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
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberMeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    height: 52,
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
  guestButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  guestButtonText: {
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
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
    marginBottom: 28,
  },
  socialButton: {
    width: 58,
    height: 52,
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
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
