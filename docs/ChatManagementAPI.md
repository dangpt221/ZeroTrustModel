# Chat Management API Documentation

## Base URL
```
http://localhost:3000/api/chat
```

## Authentication
Tất cả API yêu cầu JWT token hợp lệ trong cookie `auth_token`.

## Roles Allowed
- `SUPER_ADMIN`: Tất cả API
- `ADMIN`: Tất cả API
- `MANAGER`: Xem phòng, tin nhắn
- `AUDITOR`: Xem thống kê, tìm kiếm, export

---

## Endpoints Overview

| Method | Endpoint | Roles | Mô tả |
|--------|----------|-------|-------|
| GET | `/stats` | SUPER_ADMIN, ADMIN, AUDITOR | Thống kê chat |
| GET | `/rooms` | SUPER_ADMIN, ADMIN, MANAGER, AUDITOR | Danh sách phòng |
| GET | `/rooms/:id` | SUPER_ADMIN, ADMIN, MANAGER, AUDITOR | Chi tiết phòng |
| GET | `/rooms/:id/messages` | SUPER_ADMIN, ADMIN, MANAGER, AUDITOR | Tin nhắn trong phòng |
| GET | `/messages/search` | SUPER_ADMIN, ADMIN, AUDITOR | Tìm kiếm tin nhắn |
| DELETE | `/messages/:id` | SUPER_ADMIN, ADMIN | Xóa tin nhắn |
| POST | `/rooms/:id/lock` | SUPER_ADMIN, ADMIN | Khóa/Mở phòng |
| POST | `/rooms/:id/members` | SUPER_ADMIN, ADMIN | Thêm thành viên |
| DELETE | `/rooms/:id/members/:userId` | SUPER_ADMIN, ADMIN | Xóa thành viên |
| POST | `/rooms/:id/system-message` | SUPER_ADMIN, ADMIN | Gửi tin nhắn hệ thống |
| DELETE | `/rooms/:id` | SUPER_ADMIN, ADMIN | Xóa phòng |
| GET | `/export` | SUPER_ADMIN, ADMIN, AUDITOR | Export log chat |
| GET | `/policy` | SUPER_ADMIN, ADMIN, AUDITOR | Lấy chính sách chat |
| PUT | `/policy` | SUPER_ADMIN, ADMIN | Cập nhật chính sách chat |

---

## 1. Statistics API

### GET /stats

Lấy thống kê tổng quan về hệ thống chat.

**Roles:** SUPER_ADMIN, ADMIN, AUDITOR

**Response:**
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

**Mô tả:**
- `totalRooms`: Tổng số phòng chat
- `totalMessages`: Tổng số tin nhắn
- `activeRooms`: Số phòng đang hoạt động
- `lockedRooms`: Số phòng bị khóa
- `messagesToday`: Tin nhắn hôm nay
- `messagesThisWeek`: Tin nhắn tuần này
- `messagesByDay`: Số tin nhắn theo ngày (7 ngày gần nhất)

---

## 2. Room Management API

### GET /rooms

Lấy danh sách tất cả phòng chat.

**Roles:** SUPER_ADMIN, ADMIN, MANAGER, AUDITOR

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | No | Loại phòng: `PRIVATE`, `GROUP`, `DEPARTMENT`, `PROJECT` |
| search | string | No | Tìm kiếm theo tên phòng |
| isLocked | boolean | No | Lọc phòng bị khóa: `true`/`false` |
| department | string | No | Lọc theo ID phòng ban |
| page | number | No | Số trang (default: 1) |
| limit | number | No | Số item/trang (default: 20) |

**Example Request:**
```
GET /api/chat/rooms?type=GROUP&isLocked=false&page=1&limit=20
```

