/**
 * Generic API helper for backend calls.
 * Base URL is read from EXPO_PUBLIC_API_URL (set in .env.local).
 */

const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Token store — set by AuthSessionProvider via setApiToken()
let _authToken = null;

export function setApiToken(token) {
  _authToken = token ?? null;
}

function getBaseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!url) throw new ApiError('Chưa cấu hình EXPO_PUBLIC_API_URL trong .env.local.');
  return url;
}

function parseError(data, status) {
  if (status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const msgs = Object.values(data.errors).flat().filter((v) => typeof v === 'string');
    if (msgs.length) return msgs.join('\n');
  }
  return status === 401
    ? 'Thông tin đăng nhập không đúng.'
    : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}

export async function apiFetch(path, options = {}) {
  const baseUrl = getBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  // Attach Bearer token if available
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    // 204 No Content
    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* html / empty */ }

    if (!res.ok) throw new ApiError(parseError(data, res.status), res.status);
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (controller.signal.aborted) throw new ApiError('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    throw new ApiError('Không thể kết nối máy chủ. Kiểm tra mạng và địa chỉ API.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upload files using multipart/form-data.
 * @param {Array<{uri: string, name: string, type: string, file?: File}>} files
 */
export async function apiUpload(files) {
  const baseUrl = getBaseUrl();
  const form = new FormData();
  files.forEach((f) => {
    if (f.file) form.append('file', f.file, f.name);
    else form.append('file', { uri: f.uri, name: f.name, type: f.type });
  });

  // Expo SDK 57's global fetch cannot encode React Native URI file parts.
  // XMLHttpRequest uses the native multipart transport and reads the local file.
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${baseUrl}/api/upload`);
    request.timeout = 30000;
    request.setRequestHeader('Accept', 'application/json');
    if (_authToken) request.setRequestHeader('Authorization', `Bearer ${_authToken}`);
    // Let the transport set Content-Type together with the multipart boundary.
    request.onload = () => {
      let data = null;
      try { data = JSON.parse(request.responseText); } catch { /* empty */ }
      if (request.status < 200 || request.status >= 300) {
        reject(new ApiError(parseError(data, request.status), request.status));
      } else {
        resolve(data);
      }
    };
    request.onerror = () => reject(new ApiError('Không thể tải file lên. Kiểm tra mạng và địa chỉ API.'));
    request.ontimeout = () => reject(new ApiError('Upload quá lâu. Vui lòng thử lại.'));
    request.onabort = () => reject(new ApiError('Đã hủy tải file lên.'));
    request.send(form);
  });
}
