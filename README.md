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

### 3.2. Cấu hình bảo mật (QUAN TRỌNG ⚠️)

**Đọc kỹ file [SECURITY_SETUP.md](SECURITY_SETUP.md) trước khi tiếp tục!**

#### Setup Environment Variables & Secrets:

```bash
# 1. Set SECRET_KEY (dùng wrangler secret cho bảo mật)
wrangler secret put SECRET_KEY
# Nhập secret key của bạn (32+ ký tự ngẫu nhiên)

# 2. Set GITHUB_TOKEN
wrangler secret put GITHUB_TOKEN
# Paste GitHub Personal Access Token (từ bước 1.3)

# 3. (Optional) Set TURNSTILE_SECRET
wrangler secret put TURNSTILE_SECRET
# Paste Turnstile secret key từ bước 2
```

**Hoặc set qua Cloudflare Dashboard:**
1. Workers & Pages → Your Worker → Settings → Variables
2. Click "Add variable" cho mỗi biến
3. **Khuyến nghị**: Dùng "Encrypt" cho SECRET_KEY và GITHUB_TOKEN

### 3.3. Deploy code

1. Clone/download repo này về máy
2. Chỉnh sửa `wrangler.toml` nếu cần (worker name, KV namespace ID)
3. Deploy:
```bash
wrangler deploy
```

### 3.4. Thêm KV Namespace

1. Tạo KV namespace:
```bash
wrangler kv:namespace create "LICENSE_BINDINGS"
```
2. Copy ID và update vào `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "LICENSE_BINDINGS"
id = "your-kv-namespace-id"
```

### 3.5. Verify deployment

1. Test API endpoint: `https://your-worker.workers.dev/`
2. Kiểm tra logs: `wrangler tail`

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
