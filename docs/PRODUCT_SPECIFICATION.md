# ZeroTrust Platform - Tài liệu Mô tả Sản phẩm

## 1. Tổng quan sản phẩm

**ZeroTrust Platform** là hệ thống quản lý doanh nghiệp tích hợp mô hình bảo mật Zero Trust — "Không bao giờ tin tưởng, luôn xác minh". Hệ thống được xây dựng trên kiến trúc full-stack với Node.js (Express + MongoDB) backend và React (TypeScript + Vite) frontend.

---

## 2. Các ứng dụng & Tính năng chính

### 2.1. Quản trị hệ thống (Admin Dashboard)

- **Dashboard Analytics**: Biểu đồ thống kê người dùng, hoạt động, tài liệu, cảnh báo theo thời gian thực
- **Quản lý người dùng (CRUD)**: Tạo, chỉnh sửa, khóa/mở khóa, phê duyệt tài khoản
- **Quản lý vai trò & phân quyền (RBAC)**: Hệ thống 4 vai trò — ADMIN, MANAGER, STAFF, GUEST — với permission riêng biệt
- **Quản lý tài liệu**: Upload/download tài liệu với phân loại độ nhạy cảm (LOW/MEDIUM/HIGH/CRITICAL), mức bảo mật (1-3), phân quyền theo vai trò và phòng ban
- **Quản lý phòng ban**: Tạo/sửa/xóa phòng ban, gán nhân viên
- **Chat Management**: Giám sát và quản lý phòng chat, tin nhắn, chính sách chat (Security Code)
- **Notification Management**: Gửi thông báo hệ thống đến người dùng
- **Audit Logs**: Nhật ký hoạt động chi tiết theo thời gian, vai trò, mức rủi ro
- **Trust Score Dashboard**: Điểm tin cậy tổng thể của hệ thống

### 2.2. Quản lý nhân viên (Manager Dashboard)

- **Team Dashboard**: Thống kê hoạt động đội nhóm, biểu đồ hiệu suất
- **Nhật ký hoạt động (Activity Log)**: Theo dõi hành vi nhân viên — đăng nhập, truy cập tài liệu, chat
- **Attendance Management**: Chấm công hàng ngày, xem lịch sử chấm công
- **Trust Score cá nhân**: Điểm tin cậy theo thiết bị, MFA, hành vi
- **Hồ sơ cá nhân**: Cập nhật thông tin, đổi ảnh đại diện
- **Chat nội bộ**: Nhắn tin với Staff trong đội nhóm
- **Thông báo**: Nhận thông báo từ hệ thống và chat

### 2.3. Nhân viên (Staff Portal)

- **Dashboard cá nhân**: Tổng quan hoạt động, thông báo, cảnh báo
- **Attendance**: Chấm công hàng ngày (check-in/check-out)
- **Trust Score**: Theo dõi điểm tin cậy cá nhân
- **Thiết bị tin cậy (Trusted Devices)**: Quản lý thiết bị đã đăng nhập
- **Hồ sơ cá nhân**: Cập nhật thông tin, đổi ảnh đại diện
- **Chat nội bộ**: Nhắn tin với Manager và Staff
- **Thông báo**: Nhận thông báo từ hệ thống

### 2.4. Nhắn tin (Messaging)

- **Real-time Chat**: Giao tiếp theo thời gian thực qua Socket.IO
- **Phòng chat đa dạng**: Phòng công khai, phòng riêng (Security Code), DM giữa cá nhân
- **Reaction tin nhắn**: Biểu cảm 6 icon (👍 ❤️ 😮 😢 😠 😂)
- **Reply tin nhắn**: Trả lời tin nhắn cụ thể
- **Gợi ý @mention**: Tag người dùng khi nhắn tin
- **Search tin nhắn**: Tìm kiếm nội dung trong lịch sử chat
- **Pin/Unpin phòng**: Ghim phòng chat quan trọng
- **Security Code**: Mã bảo mật cho phòng nhạy cảm

### 2.5. Xác thực & Bảo mật

- **Đăng nhập đa bước**: Email + Password + MFA (TOTP 2FA)
- **Trust Score**: Tính điểm tin cậy dựa trên MFA, thiết bị, hành vi
- **Khóa tài khoản**: Tự động khóa khi vi phạm chính sách
- **Session management**: Quản lý phiên đăng nhập

---

## 3. Công nghệ bảo mật tích hợp

### 3.1. Mô hình Zero Trust

| Nguyên tắc | Triển khai |
|-------------|-----------|
| Never Trust, Always Verify | MFA bắt buộc, xác minh mọi request |
| Least Privilege Access | RBAC với permission chi tiết theo vai trò |
| Assume Breach | Audit log ghi lại mọi hành vi |
| Verify Explicitly | Trust Score dựa trên MFA, thiết bị, IP |
| Continuous Verification | Kiểm tra trust score theo thời gian thực |

