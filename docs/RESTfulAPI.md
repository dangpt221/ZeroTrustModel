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

## Table of Contents
1. [Authentication](#1-authentication-api)
2. [Users](#2-users-api)
3. [Departments](#3-departments-api)
4. [Teams](#4-teams-api)
5. [Projects](#5-projects-api)
6. [Documents](#6-documents-api)
7. [Chat](#7-chat-api)
8. [Messages](#8-messages-api)
9. [Attendance](#9-attendance-api)
10. [Notifications](#10-notifications-api)
11. [Audit Logs](#11-audit-logs-api)
12. [Zero Trust Config](#12-zero-trust-config-api)
13. [Roles & Permissions](#13-roles--permissions-api)

---

## 1. Authentication API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/login | Public | Login with email/password (returns MFA challenge) |
| POST | /auth/logout | Auth | Logout |
| GET | /auth/me | Auth | Get current user profile |
| PUT | /auth/profile | Auth | Update current user profile |

### POST /auth/login
```json
// Request
{
  "email": "admin@example.com",
  "password": "password123",
  "mfaCode": "123456"  // Required for step 2
}

// Response (MFA Required)
{
  "needsMFA": true,
  "message": "Xac thuc bao mat la bat buoc...",
  "riskScore": 85,
  "riskFactors": ["NEW_DEVICE"]
}

// Response (Success)
{
  "user": {
    "id": "...",
    "name": "Nguyen Van A",
    "email": "admin@example.com",
    "role": "ADMIN",
    "avatar": "https://...",
    "mfaEnabled": true,
    "trustScore": 95,
    "status": "ACTIVE",
    "isOnline": true
  },
  "riskScore": 95,
  "riskFactors": []
}
```

---

## 2. Users API

### Admin User Management

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /admin/users | ADMIN | Get all users |
| POST | /admin/users | ADMIN | Create new user |
| PUT | /admin/users/:id | ADMIN | Update user |
| DELETE | /admin/users/:id | ADMIN | Delete user |
| POST | /admin/users/:id/lock | ADMIN | Lock/unlock user |
| POST | /admin/users/:id/approve | ADMIN | Approve user |
| POST | /admin/users/:id/reject | ADMIN | Reject user |
| POST | /admin/users/:id/mfa | ADMIN | Toggle MFA |
| POST | /admin/users/:id/reset-password | ADMIN | Reset password |

### Manager User Management

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /manager/users | ADMIN, MANAGER | Get team members |
| PUT | /manager/users/:id | ADMIN, MANAGER | Update team member |
| POST | /manager/users/:id/lock | ADMIN, MANAGER | Lock team member |

### Public User Routes

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /users | Auth | Get users list |
| GET | /users/:id | Auth | Get user by ID |

---

## 3. Departments API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /departments | Auth | Get all departments |
| GET | /departments/:id | Auth | Get department details |
| GET | /departments-stats/stats | Auth | Get department statistics |
| POST | /departments | ADMIN | Create department |
| PUT | /departments/:id | ADMIN | Update department |
| DELETE | /departments/:id | ADMIN | Delete (soft) department |
| POST | /departments/:id/members | ADMIN | Assign member |
| DELETE | /departments/:id/members/:userId | ADMIN | Remove member |

---

## 4. Teams API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /teams | Auth | Get all teams |
| GET | /teams/:id | Auth | Get team details |
| POST | /teams | ADMIN, MANAGER | Create team |
| PUT | /teams/:id | ADMIN, MANAGER | Update team |
| DELETE | /teams/:id | ADMIN | Delete team |
| POST | /teams/:id/members | ADMIN, MANAGER | Add member |
| DELETE | /teams/:id/members/:userId | ADMIN, MANAGER | Remove member |

---

## 5. Projects API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /projects | Auth | Get all projects |
| GET | /projects/:id | Auth | Get project details |
| POST | /projects | ADMIN, MANAGER | Create project |
| PUT | /projects/:id | ADMIN, MANAGER | Update project |
| DELETE | /projects/:id | ADMIN | Delete project |
| GET | /projects/:projectId/tasks | Auth | Get project tasks |
| POST | /projects/:projectId/tasks | Auth | Create task |
| PUT | /tasks/:taskId | Auth | Update task |

---

## 6. Documents API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /documents | Auth | Get all documents |
| GET | /documents/:id | Auth | Get document details |
| POST | /documents/upload | Auth | Upload file |
| POST | /documents | ADMIN, MANAGER, STAFF, MEMBER | Create document |
| PUT | /documents/:id | Auth | Update document |
| POST | /documents/:id/upload | Auth | Upload new version |
| DELETE | /documents/:id | ADMIN, MANAGER | Delete document |
| POST | /documents/:id/approve | ADMIN, MANAGER | Approve document |
| POST | /documents/:id/reject | ADMIN, MANAGER | Reject document |
| GET | /documents/:id/download | Auth | Download document |
| GET | /documents-stats/stats | ADMIN, MANAGER | Get document statistics |

---

## 7. Chat API

### Chat Statistics
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /chat/stats | ADMIN, AUDITOR | Get chat statistics |

### Chat Rooms
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /chat/rooms | ADMIN, MANAGER, AUDITOR | Get all rooms |
| GET | /chat/rooms/:id | ADMIN, MANAGER, AUDITOR | Get room details |
| DELETE | /chat/rooms/:id | ADMIN | Delete room |
| POST | /chat/rooms/:id/lock | ADMIN | Lock/unlock room |
| POST | /chat/rooms/:id/members | ADMIN | Add member |
| DELETE | /chat/rooms/:id/members/:userId | ADMIN | Remove member |
| POST | /chat/rooms/:id/system-message | ADMIN | Send system message |

### Chat Messages
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /chat/rooms/:id/messages | ADMIN, MANAGER, AUDITOR | Get room messages |
| GET | /chat/messages/search | ADMIN, AUDITOR | Search messages |
| DELETE | /chat/messages/:id | ADMIN | Delete message |

### Chat Policy
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /chat/policy | ADMIN, AUDITOR | Get chat policy |
| PUT | /chat/policy | ADMIN | Update chat policy |

### Chat Export
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /chat/export | ADMIN, AUDITOR | Export chat logs |

---

## 8. Messages API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /messages | Auth | Get messages (filter by room query param) |

---

## 9. Attendance API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /attendance/check-in | Auth | Check in |
| POST | /attendance/check-out | Auth | Check out |
| GET | /attendance/history | Auth | Get attendance history |

---

## 10. Notifications API

### Admin Routes
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /notifications/all | ADMIN | Get all notifications |
| POST | /notifications | ADMIN | Create notification |
| POST | /notifications/broadcast | ADMIN | Broadcast notification |

### User Routes
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /notifications | Auth | Get my notifications |
| GET | /notifications/unread-count | Auth | Get unread count |
| PUT | /notifications/:id/read | Auth | Mark as read |
| PUT | /notifications/read-all | Auth | Mark all as read |

---

## 11. Audit Logs API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /audit-logs | ADMIN | Get all audit logs |
| GET | /audit-logs/me | Auth | Get my audit logs |
| POST | /audit-logs | Auth | Create audit log entry |

---

## 12. Zero Trust Config API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /zero-trust/config | Auth | Get Zero Trust config |
| PUT | /zero-trust/config | ADMIN | Update Zero Trust config |

---

## 13. Roles & Permissions API

### Roles
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /admin/roles | ADMIN | Get all roles |
| POST | /admin/roles | ADMIN | Create role |
| PUT | /admin/roles/:id | ADMIN | Update role |
| DELETE | /admin/roles/:id | ADMIN | Delete role |
| GET | /admin/roles/:roleName/users | ADMIN | Get users by role |

### Permissions
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /admin/permissions | ADMIN | Get all permissions |

---

## OAuth - Google Login

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /auth/google | Redirect to Google OAuth |
| GET | /auth/google/callback | Google OAuth callback |

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid credentials |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## Pagination

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
