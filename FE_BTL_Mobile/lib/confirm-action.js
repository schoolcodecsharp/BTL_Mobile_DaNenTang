import { Alert, Platform } from 'react-native';

export function confirmAction({ title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', destructive = false, onConfirm }) {
  // React Native Web's Alert is a no-op, so use the browser dialog on web.
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm([title, message].filter(Boolean).join('\n\n'))) {
      return onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
