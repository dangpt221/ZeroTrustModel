# Bảo Mật Tài Liệu Upload - Phân Tích & Giải Pháp

## 1. Các Lỗ Hổng Phổ Biến Khi Upload File

### 1.1. Lỗ Hổng Upload

| Lỗ hổng | Mô tả | Mức nguy hiểm |
|----------|--------|--------------|
| Không kiểm tra loại file | Cho phép upload `.exe`, `.php`, `.jsp` → RCE | 🔴 CRITICAL |
| Không giới hạn kích thước | Upload file hàng GB → DoS, chiếm disk | 🟠 HIGH |
| Lưu file cùng tên gốc | Overwrite file hệ thống, path traversal | 🔴 CRITICAL |
| Không mã hóa file | File nhạy cảm lưu plain text trên disk | 🔴 CRITICAL |
| Thiếu quyền truy cập file | Mọi user đều đọc được thư mục uploads | 🟠 HIGH |
| Không scan malware | Upload và phát tán malware | 🔴 CRITICAL |
| Thiếu audit log | Không biết ai upload, download, xóa | 🟡 MEDIUM |

### 1.2. Kịch Bản Tấn Công Phổ Biến

```
┌─────────────────────────────────────────────────────────────┐
│  Kịch bản 1: Upload Webshell                               │
│                                                             │
│  Hacker → Upload file .php disguised as .pdf                │
│        → File saved as: /uploads/docs/evil.php              │
│        → Access: GET /uploads/docs/evil.php                 │
│        → RCE: hacker runs system commands                  │
│                                                             │
│  Kịch bản 2: Path Traversal                                │
│                                                             │
│  Hacker → Upload file with name: "../../../etc/passwd"      │
│        → File overwrites system file                       │
│        → Complete server compromise                         │
│                                                             │
│  Kịch bản 3: Mass Download (Data Exfiltration)             │
│                                                             │
│  Hacker → Login as valid user                               │
│        → Script: loop download all documents                │
│        → 100 docs/minute for 1 hour                        │
│        → 6000 documents = complete data breach              │
│                                                             │
│  Kịch bản 4: Sensitive File Exposure                       │
│                                                             │
│  Hacker → Physical server access                            │
│        → Copy entire /uploads folder                       │
│        → All documents readable                             │
│        → Database backup + documents = full data dump       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Cách ZeroTrust Model Giải Quyết

### 2.1. Lớp 1: Kiểm Tra Upload (Multer File Filter)

**File:** `src/routes/documents.js`

```javascript
// LỌC LOẠI FILE - CHỈ CHO PHÉP FILE VĂN BẢN AN TOÀN
const upload = multer({
  storage,                          // Lưu vào thư mục riêng, đổi tên ngẫu nhiên
  limits: { fileSize: 50 * 1024 * 1024 },  // Giới hạn 50MB
  fileFilter: (req, file, cb) => {
    // CHỈ CHO PHÉP CÁC ĐỊNH DẠNG AN TOÀN
    const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|png|jpg|jpeg|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    // TỪ CHỐI .php, .jsp, .exe, .sh, .html, .svg (có thể chứa XSS)
    if (!extname) {
      return cb(new Error('Invalid file type - only documents allowed'));
    }
    cb(null, true);
  }
});
```

**Kết quả:**
- ❌ Từ chối: `.php`, `.jsp`, `.exe`, `.sh`, `.html`, `.svg`
- ✅ Cho phép: `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`

---

### 2.2. Lớp 2: Mã Hóa File (Encryption at Rest - AES-256-GCM)

**File:** `src/utils/encryption.js`

```
TRƯỚC KHI MÃ HÓA (plaintext trên disk):
┌──────────────────────────────────────┐
│  File: Danh_sach_nhan_vien_2026.pdf  │
│  Content: [binary data]              │
│  READABLE by anyone with disk access │
└──────────────────────────────────────┘
              ↓ AES-256-GCM encryption
              ↓ Master Key (stored in .encryption_key)
              ↓ IV + ciphertext + authTag
