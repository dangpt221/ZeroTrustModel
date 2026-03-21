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
│  Notifications │ Roles │ Departments         │
└──────────────────┬──────────────────────────┘
                   │ MongoDB
┌──────────────────▼──────────────────────────┐
│              MongoDB Database                 │
│  Users │ Roles │ Departments │ Documents      │
│  Messages │ Notifications │ AuditLogs         │
│  Attendance │ Devices │ Sessions             │
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
- `GET /api/documents/:id/download` — Download tài liệu

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

- **Password Policy**: Ít nhất 6 ký tự, mã hóa bcrypt
- **MFA Enforcement**: 2FA TOTP cho tất cả người dùng
- **Rate Limiting**: Giới hạn request tránh brute-force
- **Document Classification**: 4 mức — INTERNAL, CONFIDENTIAL, RESTRICTED, PUBLIC
- **Security Levels**: 3 mức bảo mật tài liệu (1-3)
- **Security Code**: Mã 6 số cho phòng chat nhạy cảm
- **Auto-lock**: Khóa tài khoản khi trust score < ngưỡng
