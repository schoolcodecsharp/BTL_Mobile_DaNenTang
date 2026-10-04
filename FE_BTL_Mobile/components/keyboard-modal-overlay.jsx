import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

/** Keep bottom-sheet forms above the native keyboard, including inside Modal. */
export function KeyboardModalOverlay({ children }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      enabled={Platform.OS !== 'web'}
      style={styles.overlay}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
});
