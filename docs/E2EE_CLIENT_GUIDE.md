# Hướng Dẫn Tích Hợp E2EE Phía Client (Frontend)

Hệ thống ZeroTrustModel E2EE yêu cầu phần lớn việc mã hóa và giải mã được thực hiện ở **Client-side** (trình duyệt hoặc app di động) thay vì trên Server. Lý do là Server không được phép giữ hay nhìn thấy Master Key hoặc Plaintext của tin nhắn.

Dưới đây là thiết kế luồng sử dụng `Web Crypto API` (có sẵn trên các trình duyệt hiện đại) cho Frontend.

## 1. Khởi tạo Thiết bị Mới (Sinh Cặp Khóa)

Khi người dùng đăng nhập thành công vào ứng dụng trên một trình duyệt mới, Client cần sinh ra một cặp khóa ECDH (Elliptic Curve Diffie-Hellman) tĩnh cho thiết bị đó.

```javascript
// client-crypto.js
async function generateDeviceKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256", // Phổ dụng và an toàn
    },
    true,
    ["deriveKey", "deriveBits"]
  );
  return keyPair;
}

// Chuyển Public Key thành dạng Base64 string để gửi lên Server
async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  const exportedAsBase64 = window.btoa(exportedAsString);
  return exportedAsBase64;
}
```

Sau khi có `exportedAsBase64` Public Key, client gửi API:
```http
POST /api/e2ee/device/register
Content-Type: application/json

{
    "deviceId": "uuid-cua-client-x",
    "deviceName": "Chrome on Windows",
    "publicKey": "<base64_public_key>"
}
```
**LƯU Ý:** `Private Key` phải được cất cẩn thận ở `IndexedDB` của trình duyệt, TUYỆT ĐỐI KHÔNG gửi lên server.

## 2. Gửi Tin Nhắn 1-1 (Direct Message)

Khi User A (người gửi) muốn nhắn tin cho User B (người nhận):

1. **Client A** gọi API `POST /api/e2ee/keys/users` với `userIds: [Id_User_A, Id_User_B]`.
2. Server trả về danh sách các `deviceId` và `publicKey` thuộc về A và B.
3. Client A bắt đầu mã hóa tin nhắn gốc riêng biệt cho TỪNG `deviceId` bằng cách dùng thuật toán ECDH tạo **Shared Secret** giữa Private Key của A và Public Key của thiết bị đích.
4. Client A dùng Shared Secret đó để tạo một AES-GCM key, rồi mã hóa nội dung tin nhắn.

```javascript
// 1. Chuyển đổi Base64 Public Key từ Server thành đối tượng CryptoKey
async function importPublicKey(base64Key) {
  const binaryDer = window.atob(base64Key);
  const binaryDerBuffer = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    binaryDerBuffer[i] = binaryDer.charCodeAt(i);
  }
  return window.crypto.subtle.importKey(
    "spki",
    binaryDerBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

// 2. Tạo Shared Secret AES Key từ Private Key của mình và Public Key của đích
async function deriveActiveAesKey(myPrivateKey, theirPublicKey) {
  return window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    myPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

// 3. Mã hóa tin nhắn
async function encryptMessage(aesKey, plaintext) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encodedText
  );

  return {
    ciphertext: window.btoa(String.fromCharCode.apply(null, new Uint8Array(ciphertextBuffer))),
    iv: window.btoa(String.fromCharCode.apply(null, iv))
  };
}
```

Kết quả truyền lên Socket/Server (`Message`):
```json
{
  "encryptedContent": [
    {
      "deviceId": "device_b_1",
      "ciphertext": "Abc123xyz...",
      "iv": "Xyz890...",
      "senderPublicKey": "<Key tạm thời hoặc key của A>"
    },
    {
      "deviceId": "device_a_2",
      "ciphertext": "Def456wxy...",
      "iv": "Lmn789...",
      "senderPublicKey": "<Key tạm thời hoặc key của A>"
    }
  ]
}
```

## 3. Khôi Phục Key bằng Mã PIN (Giải Pháp 2)

Quá trình "Recovery PIN" hoạt động như sau:
1. User nhập 1 mã PIN mạnh (VD: `123456`).
2. Client dùng `PBKDF2` băm mã PIN này với một Salt sinh ngẫu nhiên để tạo ra một **AES-GCM Key**.
3. Client lấy `Master Key` cục bộ, dùng AES-GCM Key trên mã hóa nó thành `encryptedMasterKey`.
4. Client gửi `encryptedMasterKey` và `masterKeySalt` (không gửi PIN) lên Server (`POST /api/e2ee/backup/setup`).

Đoạn mẫu tạo Khóa AES từ mã PIN:
```javascript
async function getDerivationKey(pin) {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
}

async function getAesKeyFromPin(pin, saltBuffer) {
  const cryptoKey = await getDerivationKey(pin);
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer, // Lấy randomValues hoặc từ Server trả về
      iterations: 100000,
      hash: "SHA-256"
    },
    cryptoKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
```

Khi đổi máy tính, Client gọi `GET /api/e2ee/backup/recover` để lấy `encryptedMasterKey` và `Salt`. Sau đó yêu cầu người dùng nhập PIN, lặp lại quá trình `getAesKeyFromPin`, dùng nó gọi hàm `crypto.subtle.decrypt` lên gói Master Key để giải cứu khoá!

## 4. Quét mã QR Sync (Giải Pháp 1)

Thiết bị hiện tại (A) và Thiết bị Mới (B) cần mở 1 kênh WebSocket truyền riêng (`/sync` namespace).
Hành trình E2EE Local P2P:
1. B khởi tạo ECDH Key Pair mới (`KeyB`). 
2. B sinh mã QR = chuỗi JSON gồm `{ "socketId": "xyz", "publicKey": "base64..." }`.
3. A quét mã QR bằng camera.
4. A lấy `publicKey` của B, dùng private key của A (hoặc key tạm thời) để `deriveKey` ra khóa AES chung.
5. A lấy toàn bộ dữ liệu (Storage, Master Key) mã hóa cục bộ bằng khóa chung, sau đó gửi qua kênh WebSocket tới `socketId` của B.
6. B nhận cục dữ liệu mã hóa, dùng private key của B để giải mã và áp các khóa vào IndexedDB. Xong!
