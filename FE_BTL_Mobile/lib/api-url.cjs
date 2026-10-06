function resolveApiUrl({ configuredUrl, development, webHostname, hostUri, port = '5257' }) {
  const configured = configuredUrl?.trim().replace(/\/+$/, '');
  if (configured && configured !== 'auto') return configured;
  if (!development) throw new Error('Bản phát hành cần cấu hình EXPO_PUBLIC_API_URL.');
  const host = webHostname || (hostUri ? new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname : null);
  if (!host) throw new Error('Không tìm thấy máy chạy Expo LAN. Hãy chạy Expo với --lan.');
  if (!webHostname && /\.(exp\.direct|expo\.dev)$/.test(host)) {
    throw new Error('API tự động cần Expo --lan, hoặc cấu hình EXPO_PUBLIC_API_URL.');
  }
  return `http://${host}:${port}`;
}

function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  // Explicit URLs also support standalone builds and Node-based tests.
  if (configuredUrl?.trim() && configuredUrl.trim() !== 'auto') return configuredUrl.trim().replace(/\/+$/, '');
  const development = typeof __DEV__ !== 'undefined' && __DEV__;
  const webHostname = typeof window !== 'undefined' ? window.location?.hostname : undefined;
  let hostUri;
  if (development && !webHostname) {
    const constantsModule = require('expo-constants');
    const constants = constantsModule.default ?? constantsModule;
    hostUri = constants.expoConfig?.hostUri;
  }
  return resolveApiUrl({ configuredUrl, development, webHostname, hostUri,
    port: process.env.EXPO_PUBLIC_API_PORT || '5257' });
}

module.exports = { getApiBaseUrl, resolveApiUrl };