AFTER ENCRYPTION (on disk):
┌──────────────────────────────────────────────────┐
│  File: encrypted_d8f3a2b1c4e5.pdf.enc           │
│  Content: [random bytes - meaningless]           │
│  🔒 NEEDS master key to decrypt                 │
│  📋 Hacker with disk access CANNOT read content │
└──────────────────────────────────────────────────┘
```

**Code flow khi upload file mã hóa:**

```javascript
// 1. Client upload file thường
POST /api/documents/upload
   └── req.file (plain buffer)
           ↓
2. Server mã hóa ngay lập tức
   import { encryptFile } from '../utils/encryption.js';
   await encryptFile(req.file.path, encryptedPath);
           ↓
3. Xóa file gốc (plaintext) khỏi disk
   fs.unlinkSync(req.file.path); // Không lưu file gốc
           ↓
4. Chỉ lưu file đã mã hóa
   /uploads/documents/encrypted_{random}.{ext}.enc
           ↓
5. Trả về metadata cho client
   { filename, url, encrypted: true, algorithm: 'AES-256-GCM' }
```

**Code flow khi download file đã mã hóa:**

```javascript
// decryptAndDownload() - src/controllers/documentController.js

1. Kiểm tra quyền (DRM + Rate Limit)
   ├── checkDRMPermission(doc, user, DOWNLOAD)
   └── checkDownloadRateLimit(userId, ip)
           ↓ (pass both checks)
2. Tìm file đã mã hóa
   /uploads/documents/encrypted_{filename}.enc
           ↓
3. Giải mã vào bộ nhớ tạm
   const { decryptFile } from '../utils/encryption.js';
   await decryptFile(encryptedPath, tempPath);
           ↓
4. Gửi file cho user
   res.download(tempPath, `${doc.title}.${doc.fileType}`);
           ↓
5. XÓA file tạm ngay sau khi gửi
   fs.unlinkSync(tempPath); // Không lưu trên disk
```

**Bảo vệ:**
- 🔐 AES-256-GCM: standard mã hóa quân sự
- 🔑 Master key tách biệt: chỉ server process đọc được
- 🗑️ File tạm tự hủy: không lưu plaintext trên disk
- 📋 Auth tag: phát hiện file bị sửa đổi/tamper

---

### 2.3. Lớp 3: DRM (Digital Rights Management)

**File:** `src/utils/drm.js`

```
LUỒNG DRM THEO CLASSIFICATION:

CONFIDENTIAL (CRITICAL document)
├── VIEW:     ✅ Allowed (có quyền)
├── DOWNLOAD: ⚠️  Cần Trust Score ≥ 70
├── PRINT:    ❌ Bị cấm (Security Level 3) hoặc giới hạn 3 lần in
├── COPY:     ❌ Tuyệt đối cấm copy nội dung
├── SHARE:    ❌ Chỉ owner hoặc admin được share
├── WATERMARK: ✅ Tự động gắn watermark khi hiển thị
└── EXPIRY:   ⏰ Hết hạn sau 7 ngày

INTERNAL (sensitive document)
├── VIEW:     ✅ Allowed
├── DOWNLOAD: ✅ Allowed
├── PRINT:    ✅ Allowed
├── COPY:     ✅ Allowed (nhưng audit log ghi lại)
├── WATERMARK: ⚠️ Chỉ khi Security Level 3
└── EXPIRES:  ❌ Không có expiry

PUBLIC (general document)
├── All actions: ✅ Full access (không cần DRM)
```

**Code flow DRM khi xem document:**

```javascript
// getDocumentById() - src/controllers/documentController.js

1. Lấy document từ DB
   const doc = await Document.findById(id);
           ↓
2. Wrap với DRM policy
   import { wrapWithDRM, checkDRMPermission, DRM_ACTIONS } from '../utils/drm.js';
   const drmDoc = wrapWithDRM(doc, user);
           ↓