### 3.2. Công nghệ & Thư viện

#### Backend
- **Node.js + Express**: Server runtime
- **MongoDB + Mongoose**: Cơ sở dữ liệu NoSQL
- **Socket.IO**: Real-time communication
- **JWT (jsonwebtoken)**: Stateless authentication
- **bcryptjs**: Mã hóa mật khẩu
- **multer**: Upload file (tài liệu, avatar)
- **express-rate-limit**: Chống brute-force
- **helmet**: HTTP security headers
- **cors**: Cross-origin policy

#### Frontend
- **React 18 + TypeScript**: UI framework
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **Recharts**: Biểu đồ thống kê
- **Lucide React**: Icons
- **Framer Motion**: Animation

#### Security Libraries
- **TOTP (otplib)**: Xác thực 2FA
- **QRCode**: Mã QR cho MFA setup
- **uuid**: Tạo session ID duy nhất
- **crypto (Node.js built-in)**: AES-256-GCM file encryption
- **express-rate-limit**: Chống brute-force + download rate limiting

### 3.3. Các lớp bảo mật nâng cao

#### Encryption at Rest (AES-256-GCM)
- Mã hóa file tài liệu trước khi lưu trữ bằng AES-256-GCM
- Master key tự động sinh, lưu tại `.encryption_key` (chmod 600)
- Upload file mã hóa: `POST /api/documents/upload/encrypted`
- Download + giải mã on-the-fly: `GET /api/documents/:id/download/encrypted`
- Ngay cả khi hacker chiếm server, file vẫn không đọc được

#### Honeytoken (File Bait)
- Tạo file/tài liệu giả để phát hiện data breach
- Hỗ trợ 5 loại: DOCUMENT, CREDENTIAL, API_KEY, FILE, LINK
- Tự động cảnh báo email + webhook + audit log khi bị trigger
- Log chi tiết: IP, user-agent, hành động, timestamp
- Auto-expiry: honeytoken có thể tự hủy sau thời gian nhất định

#### MFA cho hành động nhạy cảm
- 10 hành động yêu cầu TOTP verify thêm:
  - Tải tài liệu CRITICAL
  - Xóa tài liệu CRITICAL
  - Khóa/Mở khóa tài khoản
  - Thay đổi cấu hình bảo mật
  - Xuất audit log
  - Truy cập dữ liệu hàng loạt
  - Tắt MFA
  - Đổi mật khẩu user khác
- Kiểm tra Trust Score: nếu score < ngưỡng → bắt buộc MFA
- Giảm trust score -5 khi MFA fail

#### DRM (Digital Rights Management)
- Phân quyền theo classification tài liệu:
  - **CONFIDENTIAL**: watermark bắt buộc, không copy, không in (level 3), expiry 7-30 ngày
  - **INTERNAL**: watermark nếu level 3, không share
  - **PUBLIC**: full access
- DRM actions: VIEW, DOWNLOAD, PRINT, COPY, EDIT, SHARE
- Watermark metadata gắn vào tài liệu
- Print limit cho tài liệu CRITICAL level 3
- Digital signature chống giả mạo DRM metadata

