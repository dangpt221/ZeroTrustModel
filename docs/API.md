# Zero Trust Model - RESTful API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
- **Method**: JWT Token via Cookie
- **Cookie Name**: `auth_token`
- **Login Flow**: Email/Password → OTP Verification → JWT Token

## Response Format
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

---

## 1. Authentication API (`/auth`)

### POST /auth/login
Đăng nhập với email/password. Returns OTP challenge.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email |
| password | string | Yes | User password |
| mfaCode | string | No | OTP code (required for step 2) |

**Response (Step 1 - Need MFA):**
```json
{
  "needsMFA": true,
  "message": "Xác thực bảo mật là bắt buộc...",
  "riskScore": 85,
  "riskFactors": ["NEW_DEVICE"]
}
```

**Response (Success):**
```json
{
  "user": { "id": "...", "name": "...", "email": "...", "role": "ADMIN" },
  "riskScore": 95,
  "riskFactors": []
}
```

### POST /auth/logout
Đăng xuất và xóa auth cookie.

### GET /auth/me
Lấy thông tin user hiện tại.

**Response:**
```json
{
  "id": "...",
  "name": "Nguyễn Văn A",
  "email": "admin@example.com",
  "role": "ADMIN",
  "department": "Phòng IT",
  "avatar": "https://...",
  "mfaEnabled": true,
  "trustScore": 95,
  "status": "ACTIVE",
  "isOnline": true
}
```

### PUT /auth/profile
Cập nhật profile user hiện tại.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Tên mới |
| currentPassword | string | No | Mật khẩu hiện tại |
| newPassword | string | No | Mật khẩu mới |

---

## 2. User Management API (`/admin/users`, `/users`, `/manager/users`)

### Admin: Full User Management

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /admin/users | ADMIN | Lấy tất cả users |
| POST | /admin/users | ADMIN | Tạo user mới |
| PUT | /admin/users/:id | ADMIN | Cập nhật user |
| DELETE | /admin/users/:id | ADMIN | Xóa user |
| POST | /admin/users/:id/lock | ADMIN | Khóa/Mở user |
| POST | /admin/users/:id/approve | ADMIN | Phê duyệt user |
| POST | /admin/users/:id/reject | ADMIN | Từ chối user |
| POST | /admin/users/:id/mfa | ADMIN | Bật/Tắt MFA |
| POST | /admin/users/:id/reset-password | ADMIN | Reset password |

#### POST /admin/users
```json
{
  "name": "Nguyễn Văn B",
  "email": "user@example.com",
  "password": "password123",
  "role": "STAFF",
  "departmentId": " dept_id",
  "mfaEnabled": false
}
```

#### POST /admin/users/:id/lock
```json
{ "status": "LOCKED" } // hoặc "ACTIVE"
```

### Manager: Team Management

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /manager/users | ADMIN, MANAGER | Lấy danh sách thành viên trong team |
| PUT | /manager/users/:id | ADMIN, MANAGER | Cập nhật thành viên |
| POST | /manager/users/:id/lock | ADMIN, MANAGER | Khóa thành viên |

### Public User Routes

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /users | Auth | Lấy danh sách users |
| GET | /users/:id | Auth | Lấy chi tiết user |

---

## 3. Role & Permission API (`/admin/roles`, `/roles`, `/permissions`)

### GET /admin/roles
Lấy tất cả roles.

**Response:**
```json
[
  { "id": "...", "name": "ADMIN", "description": "...", "permissions": [...], "color": "bg-red-500" }
]
```

### POST /admin/roles
Tạo role mới.

```json
{
  "name": "MANAGER",
  "description": "Quản lý",
  "permissions": ["USER_VIEW", "PROJECT_VIEW", "DEPT_VIEW"],
  "color": "bg-blue-500"
}
```

### PUT /admin/roles/:id
Cập nhật role.

### DELETE /admin/roles/:id
Xóa role.

### GET /admin/permissions
Lấy tất cả permissions có sẵn trong hệ thống.