3. Kiểm tra quyền VIEW
   const permission = checkDRMPermission(doc, user, DRM_ACTIONS.VIEW);
           ↓
4. Audit log mọi hành động
   await logDRMAction(req, doc, 'VIEW', permission.allowed, reason);
           ↓
5. Trả về document + DRM metadata
   {
     ...doc,
     drm: {
       enabled: true,
       policy: {
         view: true,
         download: false,    // CONFIDENTIAL = không được tải
         print: false,       // Không được in
         copy: false,        // Không được copy
         watermark: true,    // Có watermark
         expiresAt: '2026-04-01',  // Hết hạn 7 ngày
       }
     }
   }
```

---

### 2.4. Lớp 4: Rate Limit Download

**File:** `src/utils/downloadRateLimiter.js`

```
TRƯỚC KHI CÓ RATE LIMIT:
┌──────────────────────────────────────────────────────────┐
│  Hacker: for i in {1..1000}; do                         │
│            curl /api/documents/$i/download               │
│          done                                           │
│                                                          │
│  Result: 1000 downloads in 1 minute                    │
│         → All documents stolen = DATA BREACH             │
└──────────────────────────────────────────────────────────┘

SAU KHI CÓ RATE LIMIT:
┌──────────────────────────────────────────────────────────┐
│  Request 1-10:  ✅ Allowed (remaining: 10 → 0)          │
│  Request 11:    ❌ BLOCKED (429 Too Many Requests)      │
│                                                          │
│  Headers:                                                   │
│    X-RateLimit-Limit: 10                                │
│    X-RateLimit-Remaining: 0                             │
│    Retry-After: 300 (seconds)                           │
│                                                          │
│  Message: "Bạn đã tải quá nhiều tài liệu.               │
│                    Vui lòng chờ 5 phút."                │
│                                                          │
│  Audit: ALERT logged → Security team notified           │
└──────────────────────────────────────────────────────────┘
```

**Code flow rate limit:**

```javascript
// downloadDocument() - src/controllers/documentController.js

1. Lấy IP và userId
   const userIp = getClientIP(req);
   const userId = req.user.id;
           ↓
2. Kiểm tra rate limit
   import { checkDownloadRateLimit } from '../utils/downloadRateLimiter.js';
   const rateLimitCheck = checkDownloadRateLimit(userId, userIp);
           ↓
   // Trong checkDownloadRateLimit():
   // - Đếm số download trong 60 giây qua
   // - Nếu >= 10 → BLOCK
   // - Nếu == 7 → ALERT (cảnh báo admin)
   // - Nếu > 10 → BLOCK 5 phút
           ↓
3. Nếu blocked → Trả lỗi 429
   return res.status(429).json({
     message: rateLimitCheck.reason,
     rateLimit: { blocked: true, retryAfter: 300 },
   });
           ↓
4. Nếu allowed → Ghi nhận download
   recordDownload(userId, userIp, id, doc.title);
   // Trong recordDownload():
   // - Tăng counter
   // - Log ai download gì, lúc nào
   // - Nếu vượt limit → block 5 phút
   // - Nếu đạt 7/10 → tạo AuditLog cảnh báo
           ↓
5. Thêm headers vào response
   res.setHeader('X-RateLimit-Limit', 10);
   res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining);
```

**Bảng theo dõi (in-memory map):**

```
Key: userId hoặc IP
Value: {
  windowStart: timestamp bắt đầu,
  count: số download trong window,
  blocked: true/false,
  blockedUntil: timestamp kết thúc block,
  downloads: [
    { documentId, documentTitle, timestamp },
    ...
  ]
}
```

---

### 2.5. Lớp 5: Honeytoken (Phát Hiện Data Breach)

**File:** `src/models/Honeytoken.js`, `src/routes/honeytoken.js`

```
KỊCH BẢN HONEYTOKEN:

Admin tạo 1 honeytoken:
├── Name: "Danh_sach_luong_2026_Q1.xlsx"
├── Type: DOCUMENT
├── Description: "Bảng lương mật - TUYỆT ĐỐI KHÔNG TẢI"
├── Cho hiển thị với tên hấp dẫn trong danh sách tài liệu
└── Cảnh báo: alertEmail + alertWebhook + AuditLog

Ngày X - Hacker đăng nhập thành công:
├── Tìm kiếm: "danh sach luong"
├── Kết quả: "Danh_sach_luong_2026_Q1.xlsx" ← HONEYPOT 🪤
├── Hacker: Tải xuống
│     ↓
└── HONEYPOT TRIGGERED!
    ├── AuditLog: HONEYTOKEN_TRIGGERED (CRITICAL risk)
    ├── Email alert → Tất cả admin
    ├── Webhook → Security system
    ├── Ghi lại: IP, user-agent, timestamp, userId
    └── Tự động lock tài khoản hacker
```

**Code flow honeytoken trigger:**

```javascript
// honeytoken.js - trigger endpoint

1. Hacker truy cập honeytoken document
   GET /api/documents/:honeytokenId
           ↓
2. Trong getDocumentById(), kiểm tra honeytoken
   const token = await Honeytoken.findOne({ fakeDocumentId: docId });
           ↓
3. Nếu là honeytoken → Gọi trigger
   if (token && token.isActive) {
     await triggerHoneytoken(token, req);
   }
           ↓
4. triggerHoneytoken() thực hiện:
   ├── Ghi nhận trigger: isTriggered = true
   ├── Log chi tiết: IP, user-agent, timestamp
   ├── Tạo AuditLog CRITICAL
   ├── Gửi email alert cho tất cả admin
   ├── Gọi webhook (Slack, Teams, SIEM...)
   └── (Tùy chọn) Lock tài khoản hacker
           ↓
5. Trả về "404" cho hacker (không biết đây là honeytoken)
   // Hacker nghĩ đã tải được file
   // Thực ra file là rỗng hoặc không tồn tại
```

---

### 2.6. Lớp 6: MFA cho Hành Động Nhạy Cảm

**File:** `src/utils/sensitiveActionMFA.js`

```
TRƯỚC KHI CÓ MFA NHẠY CẢM:

Hacker → Đăng nhập thành công (leaked password)
       → Xóa tất cả tài liệu CRITICAL
       → Lock toàn bộ tài khoản nhân viên
       → Xuất audit log để xóa dấu vết
       → ✅ Tất cả thực hiện được với 1 lần đăng nhập

SAU KHI CÓ MFA NHẠY CẢM:

Hacker → Đăng nhập thành công
       → Thử xóa tài liệu CRITICAL
       │     ↓
       │  Kiểm tra: Trust Score = 50 (THẤP)
       │  Yêu cầu: Trust Score ≥ 80 cho hành động này
       │     ↓
       │  Response: "403 - Yêu cầu MFA code"
       │     ↓
       └─ ❌ Hacker không có điện thoại để lấy TOTP
              → Hành động bị CHẶN

User bình thường (Trust Score cao):
       → Đăng nhập với MFA đầy đủ
       → Thử xóa tài liệu CRITICAL
       │     ↓
       │  Trust Score = 95 (CAO)
       │  >= ngưỡng yêu cầu (80)
       │     ↓
       │  ⚠️  Vẫn yêu cầu MFA thêm 1 lần nữa
       │     ↓
       │  Nhập TOTP từ Google Authenticator
       │     ↓
       │  ✅ Xóa thành công + AuditLog ghi nhận