**Response:**
```json
{
  "rooms": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Phòng Marketing",
      "description": "Phòng chat marketing team",
      "type": "DEPARTMENT",
      "isPrivate": false,
      "isSystemRoom": false,
      "createdBy": "507f1f77bcf86cd799439012",
      "departmentId": "507f1f77bcf86cd799439013",
      "projectId": null,
      "members": [
        {
          "userId": "507f1f77bcf86cd799439014",
          "role": "OWNER",
          "joinedAt": "2024-01-01T00:00:00.000Z",
          "leftAt": null
        }
      ],
      "memberCount": 10,
      "isLocked": false,
      "lockedAt": null,
      "lockedBy": null,
      "lockReason": "",
      "allowFileUpload": true,
      "maxFileSize": 10485760,
      "autoDeleteDays": 0,
      "maxMessageLength": 5000,
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "messageCount": 500,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

---

### GET /rooms/:id

Lấy chi tiết một phòng chat.

**Roles:** SUPER_ADMIN, ADMIN, MANAGER, AUDITOR

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | ID của phòng chat |

**Example Request:**
```
GET /api/chat/rooms/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Phòng Marketing",
  "description": "Phòng chat marketing team",
  "type": "DEPARTMENT",
  "isPrivate": false,
  "isSystemRoom": false,
  "createdBy": "507f1f77bcf86cd799439012",
  "departmentId": "507f1f77bcf86cd799439013",
  "projectId": null,
  "members": [
    {
      "userId": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Nguyễn Văn A",
        "email": "user1@example.com",
        "avatar": "https://..."
      },
      "role": "OWNER",
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "leftAt": null
    },
    {
      "userId": {
        "_id": "507f1f77bcf86cd799439015",
        "name": "Trần Thị B",
        "email": "user2@example.com",
        "avatar": "https://..."
      },
      "role": "MEMBER",
      "joinedAt": "2024-01-05T00:00:00.000Z",
      "leftAt": null
    }
  ],
  "memberCount": 10,
  "isLocked": false,
  "lockedAt": null,
  "lockedBy": null,
  "lockReason": "",
  "allowFileUpload": true,
  "maxFileSize": 10485760,
  "autoDeleteDays": 0,
  "maxMessageLength": 5000,
  "lastMessageAt": "2024-01-15T10:30:00.000Z",
  "messageCount": 500,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /rooms/:id/messages

Lấy danh sách tin nhắn trong một phòng.

**Roles:** SUPER_ADMIN, ADMIN, MANAGER, AUDITOR

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | ID của phòng chat |

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Số trang (default: 1) |
| limit | number | No | Số tin nhắn/trang (default: 50) |
| startDate | date | No | Từ ngày (YYYY-MM-DD) |
| endDate | date | No | Đến ngày (YYYY-MM-DD) |
| userId | string | No | Lọc theo user |

**Example Request:**
```
GET /api/chat/rooms/507f1f77bcf86cd799439011/messages?page=1&limit=50
```

**Response:**
```json
{
  "messages": [
    {
      "id": "507f1f77bcf86cd799439021",
      "userId": "507f1f77bcf86cd799439014",
      "userName": "Nguyễn Văn A",
      "text": "Chào mọi người!",
      "attachments": [],
      "roomId": "507f1f77bcf86cd799439011",
      "room": "Phòng Marketing",
      "isDeleted": false,
      "isHidden": false,
      "isSystemMessage": false,
      "deletionReason": "",
      "deletedAt": null,
      "deletedBy": null,
      "editedAt": null,
      "isEdited": false,
      "reactions": [
        { "emoji": "👍", "users": ["507f1f77bcf86cd799439015"] }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "pages": 10
  }
}
```

---

## 3. Message Search API

### GET /messages/search

Tìm kiếm tin nhắn trong hệ thống chat.

**Roles:** SUPER_ADMIN, ADMIN, AUDITOR

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| keyword | string | No | Từ khóa tìm kiếm |
| roomId | string | No | Lọc theo phòng |
| userId | string | No | Lọc theo user |
| startDate | date | No | Từ ngày (YYYY-MM-DD) |
| endDate | date | No | Đến ngày (YYYY-MM-DD) |
| page | number | No | Số trang (default: 1) |
| limit | number | No | Số kết quả/trang (default: 50) |

**Example Request:**
```
GET /api/chat/messages/search?keyword=meeting&roomId=507f1f77bcf86cd799439011&page=1&limit=50
```

