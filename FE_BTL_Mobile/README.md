# Frontend To-Do List

Expo SDK 57, React Native và Expo Router. Xem [hướng dẫn của dự án](../README.md) để cấu hình backend, URL API và kiểm tra toàn bộ dự án.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run web
```

Lệnh thường dùng:

- `npm start`: mở Expo dev server.
- `npm run android` / `npm run ios`: mở ứng dụng trên nền tảng tương ứng (iOS simulator yêu cầu macOS).
- `npm run lint`: kiểm tra JavaScript/TypeScript bằng ESLint.
- `npm run typecheck`: kiểm tra các file TypeScript.
- `npm test`: chạy kiểm thử API và validation của biểu mẫu xác thực.
- `npx expo export --platform all`: kiểm tra đóng gói Android, iOS và web.