```

**10 hành động yêu cầu MFA:**

```javascript
SENSITIVE_ACTIONS = {
  DOCUMENT_DOWNLOAD_CRITICAL: { name: 'Tải tài liệu CRITICAL', mfaRequired: true, minTrustScore: 70 },
  DOCUMENT_DELETE_CRITICAL:    { name: 'Xóa tài liệu CRITICAL', mfaRequired: true, minTrustScore: 80 },
  USER_LOCK:                  { name: 'Khóa tài khoản',          mfaRequired: true, minTrustScore: 80 },
  USER_UNLOCK:                { name: 'Mở khóa tài khoản',       mfaRequired: true, minTrustScore: 75 },
  SECURITY_CONFIG_CHANGE:      { name: 'Thay đổi bảo mật',        mfaRequired: true, minTrustScore: 85 },
  EXPORT_AUDIT_LOG:           { name: 'Xuất audit log',           mfaRequired: true, minTrustScore: 80 },
  BULK_DATA_ACCESS:           { name: 'Truy cập dữ liệu hàng loạt', mfaRequired: true, minTrustScore: 70 },
  MFA_DISABLE:                 { name: 'Tắt MFA',                   mfaRequired: true, minTrustScore: 90 },
  PASSWORD_CHANGE_ADMIN:      { name: 'Đổi mật khẩu user khác',  mfaRequired: true, minTrustScore: 85 },
}
```

---

## 3. Tổng Hợp Luồng Bảo Mật Toàn Diện

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ZERO TRUST - DEFENSE IN DEPTH                            │
│                  (Phòng thủ chiều sâu - 6 lớp bảo vệ)                     │
└─────────────────────────────────────────────────────────────────────────────┘

LAYER 1: AUTHENTICATION
[Hacker đăng nhập]
├── JWT token với 12h expiry
├── MFA/TOTP bắt buộc
├── Trust Score check
└── Thiết bị phải được trusted
     ↓

LAYER 2: AUTHORIZATION (RBAC)
[Truy cập /api/documents]
├── requireAuth middleware → Xác minh JWT
├── requireRole middleware → Kiểm tra quyền (ADMIN/MANAGER/STAFF)
├── Trust Score ≥ 70 cho STAFF
└── Security Level check (1-3 clearance)
     ↓

LAYER 3: UPLOAD VALIDATION (Multer)
[Upload file]
├── ✅ Kiểm tra extension (chỉ .pdf/.doc/.docx...)
├── ✅ Giới hạn 50MB
├── ✅ Đổi tên file ngẫu nhiên
├── ✅ Lưu vào thư mục riêng biệt (/uploads/documents)
└── ✅ Không lưu với tên gốc
     ↓

LAYER 4: ENCRYPTION AT REST (AES-256-GCM)
[File được lưu trên disk]
├── 🔐 Mã hóa với master key
├── 🔐 File trên disk = random bytes (vô nghĩa)
├── 🔐 Cần master key để đọc
└── 🔐 Auth tag chống tampering
     ↓

LAYER 5: DRM (Digital Rights Management)
[Khi user xem/tải document]
├── Classification check (CONFIDENTIAL/INTERNAL/PUBLIC)
├── Action check (VIEW/DOWNLOAD/PRINT/COPY/SHARE)
├── Watermark metadata gắn vào document
├── Print limit cho CRITICAL documents
├── Expiry date cho CONFIDENTIAL documents
└── Không cho copy nội dung CONFIDENTIAL
     ↓

LAYER 6: RATE LIMITING
[Khi user tải file]
├── ✅ Max 10 downloads/phút
├── ✅ Alert khi đạt 7 downloads
├── ✅ Block 5 phút nếu vượt quá
├── ✅ Audit log mọi lượt tải
└── ✅ Admin có thể reset rate limit
     ↓

LAYER 7: AUDIT LOGGING (Every Action)
[Mọi hành động đều được ghi]
├── WHO: userId, userName, email
├── WHAT: action (VIEW, DOWNLOAD, DELETE, etc.)
├── WHEN: timestamp
├── WHERE: IP, device, user-agent
├── WHY: details (document name, etc.)
├── RESULT: SUCCESS/FAILURE/BLOCKED
└── RISK: LOW/MEDIUM/HIGH/CRITICAL
     ↓

LAYER 8: HONEYTOKEN (Early Warning System)
[Nếu hacker tìm thấy file nhạy cảm]
├── 🪤 File bait với tên hấp dẫn
├── 📧 Email alert tức thì cho admin
├── 🔗 Webhook → Security system
├── 📋 Audit CRITICAL risk level
└── 🔒 Auto-lock tài khoản nghi ngờ
     ↓

LAYER 9: MFA SENSITIVE ACTIONS
[Nếu hacker thực hiện hành động nhạy cảm]
├── 10 sensitive actions yêu cầu TOTP
├── Trust Score check
├── Giảm trust score khi MFA fail
└── Audit log mọi MFA attempt
     ↓

LAYER 10: FORENSIC WATERMARKING
[Mỗi lượt tải]
├── Tạo watermark DUY NHẤT: userId + timestamp + IP hash
├── Visible watermark trên document
├── Hidden watermark embed vào PDF metadata
├── Cryptographic signature chống giả mạo
└── Ghi log watermark vào audit
     ↓

LAYER 11: ANOMALY DETECTION
[Phát hiện hành vi bất thường]
├── EXCESSIVE: > 30 docs/ngày → CRITICAL
├── MASS: > 50 docs/ngày → AUTO-LOCK
├── UNUSUAL_HOURS: 2h-6h sáng → ALERT
├── RAPID_FIRE: > 5 docs/phút → ALERT
└── CRITICAL_ACCESS: > 5 docs CONFIDENTIAL/ngày → ALERT
     ↓

LAYER 12: DOCUMENT FINGERPRINT
[Mỗi bản tải có hash DUY NHẤT]
├── SHA-512: content + userId + nonce + timestamp
├── Short FP (8 chars) hiển thị trên document
├── Embed vào PDF metadata
├── So sánh 2 doc → biết CÙNG hay KHÁC người tải
└── Dùng truy vết khi document bị leak
     ↓

LAYER 13: SECURE STREAMING
[Server-side rendering thay vì raw file]
├── Server render → watermark → stream → user
├── Connection close = document MẤT
├── Không lưu trên disk user
├── Không cache (X-No-Store)
└── Có thể revoke session bất kỳ lúc
     ↓

LAYER 14: EMERGENCY LOCK
[Phát hiện breach → kích hoạt khẩn cấp]
├── SYSTEM: Lock ALL users (trừ Admin)
├── DOCUMENT: Lock tài liệu cụ thể
├── USER: Lock tài khoản cụ thể
├── DEPARTMENT: Lock phòng ban
├── BREACH: Full response - lock + revoke links
└── Auto-unlock sau X phút (tùy chọn)
```