**Permissions List:**
| Code | Name | Description |
|------|------|-------------|
| USER_VIEW | Xem người dùng | Xem danh sách người dùng |
| USER_CREATE | Tạo người dùng | Tạo mới người dùng |
| USER_EDIT | Sửa người dùng | Chỉnh sửa thông tin người dùng |
| USER_DELETE | Xóa người dùng | Xóa người dùng |
| USER_APPROVE | Phê duyệt người dùng | Phê duyệt đăng ký mới |
| ROLE_VIEW | Xem vai trò | Xem danh sách vai trò |
| ROLE_MANAGE | Quản lý vai trò | Tạo/sửa/xóa vai trò |
| DEPT_VIEW | Xem phòng ban | Xem danh sách phòng ban |
| DEPT_CREATE | Tạo phòng ban | Tạo mới phòng ban |
| DEPT_EDIT | Sửa phòng ban | Chỉnh sửa phòng ban |
| DEPT_DELETE | Xóa phòng ban | Xóa phòng ban |
| PROJECT_VIEW | Xem dự án | Xem danh sách dự án |
| PROJECT_CREATE | Tạo dự án | Tạo mới dự án |
| PROJECT_EDIT | Sửa dự án | Chỉnh sửa dự án |
| PROJECT_DELETE | Xóa dự án | Xóa dự án |
| DOC_VIEW | Xem tài liệu | Xem tài liệu |
| DOC_UPLOAD | Tải lên tài liệu | Tải lên tài liệu mới |
| DOC_APPROVE | Phê duyệt tài liệu | Phê duyệt tài liệu |
| DOC_DELETE | Xóa tài liệu | Xóa tài liệu |
| ATTENDANCE_VIEW | Xem chấm công | Xem lịch sử chấm công |
| ATTENDANCE_MANAGE | Quản lý chấm công | Quản lý chấm công |
| AUDIT_VIEW | Xem nhật ký | Xem nhật ký hoạt động |
| ZT_VIEW | Xem cấu hình bảo mật | Xem cấu hình Zero Trust |
| ZT_MANAGE | Quản lý bảo mật | Thay đổi cấu hình bảo mật |
| NOTIF_SEND | Gửi thông báo | Gửi thông báo hệ thống |

---

## 4. Department API (`/departments`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /departments | Auth | Lấy tất cả phòng ban |
| GET | /departments/:id | Auth | Lấy chi tiết phòng ban |
| POST | /departments | ADMIN | Tạo phòng ban mới |
| PUT | /departments/:id | ADMIN | Cập nhật phòng ban |
| DELETE | /departments/:id | ADMIN | Xóa phòng ban |

### POST /departments
```json
{
  "name": "Phòng Marketing",
  "description": "Phòng Marketing công ty"
}
```

---

## 5. Team API (`/teams`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /teams | Auth | Lấy tất cả teams |
| GET | /teams/:id | Auth | Lấy chi tiết team |
| POST | /teams | ADMIN, MANAGER | Tạo team mới |
| PUT | /teams/:id | ADMIN, MANAGER | Cập nhật team |
| DELETE | /teams/:id | ADMIN | Xóa team |
| POST | /teams/:id/members | ADMIN, MANAGER | Thêm thành viên |
| DELETE | /teams/:id/members/:userId | ADMIN, MANAGER | Xóa thành viên |

---

## 6. Project API (`/projects`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /projects | Auth | Lấy tất cả dự án |
| GET | /projects/:id | Auth | Lấy chi tiết dự án |
| POST | /projects | ADMIN, MANAGER | Tạo dự án mới |
| PUT | /projects/:id | ADMIN, MANAGER | Cập nhật dự án |
| DELETE | /projects/:id | ADMIN | Xóa dự án |
| GET | /projects/:projectId/tasks | Auth | Lấy tasks của dự án |
| POST | /projects/:projectId/tasks | Auth | Tạo task mới |
| PUT | /tasks/:taskId | Auth | Cập nhật task |

