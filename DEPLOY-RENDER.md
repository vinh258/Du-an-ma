# Đưa TVinhhh lên mạng bằng Vercel, Render và Aiven

Triển khai **frontend trên Vercel**, **backend trên Render**, và dùng **Aiven MySQL** cho database.
Để demo, backend lưu file tạm trên ổ đĩa Render (`STORAGE_DRIVER=local`), nên không cần tạo S3/R2.
File upload có thể mất khi service khởi động lại hoặc deploy lại; cách này chỉ phù hợp để thử nghiệm.

## 1. Đẩy code lên GitHub
Đưa dự án lên GitHub và kiểm tra **không có** file `.env`, mật khẩu, khóa API hoặc thư mục `node_modules`.
Mỗi lần sửa code cần triển khai, commit và push lên branch đã kết nối với Render/Vercel.

## 2. Dùng MySQL trên Aiven
Trong trang Aiven của MySQL service, lấy Host, Port, User, Password và Database name.
Đảm bảo service đang chạy và thông tin kết nối cho phép backend Render truy cập.

## 3. Triển khai backend trên Render
1. Vào Render → **New → Blueprint** → kết nối repo GitHub có file `render.yaml` ở thư mục gốc.
2. Blueprint này chỉ tạo backend `tvinhhh-api`; điền các biến được Render yêu cầu:
   - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` từ Aiven.
   - `API_PUBLIC_URL`: tạm điền `https://example.com`; thay bằng domain backend sau khi tạo xong.
   - `FRONTEND_URL`: tạm điền `https://example.com`; thay bằng domain Vercel sau khi tạo xong.
   - `SEED_ADMIN_PASSWORD`: tự đặt mật khẩu mạnh và lưu lại.
3. Chọn **Apply** và chờ service build/deploy.
4. Khi biết domain backend dạng `https://ten-api.onrender.com`, vào service → **Environment** và sửa:
   - `API_PUBLIC_URL` thành domain backend, không có dấu `/` cuối.
   - Kiểm tra `STORAGE_DRIVER=local`.
5. Lưu thay đổi và chờ Render deploy lại.

Backend dùng `DB_SSL=true`. Blueprint đặt `DB_SSL_REJECT_UNAUTHORIZED=false` để thuận tiện demo. Nếu Aiven cung cấp CA certificate, nên cấu hình `DB_SSL_CA` để xác thực chứng chỉ an toàn hơn.

## 4. Triển khai frontend trên Vercel
1. Vào Vercel → **Add New → Project** → import cùng repo GitHub.
2. Đặt **Root Directory** là `frontend`, Framework Preset là **Vite**.
3. Đặt Build Command `npm run build`, Output Directory `dist`.
4. Thêm Environment Variable:
   - `VITE_API_URL` = domain backend Render, ví dụ `https://ten-api.onrender.com` (không thêm `/api/v1` hoặc dấu `/` cuối).
5. Chọn **Deploy** và ghi lại domain Vercel dạng `https://ten-web.vercel.app`.

## 5. Cập nhật domain và kiểm tra
1. Trong Render → backend → **Environment**, đặt `FRONTEND_URL` thành domain Vercel.
2. Lưu và chờ backend deploy lại.
3. Mở `https://<domain-backend>/api/docs`; nếu Swagger hiển thị thì API đang chạy.
4. Mở domain Vercel, thử đăng ký/đăng nhập và các chức năng cần cho buổi demo.
5. Nếu muốn thử upload, tải file lên rồi mở/tải file đó xuống. File có thể mất sau khi Render khởi động lại hoặc deploy lại.

## Lưu ý gói Free
- Service Render có thể ngủ khi không có truy cập; lần truy cập đầu tiên sau đó có thể mất khoảng một phút.
- Ổ đĩa Render là tạm thời; file upload có thể mất khi khởi động lại hoặc deploy. Để giữ file ổn định, chuyển sang S3/R2 và đặt `STORAGE_DRIVER=s3`.
- Cổng SMTP có thể bị chặn trên gói miễn phí; cấu hình demo bật `SHOW_DEV_RESET_LINK=true` để hiện link đặt lại mật khẩu.
- Backend tự tạo bảng lần đầu với `DB_SYNCHRONIZE=true`. Sau khi database sẵn sàng, cân nhắc đổi thành `false`.
- Không dùng dữ liệu/mật khẩu thật cho môi trường demo và không chia sẻ các biến bí mật.