---

## Kịch Bản: Khi Tài Liệu Bị Leak

```
BƯỚC 1: Phát hiện document bị leak
─────────────────────────────────────
• Document xuất hiện trên internet / dark web
• Honeytoken bị trigger → alert tức thì
• Hoặc: người khác báo cáo

BƯỚC 2: Trích xuất watermark + fingerprint
─────────────────────────────────────
• Lấy watermark từ document leak
  └── User: Nguyễn Văn A | 2026-03-21 14:32
• Lấy fingerprint từ document leak
  └── FP: A3F7B2C9

BƯỚC 3: Truy vết trong hệ thống
─────────────────────────────────────
• Verify watermark → Xác nhận: User A tải ngày 21/03/2026
• Verify fingerprint → Khớp: Document ID xyz, download ID 123
• Audit log → Chi tiết: IP, device, lúc 14:32

BƯỚC 4: Hành động pháp lý
─────────────────────────────────────
• Lock tài khoản User A
• Thu hồi tất cả links đã tạo
• Block tất cả devices của User A
• Gửi cảnh báo: Document này bị leak
• Thu thập bằng chứng (watermark + fingerprint + audit log)
• Báo cáo bảo mật

KẾT QUẢ: Có đủ bằng chứng để:
• Xác định CHÍNH XÁC người đã tải tài liệu
• Chứng minh thời gian, địa điểm (IP), thiết bị
• Có căn cứ pháp lý cho hành động kỷ luật/kiện tụng
```

---

## 4. Ma Trận So Sánh