#### Download Rate Limiting
- Max 10 lần tải/phút (configurable)
- Block 5 phút nếu vượt quá giới hạn
- Cảnh báo khi đạt 7/10 lần trong cửa sổ
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`
- Admin có thể xem và reset rate limit của bất kỳ user nào

#### Forensic Watermarking
- Mỗi bản tải đều có watermark DUY NHẤT
- Watermark chứa: userId, userName, timestamp, IP hash, downloadId
- Visible watermark: hiển thị trên document (VD: "TOI: Nguyễn Văn A | 25/03/2026")
- Hidden watermark: embed vào PDF metadata (base64 encoded JSON)
- Cryptographic signature chống giả mạo watermark
- Dùng để truy vết nếu tài liệu bị leak ra internet
- Watermark logged vào audit mỗi lượt tải

#### Anomaly Detection (Phát hiện hành vi bất thường)
- **EXCESSIVE_DOWNLOAD**: Alert khi tải > 30 docs/ngày hoặc > 5x baseline
- **MASS_DOWNLOAD**: CRITICAL khi > 50 docs/ngày → tự động lock tài khoản
- **UNUSUAL_HOURS**: Alert khi tải vào 2h-6h sáng
- **RAPID_FIRE**: Alert khi tải > 5 docs trong 1 phút
- **EXCESSIVE_CRITICAL_ACCESS**: Alert khi truy cập > 5 docs CONFIDENTIAL/ngày
- **AFTER_HOURS**: Log khi tải sau giờ làm (20h-6h)
- Tự động gửi email cảnh báo cho admin
- CRITICAL anomaly → tự động khóa tài khoản

#### Document Fingerprinting
- Mỗi bản tải có hash DUY NHẤT (SHA-512)
- Gồm: content hash + userId + downloadId + nonce + timestamp
- Short fingerprint (8 ký tự) hiển thị trên document
- Full fingerprint embed vào PDF metadata
- Lưu fingerprint vào database để so sánh khi leak
- So sánh 2 document → xác định cùng nguồn hay khác nguồn

#### Time-Bounded Secure Download Link
- Link download có expiry (mặc định 1 giờ)
- JWT token với HS512 algorithm
- Nonce chống replay attack (link chỉ dùng được 1 lần)
- Max downloads count (mặc định 1 lần)
- Allow/share toggle (có cho phép share link không)
- Có thể revoke link bất kỳ lúc nào
- Revoke tất cả links của 1 document (khi cần)

#### Secure Streaming (Server-side Rendering)
- Document KHÔNG lưu trên máy user
- Server render → stream → watermark → gửi cho user
- Connection close = document mất
- Watermark real-time gắn vào stream
- Không cache trên browser (X-No-Store header)
- Không mở trong browser (X-Download-Options: noopen)
- Có thể revoke session bất kỳ lúc nào

#### Emergency Lock System
- **SYSTEM**: Khóa toàn bộ user (trừ Admin)
- **DOCUMENT**: Khóa tài liệu cụ thể
- **USER**: Khóa tài khoản cụ thể
- **DEPARTMENT**: Khóa tất cả user trong phòng ban
- **BREACH_DETECTED**: Full response - lock users + lock CONFIDENTIAL docs
- Auto-unlock sau X phút (tùy chọn)
- Gửi email alert cho tất cả admin
- Middleware check trước mỗi request

#### Screen Capture Prevention (Frontend)
- Disable right-click context menu
- Disable copy (Ctrl+C)
- Auto-blur khi tab không active
- Watermark overlay cố định trên document
- Print warning khi thử in
- Fingerprint watermark trong print output

---

## 4. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────┐
│              Frontend (React)               │
│  Admin | Manager | Staff | Messaging | Auth  │
└──────────────────┬──────────────────────────┘
                   │ HTTP + Socket.IO
┌──────────────────▼──────────────────────────┐
│           Backend (Express + Node)            │
│  Auth │ Users │ Documents │ Chat │ Audit      │
│  Notifications │ Roles │ Departments          │
│  Emergency │ Security │ Watermarking         │
└──────────────────┬──────────────────────────┘
                   │ MongoDB
┌──────────────────▼──────────────────────────┐
│              MongoDB Database                 │
│  Users │ Roles │ Departments │ Documents      │
│  Messages │ Notifications │ AuditLogs         │
│  Attendance │ Devices │ Sessions             │
│  Honeytoken                             │
└─────────────────────────────────────────────┘
```

---

## 5. Mô hình dữ liệu chính

| Model | Mô tả |
|-------|--------|
| User | Tài khoản người dùng, trust score, MFA, role |
| Role | Vai trò + permissions |
| Department | Phòng ban |
| Document | Tài liệu, phân loại, mức bảo mật |
| Message | Tin nhắn chat, reactions, replies |
| Notification | Thông báo hệ thống, ưu tiên |
| AuditLog | Nhật ký hoạt động, mức rủi ro |
| Honeytoken | File bait, trigger alerts, access logs |
| Attendance | Chấm công check-in/check-out |
| TrustedDevice | Thiết bị tin cậy |
| Session | Phiên đăng nhập |

---

## 6. API Endpoints chính

### Authentication
- `POST /api/auth/login` — Đăng nhập
- `POST /api/auth/mfa/verify` — Xác minh MFA
- `POST /api/auth/logout` — Đăng xuất
- `GET /api/auth/session` — Lấy session hiện tại

### Users
- `GET /api/users` — Danh sách người dùng
- `GET /api/users/:id` — Chi tiết người dùng
- `PUT /api/users/:id` — Cập nhật hồ sơ
- `POST /api/users/upload-avatar` — Upload avatar
- `POST /api/users/:id/lock` — Khóa tài khoản

