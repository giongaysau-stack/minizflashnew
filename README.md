# 🔒 MiniZ Flash Pro - Hướng dẫn cài đặt bảo mật

## 📊 Kiến trúc hệ thống

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User nhập     │────▶│  Cloudflare      │────▶│  Private Repo   │
│   License Key   │     │  Worker API      │     │  (Firmware)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  KV Storage      │
                        │  (License Bind)  │
                        └──────────────────┘
```

## 🚀 Bước 1: Tạo Private Repository cho Firmware

1. **Tạo repo mới trên GitHub**: `minizflashnew-private` (chọn **PRIVATE**)
2. **Upload các file firmware** vào folder `firmware/`
3. **Tạo Personal Access Token**:
   - Vào GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token với quyền `repo`
   - **Lưu token này** (chỉ hiển thị 1 lần)

## 🔧 Bước 2: Cấu hình Cloudflare Turnstile

1. Vào [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Chọn **Turnstile** từ menu bên trái
3. Click **Add site**
4. Điền thông tin:
   - **Site name**: MiniZ Flash Pro
   - **Domain**: `giongaysau-stack.github.io`
   - **Widget mode**: Managed
5. Click **Create**
6. **Copy Site Key** và **Secret Key**

## 🔧 Bước 3: Deploy Cloudflare Worker

### 3.1. Tạo Worker

1. Vào [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Chọn **Workers & Pages**
3. Click **Create Application** → **Create Worker**
4. Đặt tên: `minizflashnew-api`
5. Click **Deploy**

### 3.2. Thêm code

1. Click **Edit code**
2. Copy toàn bộ nội dung file `cloudflare-worker.js`
3. Paste vào editor
4. **QUAN TRỌNG**: Thay đổi các giá trị trong CONFIG:
   - `SECRET_KEY`: Đổi thành key bí mật của bạn
   - `TURNSTILE_SECRET`: Secret Key từ bước 2

### 3.3. Thêm KV Namespace

1. Trong Worker, vào **Settings** → **Variables**
2. **KV Namespace Bindings** → Add binding
3. Tạo mới KV namespace
4. Variable name: `LICENSE_BINDINGS`

### 3.4. Thêm Environment Variable

1. Trong **Settings** → **Variables** → **Environment Variables**
2. Add variable:
   - Variable name: `GITHUB_TOKEN`
   - Value: Token từ bước 1.3

### 3.5. Deploy

1. Click **Save and Deploy**
2. Note lại URL: `https://minizflashnew-api.YOUR_SUBDOMAIN.workers.dev`

## 🌐 Bước 4: Cấu hình Frontend

### 4.1. Cập nhật `index.html`

Thay `YOUR_TURNSTILE_SITE_KEY` bằng Site Key từ bước 2:

```html
<div id="cf-turnstile" 
     class="cf-turnstile" 
     data-sitekey="YOUR_ACTUAL_SITE_KEY_HERE"
     ...>
</div>
```

### 4.2. Cập nhật `app.js`

Thay đổi Worker URL:

```javascript
this.workerApiUrl = 'https://minizflashnew-api.YOUR_SUBDOMAIN.workers.dev';
```

## 📤 Bước 5: Deploy lên GitHub Pages

1. Push code lên repo `minizflashnew`
2. Vào repo → Settings → Pages
3. Source: Deploy from a branch
4. Branch: main / (root)
5. Save

Website sẽ có địa chỉ: `https://giongaysau-stack.github.io/minizflashnew`

## 📊 Luồng hoạt động chi tiết

```
1. User truy cập website
        ↓
2. Cloudflare Turnstile xác thực (chống bot)
        ↓
3. User kết nối thiết bị ESP
        ↓
4. User chọn firmware + nhập License Key
        ↓
5. Frontend gửi đến Worker API
        ↓
6. Worker xác thực key + kiểm tra MAC binding
        ↓
7. Nếu hợp lệ → Trả về Access Token (5 phút)
        ↓
8. Frontend dùng token để request firmware
        ↓
9. Worker fetch firmware từ private repo
        ↓
10. Trả firmware về cho user → Flash vào ESP
```

## ⚠️ Lưu ý bảo mật

- **KHÔNG** commit `SECRET_KEY` và `GITHUB_TOKEN` lên GitHub public
- **KHÔNG** để firmware trong repo public
- Dùng **Environment Variables** trong Worker cho secrets
- Set **Rate Limiting** để chống brute force

## 🔑 Quản lý License Keys

### Thêm key mới
Thêm vào Set `VALID_KEYS` trong Worker code

### Xóa/vô hiệu hóa key
Xóa khỏi Set `VALID_KEYS`

### Reset binding
Vào Cloudflare Dashboard → KV → Xóa entry

## 💰 Chi phí

Cloudflare Workers Free Plan:
- 100,000 requests/ngày
- 10ms CPU time/request
- KV: 100,000 reads/ngày, 1,000 writes/ngày

**Đủ cho hầu hết use cases!**

## 🆘 Troubleshooting

### "Invalid access token"
- Token hết hạn (5 phút)
- MAC address không khớp

### "License bound to another device"
- Key đã được dùng trên thiết bị khác
- Cần reset trong KV

### CORS errors
- Kiểm tra ALLOWED_ORIGINS trong Worker
- Thêm domain vào danh sách

### Turnstile không load
- Kiểm tra Site Key
- Kiểm tra domain đã đăng ký
