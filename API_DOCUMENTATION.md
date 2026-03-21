# Zero Trust Model Application - RESTful API Documentation

**Base URL:** `http://localhost:5000/api` (hoặc domain đã deploy)

**Authentication:** JWT token qua HTTP-only cookie (`credentials: 'include'`), hỗ trợ Google OAuth.

**Server:** Express + MongoDB (Mongoose) + Socket.io + Multer (upload file tối đa 50MB).

---

## MỤC LỤC

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Departments](#3-departments)
4. [Projects](#4-projects)
5. [Teams](#5-teams)
6. [Documents](#6-documents)
7. [Messages (Chat)](#7-messages-chat)
8. [Conversations (Direct Messages)](#8-conversations-direct-messages)
9. [Rooms (Messaging Channels)](#9-rooms-messaging-channels)
10. [Notifications](#10-notifications)
11. [Attendance](#11-attendance)
12. [Chat Management (Admin/Manager)](#12-chat-management-adminmanager)
13. [Audit Logs](#13-audit-logs)
14. [Zero Trust Settings](#14-zero-trust-settings)
15. [Roles](#15-roles)
16. [Phân Quyền](#16-phân-quyền)

---

## 1. AUTHENTICATION

### 1.1 Đăng nhập (Hai bước với Zero Trust MFA)

```
POST /api/auth/login
```

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `email` | string | Có | Email người dùng |
| `password` | string | Có | Mật khẩu |
| `mfaCode` | string | Không | Mã OTP 6 chữ số (bước 2) |

**Luồng hoạt động:**
- **Bước 1:** Gọi với `email` + `password` → Luôn trả về `needsMFA: true` và gửi mã OTP qua email
- **Bước 2:** Gọi lại với `email` + `password` + `mfaCode` để hoàn tất đăng nhập

**Response Bước 1:**
```json
{
  "needsMFA": true,
  "message": "Xác thực bảo mật là bắt buộc (Zero Trust). Mã xác thực đã được gửi đến email của bạn.",
  "riskScore": 85,
  "riskFactors": ["NEW_DEVICE", "EXTERNAL_IP"]
}
```

**Response Bước 2 (Thành công):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "ADMIN | MANAGER | STAFF",
    "avatar": "string (URL)",
    "mfaEnabled": true,
    "department": "string",
    "departmentId": "string | null",
    "trustScore": 95,
    "ipAddress": "string",
    "device": "string",
    "status": "ACTIVE | LOCKED | PENDING",
    "lastActiveAt": "ISO date | null",
    "isOnline": true
  },
  "riskScore": 85,
  "riskFactors": []
}
```

**Error Responses:**
- `401` - Sai thông tin đăng nhập hoặc mã MFA không hợp lệ
- `403` - Tài khoản đang chờ phê duyệt

---

### 1.2 Đăng xuất

```
POST /api/auth/logout
```

**Auth:** Không cần (xóa cookie)

**Response:**
```json
{ "message": "Logged out" }
```

---

### 1.3 Lấy thông tin user hiện tại

```
GET /api/auth/me
```

**Auth:** Required

**Response:** Same user object như login success.

---

### 1.4 Cập nhật profile

```
PUT /api/auth/profile
```

**Auth:** Required

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `name` | string | Không | Tên hiển thị |
| `currentPassword` | string | Không | Bắt buộc để đổi mật khẩu |
| `newPassword` | string | Không | Mật khẩu mới |

---

### 1.5 Google OAuth - Bắt đầu

```
GET /api/auth/google
```

**Auth:** Không

Redirect đến Google để xác thực. Scope: `profile`, `email`.

---

### 1.6 Google OAuth - Callback

```
GET /api/auth/google/callback
```

**Auth:** Không

Sau khi xác thực thành công, set JWT cookie và redirect đến `/#/`.

---

## 2. USERS

### 2.1 Lấy tất cả users

```
GET /api/users
```

**Auth:** Required (bất kỳ user nào đã đăng nhập)

**Response:** Array các user objects (id, name, email, role, status, avatar, departmentId, department).

---

### 2.2 Lấy user theo ID

```
GET /api/users/:id
```

**Auth:** Required

---

### 2.3 Admin: Lấy tất cả users (đầy đủ)

```
GET /api/admin/users
```

**Auth:** ADMIN

---

### 2.4 Admin: Tạo user

```
POST /api/admin/users
```

**Auth:** ADMIN

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `name` | string | Có | Tên hiển thị |
| `email` | string | Có | Email (duy nhất) |
| `password` | string | Không | Mặc định: "password123" |
| `role` | string | Không | ADMIN, MANAGER, STAFF (mặc định: STAFF) |
| `departmentId` | string | Không | Department ObjectId |
| `mfaEnabled` | boolean | Không | Mặc định: false |

---

### 2.5 Admin: Cập nhật user

```
PUT /api/admin/users/:id
```

**Auth:** ADMIN

---

### 2.6 Admin: Xóa user

```
DELETE /api/admin/users/:id
```

**Auth:** ADMIN

---

### 2.7 Admin: Khóa/Mở khóa user

```
POST /api/admin/users/:id/lock
```

**Auth:** ADMIN

**Body:** `{ "status": "LOCKED" | "ACTIVE" }`

---

### 2.8 Admin: Phê duyệt user

```
POST /api/admin/users/:id/approve
```

**Auth:** ADMIN

Phê duyệt user đang chờ (đặt status thành ACTIVE).

---

### 2.9 Admin: Từ chối user

```
POST /api/admin/users/:id/reject
```

**Auth:** ADMIN

Từ chối và xóa tài khoản.

---

### 2.10 Admin: Bật/Tắt MFA

```
POST /api/admin/users/:id/mfa
```

**Auth:** ADMIN

**Body:** `{ "enabled": true | false }`

---

### 2.11 Admin: Reset mật khẩu

```
POST /api/admin/users/:id/reset-password
```

**Auth:** ADMIN

Tạo mật khẩu ngẫu nhiên 8 ký tự.

---

### 2.12 Manager: Lấy thành viên team

```
GET /api/manager/users
```

**Auth:** ADMIN hoặc MANAGER

- ADMIN: thấy tất cả non-admin users
- MANAGER: chỉ thấy users trong department của mình

---

### 2.13 Manager: Cập nhật thành viên

```
PUT /api/manager/users/:id
```

**Auth:** ADMIN hoặc MANAGER

Managers chỉ có thể cập nhật `name`, `role` (giữa MANAGER/STAFF), và `mfaEnabled`. Không thể sửa admin hoặc tự thăng cấp.

---

### 2.14 Manager: Khóa/Mở khóa thành viên

```
POST /api/manager/users/:id/lock
```

**Auth:** ADMIN hoặc MANAGER

Managers không thể khóa admin hoặc chính mình.

---

## 3. DEPARTMENTS

### 3.1 Lấy tất cả departments

```
GET /api/departments
```

**Auth:** Required

**Query Parameters:**
| Tham số | Kiểu | Mô tả |
|----------|-------|-------|
| `includeInactive` | boolean | Bao gồm departments không hoạt động (mặc định: false) |

---

### 3.2 Lấy department theo ID

```
GET /api/departments/:id
```

**Auth:** Required

Trả về chi tiết đầy đủ bao gồm `members` (array với name, email, avatar, role, status, mfaEnabled, trustScore, joinedAt) và `projects`.

---

### 3.3 Lấy thống kê department

```
GET /api/departments-stats/stats
```

**Auth:** Required

**Response:**
```json
{
  "totalDepartments": 5,
  "totalMembers": 50,
  "departments": [{ "id": "string", "name": "string", "memberCount": 10, "projectCount": 3 }]
}
```

---

### 3.4 Tạo department

```
POST /api/departments
```

**Auth:** ADMIN

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `name` | string | Có | Tên department (duy nhất) |
| `description` | string | Không | Mô tả |
| `managerId` | string | Không | User ObjectId để gán làm manager |
| `parentId` | string | Không | Parent department ObjectId |
| `color` | string | Không | Mã màu hex (mặc định: #3B82F6) |
| `code` | string | Không | Mã department (auto: 3 ký tự đầu của tên viết hoa) |

**Lưu ý:** Gán manager cũng cập nhật `departmentId` và `role` thành MANAGER của user đó.

---

### 3.5 Cập nhật department

```
PUT /api/departments/:id
```

**Auth:** ADMIN

---

### 3.6 Xóa department

```
DELETE /api/departments/:id
```

**Auth:** ADMIN

Xóa mềm (đặt `isActive: false`). Nếu có members, phải cung cấp `moveMembersTo`.

**Body:** `{ "moveMembersTo": "departmentId" }`

---

### 3.7 Thêm thành viên vào department

```
POST /api/departments/:id/members
```

**Auth:** ADMIN

**Body:** `{ "userId": "string", "role": "MANAGER | STAFF" }`

---

### 3.8 Xóa thành viên khỏi department

```
DELETE /api/departments/:id/members/:userId
```

**Auth:** ADMIN

---

## 4. PROJECTS

### 4.1 Lấy tất cả projects

```
GET /api/projects
```

**Auth:** Required

---

### 4.2 Lấy project theo ID

```
GET /api/projects/:id
```

**Auth:** Required

---

### 4.3 Tạo project

```
POST /api/projects
```

**Auth:** ADMIN hoặc MANAGER

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `name` | string | Có | Tên project |
| `description` | string | Không | Mô tả |
| `status` | string | Không | PLANNING, ACTIVE, COMPLETED (mặc định: PLANNING) |
| `startDate` | string | Không | ISO date |
| `endDate` | string | Không | ISO date |
| `managerId` | string | Không | Manager ObjectId |
| `departmentId` | string | Không | Department ObjectId |
| `members` | array | Không | Array các member ObjectIds |

---

### 4.4 Cập nhật project

```
PUT /api/projects/:id
```

**Auth:** ADMIN hoặc MANAGER

---

### 4.5 Xóa project

```
DELETE /api/projects/:id
```

**Auth:** ADMIN

---

### 4.6 Lấy tasks của project

```
GET /api/projects/:projectId/tasks
```

**Auth:** Required

---

### 4.7 Tạo task

```
POST /api/projects/:projectId/tasks
```

**Auth:** Required

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `name` | string | Có | Tên task |
| `description` | string | Không | Mô tả |
| `status` | string | Không | TODO, IN_PROGRESS, DONE (mặc định: TODO) |
| `priority` | string | Không | LOW, MEDIUM, HIGH (mặc định: MEDIUM) |
| `assigneeId` | string | Không | Assignee ObjectId |
| `dueDate` | string | Không | ISO date |

---

### 4.8 Cập nhật task

```
PUT /api/tasks/:taskId
```

**Auth:** Required

---

## 5. TEAMS

### 5.1 Lấy tất cả teams

```
GET /api/teams
```

**Auth:** Required

---

### 5.2 Lấy team theo ID

```
GET /api/teams/:id
```

**Auth:** Required

---

### 5.3 Tạo team

```
POST /api/teams
```

**Auth:** ADMIN hoặc MANAGER

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `name` | string | Có | Tên team |
| `description` | string | Không | Mô tả |
| `departmentId` | string | Có | Department ObjectId |
| `managerId` | string | Không | Manager ObjectId (mặc định: user hiện tại) |
| `memberIds` | array | Không | Array các member ObjectIds |

---

### 5.4 Cập nhật team

```
PUT /api/teams/:id
```

**Auth:** ADMIN hoặc MANAGER

---

### 5.5 Xóa team

```
DELETE /api/teams/:id
```

**Auth:** ADMIN hoặc MANAGER

Managers chỉ có thể xóa teams trong department của mình.

---

### 5.6 Thêm thành viên vào team

```
POST /api/teams/:id/members
```

**Auth:** ADMIN hoặc MANAGER

**Body:** `{ "userId": "string" }`

---

### 5.7 Xóa thành viên khỏi team

```
DELETE /api/teams/:id/members/:userId
```

**Auth:** ADMIN hoặc MANAGER

---

## 6. DOCUMENTS

Documents hỗ trợ phân loại (PUBLIC, INTERNAL, CONFIDENTIAL), mức bảo mật (1=LOW, 2=MEDIUM, 3=HIGH), bảo vệ bằng mật khẩu, khóa, phê duyệt, và theo dõi phiên bản.

### 6.1 Lấy tất cả documents

```
GET /api/documents
```

**Auth:** Required (lọc theo role)

- ADMIN: thấy tất cả documents
- MANAGER: chỉ thấy documents của department mình
- STAFF: chỉ thấy documents của mình + department + project

**Query Parameters:**
| Tham số | Kiểu | Mô tả |
|----------|-------|-------|
| `search` | string | Tìm kiếm text |
| `department` | string | Lọc theo department |
| `project` | string | Lọc theo project |
| `status` | string | DRAFT, PENDING, APPROVED, REJECTED |
| `classification` | string | PUBLIC, INTERNAL, CONFIDENTIAL |
| `sensitivity` | string | LOW, MEDIUM, HIGH, CRITICAL |
| `page` | number | Trang (mặc định: 1) |
| `limit` | number | Số item/trang (mặc định: 20) |

**Response:**
```json
{
  "documents": [/* full document objects */],
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

---

### 6.2 Lấy document theo ID

```
GET /api/documents/:id
```

**Auth:** Required

Kiểm tra bảo mật: mức clearance của user phải đáp ứng mức bảo mật của document. Locked documents trả về thông tin hạn chế cho non-admins.

---

### 6.3 Upload file

```
POST /api/documents/upload
```

**Auth:** Required

**Content-Type:** `multipart/form-data`

**Body:** `file` (binary, max 50MB)

Cho phép: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, png, jpg, jpeg, gif

**Response:**
```json
{
  "filename": "string",
  "originalName": "string",
  "url": "/uploads/documents/filename",
  "fileSize": 12345,
  "fileType": "PDF"
}
```

---

### 6.4 Tạo document

```
POST /api/documents
```

**Auth:** ADMIN, MANAGER, hoặc STAFF

STAFF chỉ có thể tạo documents với status DRAFT.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `title` | string | Có | Tiêu đề document |
| `description` | string | Không | Mô tả |
| `departmentId` | string | Không | Department ObjectId |
| `projectId` | string | Không | Project ObjectId |
| `classification` | string | Không | PUBLIC, INTERNAL, CONFIDENTIAL (mặc định: INTERNAL) |
| `securityLevel` | number | Không | 1, 2, hoặc 3 (mặc định: 1) |
| `sensitivity` | string | Không | LOW, MEDIUM, HIGH, CRITICAL (mặc định: LOW) |
| `tags` | array | Không | Array các tag strings |
| `url` | string | Không | File URL (từ upload endpoint) |
| `fileSize` | string | Không | Kích thước file |
| `fileType` | string | Không | Loại file (mặc định: PDF) |
| `status` | string | Không | DRAFT, PENDING, APPROVED, REJECTED |

Tự động tạo version 1.

---

### 6.5 Cập nhật document

```
PUT /api/documents/:id
```

**Auth:** ADMIN hoặc MANAGER; STAFF chỉ có thể edit documents DRAFT của mình

Nếu `url` thay đổi, tự động tăng version và thêm vào versions array.

---

### 6.6 Upload phiên bản mới

```
POST /api/documents/:id/upload
```

**Auth:** Required

---

### 6.7 Xóa document

```
DELETE /api/documents/:id
```

**Auth:** ADMIN hoặc MANAGER; STAFF chỉ có thể xóa documents DRAFT của mình

Xóa mềm (đặt `isDeleted: true`).

---

### 6.8 Phê duyệt document

```
POST /api/documents/:id/approve
```

**Auth:** ADMIN hoặc MANAGER

Đặt status thành APPROVED, ghi lại người phê duyệt và thời gian.

---

### 6.9 Từ chối document

```
POST /api/documents/:id/reject
```

**Auth:** ADMIN hoặc MANAGER

**Body:** `{ "reason": "string" }`

Đặt status thành REJECTED và lưu lý do từ chối.

---

### 6.10 Tải document

```
GET /api/documents/:id/download
```

**Auth:** Required

Theo dõi trong viewedBy/downloadedBy arrays và tạo audit log.

**Response:** `{ "url": "/uploads/documents/filename", "fileName": "DocumentTitle_v3.PDF" }`

---

### 6.11 Lấy thống kê documents

```
GET /api/documents-stats/stats
```

**Auth:** ADMIN hoặc MANAGER (MANAGER chỉ thấy department của mình)

---

### 6.12 Đặt mật khẩu document (Admin)

```
POST /api/documents/:id/password
```

**Auth:** ADMIN

Chỉ cho documents có security level 2 hoặc 3.

**Body:** `{ "password": "string" }` - Gửi password rỗng để xóa bảo vệ.

---

### 6.13 Khóa/Mở khóa document (Admin)

```
POST /api/documents/:id/lock
```

**Auth:** ADMIN

**Body:** `{ "isLocked": true | false }`

---

### 6.14 Reset quyền truy cập document (Admin)

```
POST /api/documents/:id/reset-access
```

**Auth:** ADMIN

Đặt lại failed password attempts về 0 và xóa permanent lock.

---

### 6.15 Xác minh mật khẩu document

```
POST /api/documents/:id/verify
```

**Auth:** Required

**Body:** `{ "password": "string" }`

**Response (thành công):** `{ "verified": true, "failedAttempts": 0 }`

**Response (sai):** `{ "verified": false, "message": "Incorrect password", "failedAttempts": 1 }`

**Response (khóa sau 3 lần sai):** `{ "verified": false, "locked": true, "message": "Tài liệu đã bị khóa...", "failedAttempts": 3 }`

---

### 6.16 Yêu cầu quyền truy cập document

```
POST /api/documents/:id/request
```

**Auth:** Required

**Body:** `{ "reason": "string" }`

---

### 6.17 Lấy tất cả document requests

```
GET /api/documents/requests
```

**Auth:** ADMIN hoặc MANAGER

---

### 6.18 Cập nhật document request

```
PUT /api/documents/requests/:id
```

**Auth:** ADMIN hoặc MANAGER

**Body:** `{ "status": "APPROVED | REJECTED", "reason": "string" }`

---

### 6.19 Thu hồi document request (Admin)

```
POST /api/documents/requests/:id/revoke
```

**Auth:** ADMIN

---

### 6.20 Lấy document requests của tôi

```
GET /api/documents/requests/my
```

**Auth:** Required

---

## 7. MESSAGES (Chat)

Real-time messaging qua Socket.io với REST endpoints cho lịch sử, threading, reactions, và read receipts.

### 7.1 Lấy messages

```
GET /api/messages
```

**Auth:** Required

**Query Parameters:**
| Tham số | Kiểu | Mô tả |
|----------|-------|-------|
| `room` | string | Room ID để lọc (tùy chọn) |

Trả về 100 messages gần nhất, mới nhất trước.

**Response:**
```json
{
  "messages": [
    {
      "id": "string",
      "userId": "string",
      "userName": "string",
      "userAvatar": "string (URL)",
      "text": "string",
      "room": "string",
      "timestamp": "ISO date",
      "reactions": [{ "userId": "string", "emoji": "string", "createdAt": "date" }],
      "isEdited": false,
      "editedAt": "date | null",
      "parentMessageId": "string | null",
      "replyCount": 0,
      "isRead": true,
      "readCount": 1,
      "attachments": [],
      "hasAttachments": false,
      "mentions": ["string"]
    }
  ]
}
```

---

### 7.2 Gửi message

```
POST /api/messages
```

**Auth:** Required

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `text` | string | Có | Nội dung tin nhắn |
| `room` | string | Không | Room ID (mặc định: 'general') |
| `parentMessageId` | string | Không | Parent message ID cho threading |

Parse `@Name Name` patterns cho @mentions. Emit qua Socket.io. Với DM messages, tạo database notification và real-time events.

---

### 7.3 Lấy thread replies

```
GET /api/messages/:messageId/replies
```

**Auth:** Required

Trả về replies của một message, sắp xếp theo thời gian.

---

### 7.4 Thu hồi message

```
DELETE /api/messages/:id
```

**Auth:** Required (phải là chủ tin nhắn)

Chỉ hoạt động trong vòng 24 giờ từ khi gửi.

**Response:** `{ "success": true, "message": "Tin nhắn đã được thu hồi" }`

---

### 7.5 Thêm/Xóa reaction

```
POST /api/messages/:messageId/reactions
```

**Auth:** Required

**Body:** `{ "emoji": "string" }`

Toggle behavior: nếu user đã reaction với cùng emoji thì xóa, không thì thêm.

---

### 7.6 Đánh dấu đã đọc

```
POST /api/messages/:messageId/read
```

**Auth:** Required

---

### 7.7 Đánh dấu tất cả messages trong room là đã đọc

```
POST /api/messages/room/:roomId/read-all
```

**Auth:** Required

---

### 7.8 Tìm kiếm messages

```
GET /api/messages/search
```

**Auth:** Required

**Query Parameters:**
| Tham số | Kiểu | Mô tả |
|----------|-------|-------|
| `q` | string | Từ khóa tìm kiếm (tối thiểu 2 ký tự) |
| `room` | string | Lọc theo room ID |

---

## 8. CONVERSATIONS (Direct Messages)

### 8.1 Lấy tất cả DM conversations

```
GET /api/messaging/conversations
```

**Auth:** Required

Trả về tất cả 1-on-1 DM rooms của user hiện tại, sắp xếp theo thời gian message gần nhất.

**Response:**
```json
{
  "conversations": [
    {
      "id": "string",
      "type": "direct",
      "name": "string",
      "avatar": "string",
      "lastMessage": { "id": "string", "text": "string", "timestamp": "date", "userId": "string" },
      "unreadCount": 3,
      "userId": "string"
    }
  ]
}
```

---

### 8.2 Tạo/Lấy DM conversation

```
POST /api/messaging/conversations
```

**Auth:** Required

**Body:** `{ "userId": "string" }`

Tìm existing DM room hoặc tạo mới.

---

### 8.3 Tìm users cho mentions

```
GET /api/messaging/users/search?q=John
```

**Auth:** Required

**Query Parameters:**
| Tham số | Kiểu | Mô tả |
|----------|-------|-------|
| `q` | string | Query tìm kiếm (tối thiểu 2 ký tự) |

---

## 9. ROOMS (Messaging Channels)

### 9.1 Lấy các chat rooms

```
GET /api/messaging/rooms
```

**Auth:** Required

Tự động tạo default rooms (Kênh chung, An ninh SOC, Kỹ thuật, Nhân sự) nếu chưa có.

- STAFF: thấy system rooms + rooms trong department
- MANAGER: thấy system rooms + tất cả rooms + rooms không có security code

**Response:**
```json
{
  "rooms": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "type": "channel",
      "isPinned": true,
      "unread": 0,
      "departmentId": "string | null",
      "isPrivate": true,
      "hasJoinCode": true,
      "isMember": true
    }
  ]
}
```

---

### 9.2 Tạo chat room

```
POST /api/messaging/rooms
```

**Auth:** Required

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `name` | string | Có | Tên room |
| `description` | string | Không | Mô tả |
| `hasSecurityCode` | boolean | Không | Room có cần mã bảo mật để vào không |
| `securityCode` | string | Không | Mã bảo mật (nếu hasSecurityCode là true) |

Người tạo tự động là ADMIN member.

---

### 9.3 Vào room với mã bảo mật

```
POST /api/messaging/rooms/:roomId/join
```

**Auth:** Required

**Body:** `{ "securityCode": "string" }`

Xác minh mã bảo mật, thêm user làm MEMBER.

---

### 9.4 Lấy thành viên room

```
GET /api/messaging/rooms/:roomId/members
```

**Auth:** Required

**Response:**
```json
{
  "members": [
    { "id": "string", "name": "string", "email": "string", "avatar": "string", "role": "ADMIN | MEMBER" }
  ]
}
```

---

### 9.5 Xóa room

```
DELETE /api/messaging/rooms/:roomId
```

**Auth:** MANAGER only (xóa mềm)

Managers chỉ có thể xóa rooms trong department của mình.

---

## 10. NOTIFICATIONS

### 10.1 Lấy notifications của tôi

```
GET /api/notifications
```

**Auth:** Required

Trả về notifications của user hiện tại, mới nhất trước, giới hạn 50.

---

### 10.2 Lấy tất cả notifications (Admin)

```
GET /api/notifications/all
```

**Auth:** ADMIN

---

### 10.3 Tạo notification

```
POST /api/notifications
```

**Auth:** ADMIN

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `userId` | string | Có | Target user ObjectId |
| `title` | string | Có | Tiêu đề notification |
| `message` | string | Có | Nội dung notification |
| `type` | string | Không | INFO, WARNING, ERROR (mặc định: INFO) |
| `priority` | string | Không | LOW, NORMAL, HIGH (mặc định: NORMAL) |

Emit real-time notification qua Socket.io đến `user_{userId}`.

---

### 10.4 Lấy số chưa đọc

```
GET /api/notifications/unread-count
```

**Auth:** Required

**Response:** `{ "unreadCount": 5 }`

---

### 10.5 Đánh dấu đã đọc

```
PUT /api/notifications/:notificationId/read
```

**Auth:** Required (phải là chủ notification)

---

### 10.6 Đánh dấu tất cả đã đọc

```
PUT /api/notifications/read-all
```

**Auth:** Required

---

### 10.7 Xóa notification

```
DELETE /api/notifications/:notificationId
```

**Auth:** ADMIN

---

### 10.8 Tạo chat notification

```
POST /api/notifications/chat
```

**Auth:** Required (STAFF hoặc MANAGER)

Tạo notification cho tất cả admins khi STAFF hoặc MANAGER gửi direct message.

**Body:** `{ "roomId": "string", "messageId": "string", "messagePreview": "string" }`

---

### 10.9 Broadcast notification

```
POST /api/notifications/broadcast
```

**Auth:** ADMIN

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `userIds` | array | Không | Array các user ObjectIds |
| `title` | string | Có | Tiêu đề notification |
| `message` | string | Có | Nội dung notification |
| `type` | string | Không | Mặc định: INFO |
| `priority` | string | Không | Mặc định: NORMAL |
| `sendToAll` | boolean | Không | Nếu true, gửi cho tất cả users |

---

## 11. ATTENDANCE

### 11.1 Check-in

```
POST /api/attendance/check-in
```

**Auth:** Required

**Body:** `{ "location": "string", "device": "string" }`

Mặc định: location = "Văn phòng Nexus (Hà Nội)", device = "Thiết bị đã xác thực"

**Response:**
```json
{
  "id": "string",
  "type": "CHECK_IN",
  "timestamp": "ISO date",
  "location": "string",
  "device": "string"
}
```

---

### 11.2 Check-out

```
POST /api/attendance/check-out
```

**Auth:** Required

---

### 11.3 Lấy lịch sử attendance

```
GET /api/attendance/history
```

**Auth:** Required

Trả về attendance records của user hiện tại, mới nhất trước.

---

## 12. CHAT MANAGEMENT (Admin/Manager)

Tất cả endpoints dưới prefix `/api/chat`.

### 12.1 Lấy thống kê chat

```
GET /api/chat/stats
```

**Auth:** ADMIN

**Response:**
```json
{
  "totalRooms": 10,
  "totalMessages": 5000,
  "activeRooms": 8,
  "lockedRooms": 2,
  "messagesToday": 150,
  "messagesThisWeek": 1000,
  "messagesByDay": [{ "_id": "2026-03-15", "count": 200 }]
}
```

---

### 12.2 Lấy tất cả chat rooms

```
GET /api/chat/rooms
```

**Auth:** ADMIN hoặc MANAGER

**Query Parameters:**
| Tham số | Kiểu | Mô tả |
|----------|-------|-------|
| `type` | string | GROUP, PRIVATE, PROJECT |
| `search` | string | Tìm kiếm text |
| `isLocked` | boolean | Lọc locked rooms |
| `department` | string | Lọc theo department |
| `page` | number | Trang (mặc định: 1) |
| `limit` | number | Số item/trang (mặc định: 20) |

MANAGER chỉ thấy rooms trong department hoặc GROUP/PROJECT type.

---

### 12.3 Lấy room theo ID

```
GET /api/chat/rooms/:id
```

**Auth:** ADMIN hoặc MANAGER

---

### 12.4 Lấy messages của room

```
GET /api/chat/rooms/:id/messages
```

**Auth:** ADMIN hoặc MANAGER

**Query Parameters:**
| Tham số | Kiểu | Mô tả |
|----------|-------|-------|
| `page` | number | Trang (mặc định: 1) |
| `limit` | number | Số item/trang (mặc định: 50) |
| `startDate` | string | ISO date filter (gte) |
| `endDate` | string | ISO date filter (lte) |
| `userId` | string | Lọc theo người gửi |

---

### 12.5 Tìm kiếm messages (Admin)

```
GET /api/chat/messages/search
```

**Auth:** ADMIN

**Query Parameters:** `keyword`, `roomId`, `userId`, `startDate`, `endDate`, `page`, `limit`

---

### 12.6 Xóa message (Admin)

```
DELETE /api/chat/messages/:id
```

**Auth:** ADMIN

Xóa mềm: đặt `isDeleted: true`, `isHidden: true`, ghi lại `deletedBy` và `deletionReason`.

**Body:** `{ "reason": "string" }`

---

### 12.7 Khóa/Mở khóa room

```
POST /api/chat/rooms/:id/lock
```

**Auth:** ADMIN

**Body:** `{ "lock": true | false, "reason": "string" }`

---

### 12.8 Thêm thành viên vào room

```
POST /api/chat/rooms/:id/members
```

**Auth:** ADMIN

**Body:** `{ "userId": "string", "role": "MEMBER | ADMIN" }`

---

### 12.9 Xóa thành viên khỏi room

```
DELETE /api/chat/rooms/:id/members/:userId
```

**Auth:** ADMIN

---

### 12.10 Gửi system message

```
POST /api/chat/rooms/:id/system-message
```

**Auth:** ADMIN

**Body:** `{ "text": "string", "attachments": [] }`

---

### 12.11 Xóa room

```
DELETE /api/chat/rooms/:id
```

**Auth:** ADMIN hoặc MANAGER

---

### 12.12 Manager xóa room của mình

```
DELETE /api/chat/rooms/:id/manager-delete
```

**Auth:** ADMIN hoặc MANAGER

MANAGER chỉ có thể xóa rooms mình tạo.

---

### 12.13 Export chat logs

```
GET /api/chat/export
```

**Auth:** ADMIN

**Query Parameters:**
| Tham số | Kiểu | Mô tả |
|----------|-------|-------|
| `roomId` | string | Lọc theo room |
| `startDate` | string | ISO date |
| `endDate` | string | ISO date |
| `format` | string | json (mặc định) hoặc csv |

Tối đa 10,000 messages. CSV format trả về file download.

---

### 12.14 Lấy chat policy

```
GET /api/chat/policy
```

**Auth:** ADMIN

---

### 12.15 Cập nhật chat policy

```
PUT /api/chat/policy
```

**Auth:** ADMIN

---

### 12.16 Tạo room với join code

```
POST /api/chat/rooms/create-with-code
```

**Auth:** ADMIN hoặc MANAGER

**Body:** `{ "name": "string", "description": "string", "type": "GROUP" }`

Tạo mã join 6 ký tự ngẫu nhiên. Người tạo là OWNER.

**Response:**
```json
{
  "success": true,
  "room": { /* room object */ },
  "joinCode": "ABC123"
}
```

---

### 12.17 Vào room bằng code

```
POST /api/chat/rooms/join-by-code
```

**Auth:** Required

**Body:** `{ "joinCode": "string" }`

---

### 12.18 Tạo lại join code

```
POST /api/chat/rooms/:id/regenerate-code
```

**Auth:** ADMIN hoặc MANAGER

Chỉ OWNER hoặc ADMIN mới có thể tạo lại.

---

### 12.19 Lấy DM messages Admin-User

```
GET /api/chat/chat/messages/:userId
```

**Auth:** ADMIN hoặc MANAGER

Lấy tất cả messages trong DM conversation giữa admin/manager và user được chỉ định.

---

### 12.20 Gửi DM cho user

```
POST /api/chat/chat/messages/:userId
```

**Auth:** ADMIN hoặc MANAGER

**Body:** `{ "text": "string" }`

Tạo hoặc tìm DM conversation, gửi message, emit qua Socket.io, và tạo database notification cho target user.

---

## 13. AUDIT LOGS

### 13.1 Lấy tất cả audit logs

```
GET /api/audit-logs
```

**Auth:** ADMIN

Trả về 100 logs gần nhất, mới nhất trước.

**Response:**
```json
{
  "id": "string",
  "userId": "string",
  "userName": "string",
  "userEmail": "string",
  "action": "string",
  "details": "string",
  "ipAddress": "string",
  "device": "string",
  "timestamp": "date",
  "status": "SUCCESS | FAILED | WARNING",
  "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL"
}
```

---

### 13.2 Lấy audit logs của tôi

```
GET /api/audit-logs/me
```

**Auth:** Required

---

### 13.3 Tạo audit log entry

```
POST /api/audit-logs
```

**Auth:** Required

**Body:**
```json
{
  "action": "string",
  "details": "string",
  "status": "SUCCESS | FAILED | WARNING",
  "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL"
}
```

---

## 14. ZERO TRUST SETTINGS

### 14.1 Lấy cấu hình Zero Trust

```
GET /api/zero-trust/config
```

**Auth:** Required

**Response:**
```json
{
  "id": "string",
  "mfaRequired": true,
  "mfaRequiredForAdmins": true,
  "maxLoginFails": 5,
  "trustScoreThreshold": 70,
  "allowExternalIP": false,
  "alertOnNewDevice": true,
  "ipWhitelist": ["192.168.1.0/24", "10.0.0.1"],
  "deviceTrustThreshold": 80,
  "geofencingEnabled": true
}
```

---

### 14.2 Cập nhật cấu hình Zero Trust

```
PUT /api/zero-trust/config
```

**Auth:** ADMIN

Chỉ cập nhật các fields được cung cấp.

---

## 15. ROLES

### 15.1 Lấy tất cả roles

```
GET /api/roles
```

**Auth:** ADMIN

---

### 15.2 Lấy role theo ID

```
GET /api/roles/:id
```

**Auth:** ADMIN

Trả về thêm `userCount` (số users có role này).

---

### 15.3 Tạo role

```
POST /api/roles
```

**Auth:** ADMIN

| Tham số | Kiểu | Bắt buộc | Mô tả |
|----------|-------|----------|-------|
| `name` | string | Có | Tên role (duy nhất) |
| `description` | string | Không | Mô tả |
| `permissions` | array | Không | Array các permission code strings |
| `color` | string | Không | Tailwind color class (mặc định: bg-blue-500) |

---

### 15.4 Cập nhật role

```
PUT /api/roles/:id
```

**Auth:** ADMIN

System roles (isSystem: true) không thể sửa.

---

### 15.5 Xóa role

```
DELETE /api/roles/:id
```

**Auth:** ADMIN

Không thể xóa system roles hoặc roles có users đang sử dụng.

---

### 15.6 Lấy users theo role

```
GET /api/roles/:roleName/users
```

**Auth:** ADMIN

URL-encode roleName (ví dụ: `/roles/MANAGER/users`).

---

### 15.7 Lấy tất cả permissions

```
GET /api/permissions
```

**Auth:** ADMIN

**Response:** Array các permissions được tổ chức theo category:

- **User Management:** USER_VIEW, USER_CREATE, USER_EDIT, USER_DELETE, USER_APPROVE, USER_LOCK
- **Role Management:** ROLE_VIEW, ROLE_CREATE, ROLE_EDIT, ROLE_DELETE
- **Department:** DEPT_VIEW, DEPT_CREATE, DEPT_EDIT, DEPT_DELETE
- **Project:** PROJECT_VIEW, PROJECT_CREATE, PROJECT_EDIT, PROJECT_DELETE, PROJECT_ASSIGN
- **Document:** DOC_VIEW, DOC_UPLOAD, DOC_EDIT, DOC_APPROVE, DOC_DELETE
- **Attendance:** ATTENDANCE_VIEW, ATTENDANCE_MANAGE, ATTENDANCE_CHECKIN
- **Audit:** AUDIT_VIEW, AUDIT_EXPORT
- **Security:** ZT_VIEW, ZT_MANAGE
- **Notifications:** NOTIF_VIEW, NOTIF_SEND
- **Reports:** REPORT_VIEW, REPORT_EXPORT

---

## 16. PHÂN QUYỀN

| Chức năng | ADMIN | MANAGER | STAFF |
|------------|-------|---------|-------|
| Quản lý tất cả users | Có | Chỉ department của mình | Chỉ bản thân |
| CRUD Departments | Có | Không | Không |
| CRUD Projects | Có | Có (tạo/cập nhật) | Chỉ xem |
| CRUD Teams | Có | Chỉ department của mình | Không |
| Tất cả documents | Có | Chỉ department của mình | Chỉ DRAFT của mình |
| Phê duyệt documents | Có | Có | Không |
| Tất cả chat rooms | Có | Dept + groups | System rooms + dept rooms |
| Moderation chat | Có | Chỉ rooms của mình | Không |
| Broadcast notification | Có | Không | Không |
| Audit logs (tất cả) | Có | Không | Không |
| Cấu hình Zero Trust | Có | Chỉ xem | Chỉ xem |
| Quản lý Roles/Permissions | Có | Không | Không |

---

## 17. SOCKET.IO EVENTS

### Client → Server

| Event | Payload | Mô tả |
|-------|---------|-------|
| `join_room` | `room: string` | Vào một chat room |
| `leave_room` | `room: string` | Rời chat room |
| `send_message` | `{ userId, userName, userRole, text, room, parentMessageId, attachments }` | Gửi message |
| `typing_start` | `{ room, userId, userName }` | Bắt đầu typing |
| `typing_stop` | `{ room, userId, userName }` | Dừng typing |
| `add_reaction` | `{ messageId, emoji, userId, userName, room }` | Thêm/xóa reaction |
| `mark_read` | `{ messageId, userId, room }` | Đánh dấu đã đọc |

### Server → Client

| Event | Payload | Mô tả |
|-------|---------|-------|
| `receive_message` | Message object | Nhận message mới |
| `user_joined_room` | `{ userId, userName, room }` | User vào room |
| `user_left_room` | `{ userId, userName, room }` | User rời room |
| `user_typing` | `{ room, userId, userName, isTyping }` | Typing indicator |
| `reaction_updated` | `{ messageId, reactions }` | Reaction cập nhật |
| `message_read` | `{ messageId, userId, readAt, readCount }` | Message được đọc |
| `message_deleted` | `{ messageId }` | Message bị thu hồi |
| `mentioned` | `{ message, mentionedBy }` | User được @mention |
| `new_notification` | Notification object | Notification mới |
| `new_admin_message_notification` | `{ fromUserId, fromUserName, fromUserRole, messageId, conversationId, preview }` | DM mới từ Staff/Manager |

---

## 18. MODELS DATABASE

### User
```
id, name, email, password, role (ADMIN/MANAGER/STAFF), status (ACTIVE/LOCKED/PENDING),
avatar, departmentId, trustScore, mfaEnabled, googleId, isLocked, knownDevices[],
lastActiveAt, createdAt, updatedAt
```

### Department
```
id, name, description, managerId, parentId, color, code, members[], projects[],
isActive, createdAt, updatedAt
```

### Project
```
id, name, description, status (PLANNING/ACTIVE/COMPLETED), progress, startDate, endDate,
managerId, departmentId, members[], createdAt, updatedAt
```

### Team
```
id, name, description, departmentId, managerId, memberIds[], createdAt, updatedAt
```

### Document
```
id, title, description, departmentId, projectId, classification (PUBLIC/INTERNAL/CONFIDENTIAL),
securityLevel (1/2/3), sensitivity (LOW/MEDIUM/HIGH/CRITICAL), tags[],
url, fileSize, fileType, status (DRAFT/PENDING/APPROVED/REJECTED), isLocked,
password, failedAttempts, hasAttachments, viewedBy[], downloadedBy[],
versions[], createdBy, approvedBy, approvedAt, rejectionReason,
createdAt, updatedAt, isDeleted
```

### Message
```
id, userId, userName, userAvatar, text, room, roomId, parentMessageId,
replyCount, reactions[{ userId, emoji, createdAt }], readBy[{ userId, readAt }],
isEdited, editedAt, attachments[], hasAttachments, mentions[],
isSystemMessage, createdAt, updatedAt, isDeleted, isHidden,
deletedBy, deletionReason
```

### ChatRoom
```
id, name, description, type (GROUP/PRIVATE/PROJECT), isPrivate, isDirectMessage,
participants[], participantNames[], relatedUserId, memberCount, messageCount,
isLocked, joinCode, securityCode, hasSecurityCode, isPinned, lastMessageAt,
members[{ userId, role }], departmentId, createdBy, isDeleted, createdAt, updatedAt
```

### Notification
```
id, userId, fromUserId, title, message, type (INFO/WARNING/ALERT/SUCCESS),
isRead, priority (LOW/NORMAL/HIGH), createdAt, updatedAt
```

### Attendance
```
id, userId, type (CHECK_IN/CHECK_OUT), timestamp, location, device, createdAt
```

### AuditLog
```
id, userId, action, details, ipAddress, device, status (SUCCESS/FAILED/WARNING),
riskLevel (LOW/MEDIUM/HIGH/CRITICAL), timestamp
```

### ZeroTrustConfig
```
id, mfaRequired, mfaRequiredForAdmins, maxLoginFails, trustScoreThreshold,
allowExternalIP, alertOnNewDevice, ipWhitelist[], deviceTrustThreshold,
geofencingEnabled, createdAt, updatedAt
```

---

*Generated for Zero Trust Model Application*