**Response:**
```json
{
  "messages": [
    {
      "id": "507f1f77bcf86cd799439021",
      "userId": "507f1f77bcf86cd799439014",
      "userName": "Nguyễn Văn A",
      "text": "Cuộc họp sẽ diễn ra vào lúc 2h chiều",
      "attachments": [],
      "roomId": "507f1f77bcf86cd799439011",
      "room": {
        "name": "Phòng Marketing"
      },
      "isDeleted": false,
      "isHidden": false,
      "isSystemMessage": false,
      "createdAt": "2024-01-15T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "pages": 1
  }
}
```

---

## 4. Message Management API

### DELETE /messages/:id

Xóa (ẩn) một tin nhắn. Tin nhắn sẽ được đánh dấu là đã xóa nhưng vẫn lưu trong database để audit.

**Roles:** SUPER_ADMIN, ADMIN

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | ID của tin nhắn |

**Request Body:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Lý do xóa tin nhắn |

**Example Request:**
```
DELETE /api/chat/messages/507f1f77bcf86cd799439021
Content-Type: application/json

{
  "reason": "Tin nhắn vi phạm nội quy"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

**Audit Log:**
- Action: `CHAT_MESSAGE_DELETE`
- Risk Level: `MEDIUM`

---

## 5. Room Lock/Unlock API

### POST /rooms/:id/lock

Khóa hoặc mở khóa một phòng chat.

**Roles:** SUPER_ADMIN, ADMIN

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | ID của phòng chat |

**Request Body:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| lock | boolean | Yes | `true` = khóa, `false` = mở khóa |
| reason | string | No | Lý do khóa/mở khóa |

**Example Request:**
```
POST /api/chat/rooms/507f1f77bcf86cd799439011/lock
Content-Type: application/json

{
  "lock": true,
  "reason": "Vi phạm nội quy chat"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Room locked",
  "room": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Phòng Marketing",
    "isLocked": true,
    "lockedAt": "2024-01-15T15:00:00.000Z",
    "lockedBy": "507f1f77bcf86cd799439099",
    "lockReason": "Vi phạm nội quy chat"
  }
}
```

**Audit Log:**
- Action: `CHAT_ROOM_LOCK` hoặc `CHAT_ROOM_UNLOCK`
- Risk Level: `MEDIUM`

---

## 6. Member Management API

### POST /rooms/:id/members

Thêm một thành viên vào phòng chat.

**Roles:** SUPER_ADMIN, ADMIN

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | ID của phòng chat |

**Request Body:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | ID của user cần thêm |
| role | string | No | Vai trò: `OWNER`, `ADMIN`, `MEMBER` (default: `MEMBER`) |

**Example Request:**
```
POST /api/chat/rooms/507f1f77bcf86cd799439011/members
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439025",
  "role": "MEMBER"
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Phòng Marketing",
    "memberCount": 11,
    "members": [
      // ... updated members list
    ]
  }
}
```

**Error Response (400):**
```json
{
  "message": "User is already a member"
}
```

**Audit Log:**
- Action: `CHAT_MEMBER_ADD`
- Risk Level: `MEDIUM`

---

### DELETE /rooms/:id/members/:userId

Xóa một thành viên khỏi phòng chat.

**Roles:** SUPER_ADMIN, ADMIN

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | ID của phòng chat |
| userId | string | ID của user cần xóa |

**Example Request:**
```
DELETE /api/chat/rooms/507f1f77bcf86cd799439011/members/507f1f77bcf86cd799439025
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Phòng Marketing",
    "memberCount": 10,
    "members": [
      // ... updated members list
    ]
  }
}
```

**Error Response (400):**
```json
{
  "message": "User is not a member"
}
```

**Audit Log:**
- Action: `CHAT_MEMBER_REMOVE`
- Risk Level: `MEDIUM`

---

## 7. System Message API

### POST /rooms/:id/system-message

Gửi tin nhắn hệ thống đến một phòng chat. Tin nhắn này sẽ hiển thị với tên "System".

**Roles:** SUPER_ADMIN, ADMIN

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | ID của phòng chat |

**Request Body:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | Yes | Nội dung tin nhắn |
| attachments | array | No | File đính kèm |

**Example Request:**
```
POST /api/chat/rooms/507f1f77bcf86cd799439011/system-message
Content-Type: application/json

