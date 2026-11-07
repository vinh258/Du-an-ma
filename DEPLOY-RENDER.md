# Đưa TVinhhh lên mạng bằng Render

Render lo phần **backend** và **frontend**. Render **không có MySQL** và **không giữ file upload** (gói free),
nên cần thêm 2 dịch vụ ngoài: một MySQL (ví dụ Aiven) và một nơi lưu file tương thích S3.

## 1. Đẩy code lên GitHub
Tạo repo, rồi ở thư mục gốc dự án (có `backend`, `frontend`, `render.yaml`):
```bash
git init
git add .
git commit -m "TVinhhh"
git branch -M main
git remote add origin https://github.com/<tên-bạn>/<tên-repo>.git
git push -u origin main
```
Kiểm tra trên GitHub **không có** file `.env` và thư mục `node_modules`.

## 2. Tạo MySQL trên mạng (Aiven, gói free)
1. Đăng ký https://aiven.io → tạo service **MySQL** gói Free.
2. Vào trang Overview, ghi lại: Host, Port, User, Password, Database (thường là `defaultdb`).

## 3. Tạo nơi lưu file (tương thích S3)
Dùng AWS S3, Cloudflare R2 hoặc Backblaze B2. Tạo 1 bucket (để **private**), tạo Access Key + Secret.
Ghi lại: region, tên bucket, access key, secret, và **endpoint** (nếu không dùng AWS S3).

## 4. Tạo dịch vụ trên Render
1. https://render.com → **New → Blueprint** → chọn repo vừa đẩy.
2. Điền các biến Render hỏi:
   - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` (từ Aiven)
   - `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_ENDPOINT` (từ bước 3)
   - `SEED_ADMIN_PASSWORD`: mật khẩu admin của bạn (đặt mạnh!)
   - `API_PUBLIC_URL`, `FRONTEND_URL`, `VITE_API_URL`: tạm điền `https://example.com`, sửa ở bước 5.
3. Bấm **Apply**, chờ build xong (vài phút).

## 5. Điền địa chỉ thật (làm 1 lần)
Xem địa chỉ 2 service trên Render (dạng `https://....onrender.com`), rồi vào:
- Service **api** → Environment: `API_PUBLIC_URL` = địa chỉ api, `FRONTEND_URL` = địa chỉ web.
- Service **web** → Environment: `VITE_API_URL` = địa chỉ api (không có dấu `/` cuối), rồi **Manual Deploy → Clear build cache & deploy** (biến này được nhúng lúc build).

## 6. Kiểm tra
- `https://<api>/api/docs` mở ra Swagger.
- `https://<web>` mở ra trang web; đăng nhập `admin@hub.local` + mật khẩu ở bước 4.

## Lưu ý gói Free
- Service **ngủ sau 15 phút không có truy cập**; lần truy cập đầu tiên mất khoảng 1 phút để thức dậy. Hãy mở trang trước giờ demo vài phút.
- Ổ đĩa tạm: file ghi trên Render bị xóa khi ngủ/deploy, vì vậy **bắt buộc** dùng S3 (bước 3).
- Cổng SMTP bị chặn nên email quên mật khẩu không gửi được; trang web hiện link đặt lại ngay (`SHOW_DEV_RESET_LINK=true`).
- Sau khi bảng đã được tạo xong, bạn có thể đổi `DB_SYNCHRONIZE=false` để tránh TypeORM tự đổi cấu trúc bảng.
