import { Redirect } from 'expo-router';

// The administration UI is web-only. Native navigation stays unchanged.
export default function AdminNativeScreen() {
  return <Redirect href="/(tabs)" />;
}