{
  "text": "⚠️ Lưu ý: Hệ thống sẽ bảo trì vào 22:00 tối nay",
  "attachments": []
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439030",
  "userId": "507f1f77bcf86cd799439099",
  "userName": "System",
  "text": "⚠️ Lưu ý: Hệ thống sẽ bảo trì vào 22:00 tối nay",
  "attachments": [],
  "roomId": "507f1f77bcf86cd799439011",
  "room": "Phòng Marketing",
  "isSystemMessage": true,
  "createdAt": "2024-01-15T15:30:00.000Z"
}
```

**Audit Log:**
- Action: `CHAT_SYSTEM_MESSAGE`
- Risk Level: `MEDIUM`

---

## 8. Delete Room API

### DELETE /rooms/:id

Xóa (soft delete) một phòng chat. Phòng sẽ được đánh dấu là đã xóa nhưng vẫn lưu trong database.

**Roles:** SUPER_ADMIN, ADMIN

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | ID của phòng chat |

**Example Request:**
```
DELETE /api/chat/rooms/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

**Error Response (404):**
```json
{
  "message": "Room not found"
}
```

**Audit Log:**
- Action: `CHAT_ROOM_DELETE`
- Risk Level: `HIGH`

---

## 9. Export API

### GET /export

Export log chat theo các tiêu chí lọc.

**Roles:** SUPER_ADMIN, ADMIN, AUDITOR

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| roomId | string | No | Lọc theo phòng |
| startDate | date | No | Từ ngày (YYYY-MM-DD) |
| endDate | date | No | Đến ngày (YYYY-MM-DD) |
| format | string | No | Định dạng: `json` (default) hoặc `csv` |

**Example Request:**
```
GET /api/chat/export?roomId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-15&format=csv
```

**Response (CSV):**
```csv
Date,Room,User,Message,Attachments
2024-01-15T10:30:00.000Z,Phòng Marketing,Nguyễn Văn A,Chào mọi người!,0
2024-01-15T10:31:00.000Z,Phòng Marketing,Trần Thị B,Xin chào!,0
```

**Response (JSON):**
```json
{
  "messages": [
    {
      "id": "507f1f77bcf86cd799439021",
      "userId": "507f1f77bcf86cd799439014",
      "userName": "Nguyễn Văn A",
      "text": "Chào mọi người!",
      "roomId": "507f1f77bcf86cd799439011",
      "room": "Phòng Marketing",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "exportedAt": "2024-01-15T16:00:00.000Z",
  "total": 100
}
```

**Headers:**
- CSV: `Content-Type: text/csv`, `Content-Disposition: attachment; filename=chat_logs_*.csv`

**Audit Log:**
- Action: `CHAT_EXPORT`
- Risk Level: `MEDIUM`

---

## 10. Policy Management API

### GET /policy

Lấy cấu hình chính sách chat hiện tại.

**Roles:** SUPER_ADMIN, ADMIN, AUDITOR

