# Chạy To-Do-List trên điện thoại Android

## Địa chỉ hiện tại

- Backend trên máy tính: `http://192.168.1.3:5257`
- Swagger: `http://192.168.1.3:5257/api-docs/`
- Máy tính và điện thoại phải cùng Wi-Fi. Backend và MySQL phải chạy khi sử dụng ứng dụng.

## Chạy lại backend

Mở PowerShell và chạy:

```powershell
cd D:\BTL_Mobile_Da_Nen_Tang\BE_BTL_Mobile
npm run db:migrate
npm start
```

Giữ cửa sổ này mở. Khi thấy `Database connected.` và `Server running on port 5257`,
mở địa chỉ Swagger ở trên trong trình duyệt điện thoại để kiểm tra kết nối.
Nếu MySQL đang tắt, hãy khởi động MySQL trước khi chạy các lệnh này.

## Sử dụng APK

APK đã cấu hình cho IP hiện tại: `FE_BTL_Mobile/dist/To-Do-List-192.168.1.3.apk`.
Bản này chứa bundle FE hiện tại và cấu hình HTTP đến `192.168.1.3`,
được đóng gói lại từ APK release gốc, kiểm tra tương thích Hermes và ký bằng cùng khóa thử nghiệm.
Hai đường gửi broadcast nội bộ của thông báo Android được sửa để dùng hàng đợi foreground;
không thay đổi quyền, dữ liệu ứng dụng hoặc các thư viện native khác.
Thay đổi nguồn được lưu tại `FE_BTL_Mobile/patches/expo-notifications+57.0.21.patch`
và áp dụng bằng `npm install`/`npm ci` trước khi build native mới.

Mở To-Do-List trên điện thoại và đăng nhập hoặc đăng ký.
APK release có sẵn giao diện, không cần chạy Expo hoặc Metro.
Sau khi cài xong, không cần dây USB để dùng qua Wi-Fi.

## Khi IP máy tính thay đổi

Chạy `ipconfig` trên máy tính và lấy IPv4 của adapter Wi-Fi.
Không dùng địa chỉ Radmin VPN hoặc `localhost` cho điện thoại.

Sửa `FE_BTL_Mobile/.env.local`:

```dotenv
EXPO_PUBLIC_API_URL=http://IP_WIFI_MOI:5257
```

Thay `IP_WIFI_MOI` bằng IP thực tế. Với APK đã cài, chỉ sửa `.env.local`
không đủ: cần build và cài lại vì địa chỉ backend được đóng gói trong APK.

Build trên máy tính này bằng PowerShell:

```powershell
cd D:\BTL_Mobile_Da_Nen_Tang\FE_BTL_Mobile
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\truon\AppData\Local\Android\Sdk'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
# Chỉ chạy prebuild nếu chưa có thư mục android.
npx expo prebuild --platform android --no-install
./scripts/build-internal-apk.ps1 -BackendUrl http://IP_WIFI_MOI:5257
```

APK được tạo tại `FE_BTL_Mobile/android/app/build/outputs/apk/release/app-release.apk`.
Để cập nhật qua USB, bật USB debugging và Cài đặt qua USB trên điện thoại,
chấp nhận thông báo cho phép máy tính, rồi chạy:

```powershell
& 'C:\Users\truon\AppData\Local\Android\Sdk\platform-tools\adb.exe' devices
& 'C:\Users\truon\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r '.\android\app\build\outputs\apk\release\app-release.apk'
```

Nếu nhiều thiết bị kết nối, thêm `-s SERIAL` trước `install` để chọn đúng điện thoại.

## Kiểm tra khi không kết nối được

1. Mở Swagger bằng trình duyệt trên máy tính, rồi trên điện thoại.
2. Nếu cả hai không mở được: kiểm tra backend và MySQL đã chạy chưa.
3. Nếu chỉ điện thoại không mở được: kiểm tra cùng Wi-Fi, IP và quyền mạng của backend trong firewall.
4. Nếu Swagger mở được nhưng ứng dụng không kết nối: kiểm tra APK đã được build với đúng IP và đã cài bản mới chưa.

Không tắt toàn bộ firewall để thử kết nối. Chỉ cho phép backend trên cổng cần dùng.

## Kiểm tra thông báo

1. Vào **Cá nhân → Thông báo**, bật nhắc công việc.
2. Bấm **Thử thông báo sau 10 giây**. Chỉ khi app báo đã đặt lịch, về màn hình chính bằng nút Home và chờ. Không buộc dừng ứng dụng.
3. Kiểm tra thanh thông báo Android. Mở lại app → Trang chủ → biểu tượng chuông để xem lịch sử thông báo thử đã nhận.
4. Để thử nhắc việc thật, tạo công việc chưa hoàn thành với hạn sau 2–3 phút, chọn nhắc **Đúng hạn**. Công việc đã quá hạn, không có hạn hoặc đã hoàn thành không tạo lịch nhắc mới.
5. Tắt nhắc công việc, bật lại rồi thử thông báo lần nữa. Có thể lặp lại vài lần; công tắc không phải chờ đọc/đặt lịch nhắc chạy nền. Nút thử là thao tác kiểm tra riêng, vẫn dùng được khi nhắc công việc đang tắt.

Nếu chưa có quyền, vào **Cài đặt Android → Ứng dụng → To-Do-List** để kiểm tra Thông báo và Báo thức & lời nhắc. Nếu app vẫn báo điện thoại không phản hồi khi đọc/đặt lịch nhắc, ghi lại nguyên dòng lỗi và kiểm tra đã cài APK mới; không xóa app hoặc dữ liệu và không cần khởi động lại máy để thao tác bật/tắt bình thường.

Thông báo cá nhân được Android đặt lịch trên thiết bị. Thông báo nhóm hiện được kiểm tra từ backend khi app đang mở; backend chưa có dịch vụ push FCM/Expo để gửi sự kiện nhóm khi app đã đóng. Danh sách chuông lưu thông báo đã nhận, không phải danh sách mọi công việc.
