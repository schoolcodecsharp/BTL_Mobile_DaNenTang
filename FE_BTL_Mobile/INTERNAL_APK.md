# APK dùng backend nội bộ

Backend phải chạy trên máy tính, điện thoại phải truy cập được địa chỉ backend qua cùng mạng LAN.
Mở `http://IP_MAY_TINH:5257/api-docs` trong trình duyệt điện thoại trước khi cài để kiểm tra kết nối.

Trong PowerShell tại thư mục `FE_BTL_Mobile`, chạy:

```powershell
./scripts/build-internal-apk.ps1 -BackendUrl http://192.168.1.4:5257
```

Script yêu cầu Android project đã được tạo, JDK và Android SDK đã cấu hình.
Địa chỉ API chỉ áp dụng cho tiến trình build, không thay đổi `.env.local` của web/Expo Go.
Script cho phép HTTP riêng với host backend được chọn trong cấu hình Android.
APK nằm ở `android/app/build/outputs/apk/release/app-release.apk`.
Build release hiện dùng khóa debug sẵn có của dự án để thử nghiệm nội bộ.

APK chứa sẵn IP lúc build, không tự lấy IP Expo. Khi IP thay đổi, build và cài lại APK.
Nếu điện thoại kết nối hotspot của máy tính, dùng địa chỉ của adapter hotspot (ví dụ `192.168.137.1`).
APK không cần Metro/Expo chạy; backend và MySQL vẫn phải chạy.