**Example Request:**
```
GET /api/chat/policy
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439040",
  "name": "default",
  "description": "Default chat policy",
  "messageRetention": {
    "enabled": true,
    "days": 90,
    "autoDelete": false
  },
  "fileUpload": {
    "enabled": true,
    "maxFileSize": 10485760,
    "allowedTypes": ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"]
  },
  "restrictions": {
    "maxMessageLength": 5000,
    "maxMessagesPerMinute": 10,
    "blockExternalLinks": false
  },
  "moderation": {
    "enableAutoModeration": false,
    "flaggedKeywords": []
  },
  "audit": {
    "logAllMessages": true,
    "logFileUploads": true,
    "retentionDays": 365
  },
  "updatedBy": "507f1f77bcf86cd799439099",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

---

### PUT /policy

Cập nhật cấu hình chính sách chat.

**Roles:** SUPER_ADMIN, ADMIN

**Request Body:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| messageRetention | object | No | Cấu hình lưu trữ tin nhắn |
| fileUpload | object | No | Cấu hình upload file |
| restrictions | object | No | Hạn chế tin nhắn |
| moderation | object | No | Kiểm duyệt tự động |
| audit | object | No | Cấu hình audit |

**Request Body Details:**

```json
{
  "messageRetention": {
    "enabled": true,
    "days": 90,
    "autoDelete": false
  },
  "fileUpload": {
    "enabled": true,
    "maxFileSize": 10485760,
    "allowedTypes": ["jpg", "jpeg", "png", "gif", "pdf"]
  },
  "restrictions": {
    "maxMessageLength": 5000,
    "maxMessagesPerMinute": 10,
    "blockExternalLinks": false
  },
  "moderation": {
    "enableAutoModeration": true,
    "flaggedKeywords": ["spam", " scam", "xxx"]
  },
  "audit": {
    "logAllMessages": true,
    "logFileUploads": true,
    "retentionDays": 365
  }
}
```

**Example Request:**
```
PUT /api/chat/policy
Content-Type: application/json

{
  "restrictions": {
    "maxMessageLength": 3000,
    "maxMessagesPerMinute": 5
  },
  "moderation": {
    "enableAutoModeration": true,
    "flaggedKeywords": ["spam", "quảng cáo"]
  }
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439040",
  "name": "default",
  "description": "Default chat policy",
  "messageRetention": {
    "enabled": true,
    "days": 90,
    "autoDelete": false
  },
  "fileUpload": {
    "enabled": true,
    "maxFileSize": 10485760,
    "allowedTypes": ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"]
  },
  "restrictions": {
    "maxMessageLength": 3000,
    "maxMessagesPerMinute": 5,
    "blockExternalLinks": false
  },
  "moderation": {
    "enableAutoModeration": true,
    "flaggedKeywords": ["spam", "quảng cáo"]
  },
  "audit": {
    "logAllMessages": true,
    "logFileUploads": true,
    "retentionDays": 365
  },
  "updatedBy": "507f1f77bcf86cd799439099",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T16:30:00.000Z"
}
```

**Audit Log:**
- Action: `CHAT_POLICY_UPDATE`
- Risk Level: `HIGH`

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "message": "Room not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

---

## Data Models

### ChatRoom
```typescript
interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: 'PRIVATE' | 'GROUP' | 'DEPARTMENT' | 'PROJECT';
  isPrivate: boolean;
  isSystemRoom: boolean;
  createdBy: string;
  departmentId: string | null;
  projectId: string | null;
  members: Member[];
  memberCount: number;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  lockReason: string;
  allowFileUpload: boolean;
  maxFileSize: number;
  autoDeleteDays: number;
  maxMessageLength: number;
  lastMessageAt: Date | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Member {
  userId: UserInfo | string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: Date;
  leftAt: Date | null;
}

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}
```

### Message
```typescript
interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  attachments: Attachment[];
  roomId: string;
  room: string | { name: string };
  isDeleted: boolean;
  isHidden: boolean;
  isSystemMessage: boolean;
  deletionReason: string;
  deletedAt: Date | null;
  deletedBy: string | null;
  editedAt: Date | null;
  isEdited: boolean;
  reactions: Reaction[];
  createdAt: Date;
  updatedAt: Date;
}

interface Reaction {
  emoji: string;
  users: string[];
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}
```

### ChatPolicy
```typescript
interface ChatPolicy {
  _id: string;
  name: string;
  description: string;
  messageRetention: {
    enabled: boolean;
    days: number;
    autoDelete: boolean;
  };
  fileUpload: {
    enabled: boolean;
    maxFileSize: number;
    allowedTypes: string[];
  };
  restrictions: {
    maxMessageLength: number;
    maxMessagesPerMinute: number;
    blockExternalLinks: boolean;
  };
  moderation: {
    enableAutoModeration: boolean;
    flaggedKeywords: string[];
  };
  audit: {
    logAllMessages: boolean;
    logFileUploads: boolean;
    retentionDays: number;
  };
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```