### POST /projects
```json
{
  "title": "Dự án A",
  "description": "Mô tả dự án",
  "status": "IN_PROGRESS",
  "departmentId": "dept_id",
  "managerId": "user_id",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

### POST /projects/:projectId/tasks
```json
{
  "title": "Task 1",
  "description": "Mô tả task",
  "status": "TODO",
  "assignedTo": "user_id"
}
```

---

## 7. Document API (`/documents`, `/documents-stats`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /documents | Auth | Lấy danh sách tài liệu |
| GET | /documents/:id | Auth | Lấy chi tiết tài liệu |
| POST | /documents/upload | Auth | Upload file lên server |
| POST | /documents | ADMIN, MANAGER, STAFF, MEMBER | Tạo tài liệu mới |
| PUT | /documents/:id | Auth | Cập nhật tài liệu |
| POST | /documents/:id/upload | Auth | Upload phiên bản mới |
| DELETE | /documents/:id | ADMIN, MANAGER | Xóa tài liệu |
| POST | /documents/:id/approve | ADMIN, MANAGER | Phê duyệt tài liệu |
| POST | /documents/:id/reject | ADMIN, MANAGER | Từ chối tài liệu |
| GET | /documents/:id/download | Auth | Download tài liệu |
| GET | /documents-stats/stats | ADMIN, MANAGER | Thống kê tài liệu |

### Query Parameters (GET /documents)
| Param | Type | Description |
|-------|------|-------------|
| search | string | Tìm kiếm theo tên |
| department | string | Lọc theo phòng ban |
| project | string | Lọc theo dự án |
| status | string | Lọc theo trạng thái |
| classification | string | Lọc theo mức độ bảo mật |
| sensitivity | string | Lọc theo độ nhạy cảm |
| page | number | Số trang |
| limit | number | Số item/trang |

### POST /documents
```json
{
  "title": "Tài liệu A",
  "type": "REPORT",
  "status": "DRAFT",
  "description": "Mô tả",
  "departmentId": "dept_id",
  "projectId": "project_id",
  "fileUrl": "/uploads/documents/filename.pdf",
  "fileName": "filename.pdf",
  "fileSize": 1024000,
  "fileType": "PDF",
  "classification": "INTERNAL",  // INTERNAL, CONFIDENTIAL, SECRET
  "sensitivity": 1  // 1, 2, 3
}
```

### Response (List)
```json
{
  "documents": [
    {
      "id": "...",
      "title": "Tài liệu A",
      "type": "REPORT",
      "status": "APPROVED",
      "classification": "INTERNAL",
      "sensitivity": 1,
      "departmentName": "Phòng IT",
      "uploadedByName": "Nguyễn Văn A",
      "fileUrl": "/uploads/documents/...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

---

## 8. Attendance API (`/attendance`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /attendance/check-in | Auth | Check in |
| POST | /attendance/check-out | Auth | Check out |
| GET | /attendance/history | Auth | Lịch sử chấm công |

### POST /attendance/check-in
```json
{
  "location": "Văn phòng Hà Nội",
  "device": "Laptop"
}
```

### Response
```json
{
  "id": "...",
  "type": "CHECK_IN",
  "timestamp": "2024-01-01T09:00:00Z",
  "location": "Văn phòng Hà Nội",
  "device": "Laptop"
}
```

---

## 9. Chat/Messages API (`/messages`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /messages | Auth | Lấy tin nhắn (có thể lọc theo room) |

### GET /messages
| Param | Type | Description |
|-------|------|-------------|
| room | string | Tên phòng chat |

### Response
```json
[
  {
    "id": "...",
    "userId": "...",
    "userName": "Nguyễn Văn A",
    "text": "Tin nhắn",
    "room": "general",
    "timestamp": "2024-01-01T10:00:00Z"
  }
]
```

---

## 10. Chat Management API (`/chat`) - Admin Only

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /chat/stats | ADMIN, AUDITOR | Thống kê chat |
| GET | /chat/rooms | ADMIN, MANAGER, AUDITOR | Danh sách phòng |
| GET | /chat/rooms/:id | ADMIN, MANAGER, AUDITOR | Chi tiết phòng |
| GET | /chat/rooms/:id/messages | ADMIN, MANAGER, AUDITOR | Tin nhắn trong phòng |
| GET | /chat/messages/search | ADMIN, AUDITOR | Tìm kiếm tin nhắn |
| DELETE | /chat/messages/:id | ADMIN | Xóa tin nhắn |
| POST | /chat/rooms/:id/lock | ADMIN | Khóa/Mở phòng |
| POST | /chat/rooms/:id/members | ADMIN | Thêm thành viên |
| DELETE | /chat/rooms/:id/members/:userId | ADMIN | Xóa thành viên |
| POST | /chat/rooms/:id/system-message | ADMIN | Gửi tin nhệ thống |
| DELETE | /chat/rooms/:id | ADMIN | Xóa phòng |
| GET | /chat/export | ADMIN, AUDITOR | Export log chat |
| GET | /chat/policy | ADMIN, AUDITOR | Lấy chính sách chat |
| PUT | /chat/policy | ADMIN | Cập nhật chính sách chat |

### GET /chat/stats
```json
{
  "totalRooms": 50,
  "totalMessages": 10000,
  "activeRooms": 45,
  "lockedRooms": 5,
  "messagesToday": 150,
  "messagesThisWeek": 1000,
  "messagesByDay": [
    { "_id": "2024-01-01", "count": 150 },
    { "_id": "2024-01-02", "count": 200 }
  ]
}
```

### GET /chat/rooms
| Param | Type | Description |
|-------|------|-------------|
| type | string | Loại phòng (PRIVATE, GROUP, DEPARTMENT, PROJECT) |
| search | string | Tìm kiếm theo tên |
| isLocked | boolean | Lọc theo trạng thái khóa |
| department | string | Lọc theo phòng ban |
| page | number | Số trang |
| limit | number | Số item/trang |

### GET /chat/messages/search
| Param | Type | Description |
|-------|------|-------------|
| keyword | string | Từ khóa tìm kiếm |
| roomId | string | Lọc theo phòng |
| userId | string | Lọc theo user |
| startDate | date | Từ ngày |
| endDate | date | Đến ngày |
| page | number | Số trang |
| limit | number | Số item/trang |

### POST /chat/rooms/:id/lock
```json
{
  "lock": true,
  "reason": "Vi phạm nội quy"
}
```

### POST /chat/rooms/:id/members
```json
{
  "userId": "user_id",
  "role": "MEMBER"  // OWNER, ADMIN, MEMBER
}
```

### GET /chat/export
| Param | Type | Description |
|-------|------|-------------|
| roomId | string | Lọc theo phòng |
| startDate | date | Từ ngày |
| endDate | date | Đến ngày |
| format | string | json hoặc csv |

### GET /chat/policy
```json
{
  "name": "default",
  "description": "Default chat policy",
  "messageRetention": { "enabled": true, "days": 90, "autoDelete": false },
  "fileUpload": { "enabled": true, "maxFileSize": 10485760, "allowedTypes": ["jpg", "png", "pdf"] },
  "restrictions": { "maxMessageLength": 5000, "maxMessagesPerMinute": 10, "blockExternalLinks": false },
  "moderation": { "enableAutoModeration": false, "flaggedKeywords": [] }
}
```

---

## 11. Notification API (`/notifications`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /notifications | Auth | Lấy thông báo của mình |
| GET | /notifications/unread-count | Auth | Số thông báo chưa đọc |
| PUT | /notifications/:id/read | Auth | Đánh dấu đã đọc |
| PUT | /notifications/read-all | Auth | Đánh dấu đã đọc tất cả |
| POST | /notifications | ADMIN | Tạo thông báo |
| POST | /notifications/broadcast | ADMIN | Gửi thông báo hệ thống |
| GET | /notifications/all | ADMIN | Lấy tất cả thông báo |

### POST /notifications/broadcast
```json
{
  "title": "Thông báo hệ thống",
  "message": "Nội dung thông báo",
  "type": "INFO"  // INFO, WARNING, ERROR, SUCCESS
}
```

---

## 12. Audit Log API (`/audit-logs`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /audit-logs | ADMIN | Lấy tất cả audit logs |
| GET | /audit-logs/me | Auth | Lấy audit logs của mình |
| POST | /audit-logs | Auth | Tạo audit log entry |

### GET /audit-logs
```json
[
  {
    "id": "...",
    "userId": "...",
    "userName": "Nguyễn Văn A",
    "action": "LOGIN_SUCCESS",
    "details": "User logged in",
    "ipAddress": "192.168.1.1",
    "timestamp": "2024-01-01T10:00:00Z",
    "status": "SUCCESS",
    "riskLevel": "LOW"
  }
]
```

---

## 13. Zero Trust Config API (`/zero-trust/config`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /zero-trust/config | Auth | Lấy cấu hình Zero Trust |
| PUT | /zero-trust/config | ADMIN | Cập nhật cấu hình |

### GET /zero-trust/config
```json
{
  "id": "...",
  "mfaRequired": true,
  "mfaRequiredForAdmins": true,
  "maxLoginFails": 5,
  "trustScoreThreshold": 70,
  "allowExternalIP": true,
  "alertOnNewDevice": true,
  "ipWhitelist": ["192.168.1.0/24"],
  "deviceTrustThreshold": 80,
  "geofencingEnabled": false
}
```

### PUT /zero-trust/config
```json
{
  "mfaRequired": true,
  "maxLoginFails": 3,
  "trustScoreThreshold": 80
}
```

---

## 14. Roles API (`/roles`, `/permissions`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /roles | ADMIN | Lấy tất cả roles |
| GET | /roles/:id | ADMIN | Lấy chi tiết role |
| POST | /roles | ADMIN | Tạo role mới |
| PUT | /roles/:id | ADMIN | Cập nhật role |
| DELETE | /roles/:id | ADMIN | Xóa role |
| GET | /roles/:roleName/users | ADMIN | Lấy users theo role |
| GET | /permissions | ADMIN | Lấy tất cả permissions |

---

## 15. OAuth - Google Login

### GET /auth/google
Redirect to Google OAuth.

### GET /auth/google/callback
Google OAuth callback - returns JWT token and redirects to frontend.

---

## Error Responses

### 400 Bad Request
```json
{ "message": "Invalid input data" }
```

### 401 Unauthorized
```json
{ "message": "Invalid credentials" }
```

### 403 Forbidden
```json
{ "message": "Access denied" }
```

### 404 Not Found
```json
{ "message": "Resource not found" }
```

### 500 Internal Server Error
```json
{ "message": "Internal server error" }
```

---

## Security Features

### Risk Assessment
Mỗi lần login, hệ thống đánh giá:
- **riskScore**: 0-100 (cao hơn = an toàn hơn)
- **riskFactors**: NEW_DEVICE, UNUSUAL_LOCATION, SUSPICIOUS_ACTIVITY

### Zero Trust Principles
1. **MFA Required**: Tất cả users phải xác thực OTP
2. **Trust Score**: Đánh giá mức độ tin cậy của user/device
3. **Device Tracking**: Theo dõi thiết bị đã đăng nhập
4. **IP Whitelist**: Danh sách IP được phép (tùy chọn)
5. **Failed Login Tracking**: Theo dõi và khóa sau nhiều lần thất bại

### Audit Logging
Tất cả actions quan trọng đều được ghi log:
- LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_BLOCKED
- MFA_VERIFIED, MFA_FAILED
- CHAT_MESSAGE_DELETE, CHAT_ROOM_LOCK
- DOCUMENT_APPROVE, DOCUMENT_REJECT
- USER_CREATE, USER_DELETE, USER_LOCK

---

## Pagination

List APIs sử dụng pagination:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Query Parameters
- `page`: Số trang (default: 1)
- `limit`: Số item/trang (default: 20)
