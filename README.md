# TVinhhh

Hệ thống quản lý và chia sẻ tài liệu học tập: **React + TypeScript + Tailwind** (frontend), **NestJS + TypeORM + MySQL** (backend), Socket.io cho thông báo realtime.

## Chạy dự án

Yêu cầu: Node.js 18+, MySQL 8.

### 1. Database
Mở MySQL Workbench, chạy file `backend/database/init.sql` (tạo database `academic_hub`, utf8mb4).
Các bảng sẽ được tự tạo khi backend chạy lần đầu.

### 2. Backend
```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env  → rồi sửa DB_PASSWORD
npm install
npm run start:dev           # chạy tại http://localhost:3000/api/v1
```
Lần chạy đầu tự tạo: tài khoản admin và dữ liệu khoa/môn học mẫu.

| Tài khoản | Email | Mật khẩu |
|---|---|---|
| Admin | admin@hub.local | Admin@123 |

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # mở http://localhost:5173
```

## Tài liệu API (Swagger)
Sau khi chạy backend, mở **http://localhost:3000/api/docs** để xem và thử toàn bộ API.
Với API cần đăng nhập: gọi `POST /auth/login` → copy `accessToken` → bấm nút **Authorize** → dán token.

## Sửa / xóa
- Người đăng: **Sửa** tiêu đề, mô tả, môn học, tag và có thể **thay file** (PATCH `/documents/:id`, multipart). Sau khi sửa, tài liệu quay lại trạng thái chờ duyệt. Người đăng cũng có thể **xóa** bài của mình.
- **Quản trị viên (ADMIN)** xóa được bài của mọi người (DELETE `/documents/:id?reason=...`); người đăng nhận thông báo kèm lý do.
- Bình luận: người viết có thể **sửa** (PATCH `/comments/:id`) hoặc xóa; Mod/Admin xóa được bình luận của mọi người.

## Tính năng dành cho quản trị viên (menu **Quản trị hệ thống**)
- **Tổng quan:** số liệu người dùng/tài liệu/lượt tải, biểu đồ theo ngày (7/30/90 ngày), tỷ lệ duyệt, tài liệu theo khoa, top người đóng góp, top tài liệu tải nhiều.
- **Người dùng:** đổi quyền, khóa/mở khóa, chỉnh điểm uy tín, **xuất CSV** (mở được bằng Excel).
- **Tài liệu:** xem mọi tài liệu, lọc theo trạng thái, **chọn nhiều bài để duyệt / từ chối / xóa hàng loạt**, xuất CSV.
- **Tag:** đổi tên, xóa, **gộp tag trùng nghĩa**.
- **Nhật ký (Audit log):** ai đã làm gì, lúc nào (duyệt/từ chối/xóa bài, đổi quyền, khóa user, chỉnh điểm, sửa khoa/môn/tag, xuất dữ liệu...).
- **Thông báo chung:** gửi tới mọi người dùng, hiện realtime.
- Kiểm duyệt viên cũng có **duyệt/từ chối hàng loạt** ngay trong hàng đợi.

## Tính năng cho người dùng
- Trang chủ có **Xu hướng tuần này** (tải nhiều nhất 7 ngày); trang tài liệu có **Tài liệu liên quan** (cùng tag/môn học) và **xem trước PDF** ngay trên trang.
- **Quên mật khẩu / đổi mật khẩu.** Nếu chưa cấu hình SMTP, link đặt lại được hiện ngay trên trang (chế độ phát triển) và in ra console backend.
- **Tóm tắt bằng AI** (tuỳ chọn): điền `ANTHROPIC_API_KEY` trong `backend/.env` thì người đăng/Mod/Admin thấy nút "Tạo tóm tắt" ở trang tài liệu (kèm gợi ý tag). Không có key thì tính năng tự ẩn.

## Bảo mật & kỹ thuật
- **Giới hạn tần suất API** (`THROTTLE_LIMIT`, mặc định 300 lần/phút/IP; đăng nhập/đăng ký/quên mật khẩu 10 lần/phút).
- **Test tự động:** `cd backend && npm test` (kiểm tra logic duyệt tài liệu, điểm uy tín, đánh giá).
- **Docker:** `docker compose up --build` rồi mở http://localhost:5173 (xem `docker-compose.yml`; có thể tạo file `.env` ở thư mục gốc từ `.env.example` để đổi mật khẩu/khóa).

## Đưa lên mạng
Xem hướng dẫn từng bước trong **DEPLOY-RENDER.md** (Render + MySQL ngoài + nơi lưu file S3). Cấu hình mẫu nằm ở `render.yaml`.

## Giao diện
- Sidebar bên trái (thu gọn thành menu kéo ra trên điện thoại), logo **TVinhhh** nhảy từng chữ khi rê chuột.
- Nút mặt trời/mặt trăng ở góc trên phải để đổi sáng/tối (nhớ lựa chọn, mặc định theo hệ thống).
- Trang chủ có các từ khóa bay lơ lửng, bấm vào là tìm luôn.

## Thử nhanh
1. Đăng ký tài khoản sinh viên → **Đăng tài liệu** (PDF/Word ≤ 20MB).
2. Đăng nhập admin → menu **Kiểm duyệt** → Duyệt / Từ chối (kèm lý do).
3. Sinh viên nhận thông báo realtime (chuông trên thanh menu) và được +10 điểm uy tín.
4. Admin vào **Quản trị** để đổi quyền (Mod/Admin), khóa user, quản lý khoa/môn.
> Muốn có nhiều tài khoản Mod: đăng ký rồi dùng admin đổi quyền sang "Kiểm duyệt". Mod/Admin không thể tự duyệt tài liệu của chính mình.

## Cấu hình quan trọng (`backend/.env`)
- `DB_SYNCHRONIZE=true`: tự tạo/cập nhật bảng (chỉ nên dùng khi phát triển). Khi nộp/triển khai nên đặt `false` và dùng migration.
- `STORAGE_DRIVER=local`: file lưu trong `backend/uploads/` (chạy ngay, không cần AWS). Đổi sang `s3` và điền `AWS_*` để lưu trên S3.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: hãy đổi sang chuỗi ngẫu nhiên riêng.

## Tìm kiếm full-text
Backend tự tạo FULLTEXT index trên `title`, `description` và nội dung trích xuất từ PDF/DOCX. Với MySQL 8 dùng parser `ngram` (phù hợp tiếng Việt). Nếu `ngram` không có, hệ thống tự dùng parser mặc định.

## Cấu trúc
```
backend/src
  common/          enums, guards (JWT, Roles), decorators, pagination
  modules/
    auth/ users/ reputation/ catalog/ storage/
    documents/ moderation/ interactions/ notifications/ seed/
frontend/src
  auth/ components/ lib/ pages/
```

## Điểm uy tín
+10 tài liệu được duyệt · −5 bị từ chối · −20 bị xác nhận vi phạm (sau báo cáo) · +1 khi nhận lượt đánh giá 5 sao đầu tiên từ một người. Admin có thể cộng/trừ thủ công. Mọi biến động được ghi trong bảng `reputation_logs`.

## API
Tiền tố `/api/v1`. Auth: `/auth/*` · Người dùng: `/users/*`, `/admin/users/*` · Danh mục: `/faculties`, `/subjects`, `/tags` · Tài liệu: `/documents/*` · Kiểm duyệt: `/moderation/*` · Tương tác: rating, comments, bookmark · Thông báo: `/notifications/*` + Socket.io namespace `/notifications`.