| Vấn đề | Trước khi fix | Sau khi fix |
|---------|--------------|-------------|
| Upload .php web shell | ✅ Cho phép | ❌ Từ chối (chỉ .pdf/.doc) |
| File trên disk bị đọc | ✅ Plaintext | 🔐 AES-256-GCM encrypted |
| Tải 1000 docs/phút | ✅ Không chặn | ❌ Block 429 + Alert |
| Hacker đọc CONFIDENTIAL doc | ✅ Full access | ❌ DRM: watermark, no copy |
| Hacker xóa tài liệu CRITICAL | ✅ Không MFA | 🔐 MFA + Trust Score check |
| Hacker đánh cắp 1 file | ✅ Không phát hiện | 🪤 Honeytoken trigger |
| Không biết ai download gì | ✅ Không log | 📋 Audit log chi tiết |
| File quá lớn (DoS) | ✅ Không limit | ❌ Max 50MB |

---

## 5. Mô Hình Threat Model

```
                        INTERNET
                            │
                   ┌────────▼────────┐
                   │   FIREWALL / WAF │  Layer 0
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  Express Server │  Layer 1: Auth
                   │  (JWT + MFA)    │    - requireAuth
                   │                 │    - requireRole
                   └────────┬────────┘    - Trust Score
                            │
                   ┌────────▼────────┐
                   │ Multer Upload  │  Layer 2: Validation
                   │ (file filter)  │    - Extension check
                   │                │    - Size limit (50MB)
                   └────────┬────────┘    - Random filename
                            │
                   ┌────────▼────────┐
                   │  AES-256-GCM  │  Layer 3: Encryption
                   │  Encryption    │    - Master key
                   │                │    - Auth tag
                   └────────┬────────┘    - No plaintext
                            │
                   ┌────────▼────────┐
                   │  File on Disk  │  STORAGE
                   │  (.enc files)  │    - Encrypted only
                   └────────────────┘    - chmod 600
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        [Admin Panel]  [Manager]    [Staff]
              │             │             │
              │             │             │
        ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
        │   DRM     │ │   DRM     │ │   DRM     │
        │ Full      │ │ Partial   │ │ Limited   │
        │ Access    │ │ Access    │ │ Access    │
        └───────────┘ └───────────┘ └───────────┘

    THREAT DETECTION (Back to Admin):
    ┌─────────────────────────────────────────┐
    │ AuditLog → HONEYTOKEN_TRIGGERED        │
    │          → RATE_LIMIT_BLOCKED          │
    │          → MFA_VERIFY_FAILED × 3       │
    │          → DOCUMENT_DELETE_CRITICAL     │
    │                ↓                        │
    │         SECURITY TEAM ALERT             │
    │         Email + Webhook + SIEM          │
    └─────────────────────────────────────────┘
```

---

## 6. Testing Checklist

```bash
# 1. Test upload web shell
curl -X POST -F "file=@shell.php" http://localhost:5000/api/documents/upload
# Expected: 400 Bad Request - "Invalid file type"

# 2. Test upload encrypted file
curl -X POST -F "file=@secret.pdf" http://localhost:5000/api/documents/upload/encrypted
# Expected: 200 + { encrypted: true, algorithm: "AES-256-GCM" }

# 3. Test rate limit
for i in {1..15}; do
  curl http://localhost:5000/api/documents/:id/download
done
# Expected: 10 success, 11-15 = 429 + Retry-After header

# 4. Test DRM on CONFIDENTIAL doc
curl http://localhost:5000/api/documents/:confidentialId
# Expected: drm.watermark: true, download: false

# 5. Test honeytoken trigger
# Create honeytoken via admin panel
# Access honeytoken doc
# Expected: Email alert sent to all admins

# 6. Test MFA for sensitive action
curl -X POST http://localhost:5000/api/documents/sensitive-action/verify \
  -H "Content-Type: application/json" \
  -d '{"action": "DOCUMENT_DELETE_CRITICAL", "mfaCode": "123456"}'
# Expected: 401 if wrong code, 200 if correct
```