### Documents
- `GET /api/documents` — Danh sách tài liệu
- `POST /api/documents/upload` — Upload tài liệu
- `POST /api/documents/upload/encrypted` — Upload file mã hóa AES-256
- `GET /api/documents/:id/download` — Download tài liệu (có DRM + Rate Limit)
- `GET /api/documents/:id/download/encrypted` — Download + giải mã on-the-fly
- `GET /api/documents/:id/download/watermarked` — Download với watermark + fingerprint
- `GET /api/documents/:id/stream` — Secure streaming (không lưu trên máy)
- `POST /api/documents/secure-link` — Tạo secure download link có expiry
- `GET /api/documents/secure-download?token=` — Download với secure link token
- `POST /api/documents/sensitive-action/verify` — MFA cho hành động nhạy cảm
- `POST /api/documents/verify-leak` — Verify fingerprint document bị leak

### Honeytoken (Admin)
- `POST /api/honeytoken` — Tạo honeytoken mới
- `GET /api/honeytoken` — Danh sách honeytoken
- `GET /api/honeytoken/:id` — Chi tiết honeytoken
- `PUT /api/honeytoken/:id` — Cập nhật honeytoken
- `DELETE /api/honeytoken/:id` — Xóa honeytoken
- `POST /api/honeytoken/:id/trigger` — Trigger alert (auto gọi khi bị truy cập)

### Emergency & Security (Admin)
- `GET /api/emergency/status` — Trạng thái emergency lock
- `POST /api/emergency/activate` — Kích hoạt emergency lock
- `POST /api/emergency/deactivate` — Hủy emergency lock
- `GET /api/emergency/anomaly-stats` — Thống kê anomaly
- `GET /api/emergency/active-links` — Danh sách secure links đang active
- `GET /api/emergency/active-sessions` — Danh sách document sessions
- `POST /api/emergency/revoke-link/:downloadId` — Revoke secure link

### Honeytoken (Admin)
- `POST /api/honeytoken` — Tạo honeytoken mới
- `GET /api/honeytoken` — Danh sách honeytoken
- `GET /api/honeytoken/:id` — Chi tiết honeytoken
- `PUT /api/honeytoken/:id` — Cập nhật honeytoken
- `DELETE /api/honeytoken/:id` — Xóa honeytoken
- `POST /api/honeytoken/:id/trigger` — Trigger alert (auto gọi khi bị truy cập)

### Chat
- `GET /api/messages?room=` — Tin nhắn theo phòng
- `POST /api/messages` — Gửi tin nhắn
- `DELETE /api/messages/:id` — Xóa tin nhắn

### Notifications
- `GET /api/notifications` — Danh sách thông báo
- `POST /api/notifications` — Tạo thông báo (Admin)
- `PUT /api/notifications/:id/read` — Đánh dấu đã đọc

### Audit
- `GET /api/audit` — Nhật ký hoạt động
- `GET /api/audit/export` — Export báo cáo

---

## 7. Chính sách bảo mật

### Xác thực & Ủy quyền
- **Password Policy**: Ít nhất 6 ký tự, mã hóa bcrypt
- **MFA Enforcement**: 2FA TOTP cho tất cả người dùng
- **MFA Sensitive Actions**: TOTP bắt buộc cho 10 hành động nhạy cảm (dựa trên Trust Score threshold)
- **Rate Limiting**: Giới hạn request tránh brute-force
- **Download Rate Limiting**: Max 10 lần/phút, block 5 phút nếu vượt quá
- **Anomaly Detection**: Phát hiện hành vi bất thường, tự động lock tài khoản

### Bảo mật Tài liệu
- **Document Classification**: 4 mức — INTERNAL, CONFIDENTIAL, RESTRICTED, PUBLIC
- **Security Levels**: 3 mức bảo mật tài liệu (1-3)
- **Encryption at Rest**: AES-256-GCM cho tất cả file tài liệu
- **DRM**: Watermark, print limit, expiry, copy protection theo classification
- **Forensic Watermark**: Mỗi bản tải có watermark DUY NHẤT để truy vết
- **Document Fingerprint**: Hash DUY NHẤT cho mỗi bản tải, so sánh khi leak
- **Secure Streaming**: Server-side render, không lưu trên máy user
- **Time-Bounded Links**: Download link có expiry, nonce chống replay

### Phát hiện & Ứng phó
- **Honeytoken**: File bait để phát hiện data breach
- **Emergency Lock**: Khóa hệ thống/tài liệu/user/department khi cần
- **Auto-lock**: Khóa tài khoản khi trust score < ngưỡng
- **Security Code**: Mã 6 số cho phòng chat nhạy cảm
- **Audit Log**: Ghi lại mọi hành động, IP, thiết bị, mức rủi ro

### Frontend Protection
- **Screen Capture Prevention**: Disable right-click, blur khi tab không active
- **Print Watermark**: Cảnh báo khi thử in document bảo mật
- **Secure Document Viewer**: Component bảo vệ với watermark overlay
