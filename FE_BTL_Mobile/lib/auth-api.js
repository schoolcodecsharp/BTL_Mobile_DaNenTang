class AuthApiError extends Error {}

function getApiUrl(value) {
  const baseUrl = value?.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new AuthApiError('Chưa cấu hình máy chủ. Vui lòng đặt EXPO_PUBLIC_API_URL trong .env.local.');
  }

  try {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('Invalid API URL');
    }
  } catch {
    throw new AuthApiError('EXPO_PUBLIC_API_URL phải là địa chỉ HTTP hoặc HTTPS hợp lệ.');
  }

  return baseUrl;
}

function responseError(data, status) {
  if (status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat().filter((value) => typeof value === 'string');
    if (messages.length) return messages.join('\n');
  }
  return status === 401
    ? 'Email, tên đăng nhập hoặc mật khẩu không đúng.'
    : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}

async function requestAuth(endpoint, payload, options = {}) {
  // Expo replaces this exact property access with the public build-time setting.
  const baseUrl = getApiUrl(options.baseUrl ?? process.env.EXPO_PUBLIC_API_URL);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);

  try {
    const response = await fetchImpl(`${baseUrl}/api/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      // Proxies and unavailable servers may return HTML or an empty response.
      data = null;
    }

    if (!response.ok) throw new AuthApiError(responseError(data, response.status));
    if (!Number.isInteger(data?.id) || data.id <= 0 || typeof data.username !== 'string' || typeof data.email !== 'string') {
      throw new AuthApiError('Máy chủ trả về dữ liệu tài khoản không hợp lệ.');
    }
    return data;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    if (controller.signal.aborted) {
      throw new AuthApiError('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    }
    throw new AuthApiError('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và địa chỉ API.');
  } finally {
    clearTimeout(timeout);
  }
}

async function login({ usernameOrEmail, password }, options) {
  const identifier = usernameOrEmail.trim();
  if (!identifier) throw new AuthApiError('Vui lòng nhập email hoặc tên đăng nhập.');
  if (!password.trim()) throw new AuthApiError('Vui lòng nhập mật khẩu.');
  return requestAuth('login', { usernameOrEmail: identifier, password }, options);
}

async function register({ username, email, password, fullName }, options) {
  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();
  const trimmedFullName = fullName.trim();
  if (!trimmedFullName) throw new AuthApiError('Vui lòng nhập họ và tên.');
  if (trimmedFullName.length > 100) throw new AuthApiError('Họ và tên không được vượt quá 100 ký tự.');
  if (!trimmedUsername) throw new AuthApiError('Vui lòng nhập tên đăng nhập.');
  if (trimmedUsername.length > 50) throw new AuthApiError('Tên đăng nhập không được vượt quá 50 ký tự.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 100) {
    throw new AuthApiError('Vui lòng nhập email hợp lệ, tối đa 100 ký tự.');
  }
  if (!password.trim() || password.length < 6) throw new AuthApiError('Mật khẩu phải chứa ít nhất 6 ký tự và không chỉ gồm khoảng trắng.');
  return requestAuth('register', {
    username: trimmedUsername,
    email: trimmedEmail,
    password,
    fullName: trimmedFullName,
  }, options);
}

module.exports = { login, register };
