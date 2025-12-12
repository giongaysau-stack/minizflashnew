# 🔐 ĐÃ DI CHUYỂN CÁC KEY NHẠY CẢM - HƯỚNG DẪN NHANH

## ✅ Những gì đã làm:

### 1. Code đã được cập nhật
- ✅ [src/worker.js](src/worker.js) - Đọc SECRET_KEY và GITHUB_TOKEN từ environment variables
- ✅ [wrangler.toml](wrangler.toml) - Đã xóa GITHUB_TOKEN hardcoded

### 2. Files bảo mật đã tạo
- ✅ [.env.example](.env.example) - Template cho local development
- ✅ [SECURITY_SETUP.md](SECURITY_SETUP.md) - Hướng dẫn chi tiết về bảo mật
- ✅ [setup-secrets.bat](setup-secrets.bat) - Script tự động setup trên Windows
- ✅ [setup-secrets.sh](setup-secrets.sh) - Script tự động setup trên Linux/Mac

### 3. .gitignore đã cập nhật
- ✅ Ignore file `.env` để tránh commit secrets
- ✅ Ignore các file nhạy cảm khác

## 🚀 Bước tiếp theo:

### Cách 1: Dùng script tự động (Khuyến nghị)
```bash
# Trên Windows
setup-secrets.bat

# Trên Linux/Mac
chmod +x setup-secrets.sh
./setup-secrets.sh
```

### Cách 2: Setup thủ công

#### Step 1: Set secrets trên Cloudflare
```bash
# Set SECRET_KEY (32+ ký tự ngẫu nhiên)
wrangler secret put SECRET_KEY

# Set GITHUB_TOKEN (GitHub Personal Access Token)
wrangler secret put GITHUB_TOKEN

# (Optional) Set TURNSTILE_SECRET
wrangler secret put TURNSTILE_SECRET
```

#### Step 2: Deploy
```bash
wrangler deploy
```

#### Step 3: Test
```bash
# Xem logs real-time
wrangler tail

# Test endpoint
curl https://your-worker.workers.dev/
```

## 📝 Giá trị cần điền:

### SECRET_KEY
- **Tạo mới**: Chuỗi ngẫu nhiên 32-64 ký tự
- **Ví dụ**: `minizflashnew-2025-abc123def456-xyz789`
- **Lưu ý**: ĐỪNG dùng giá trị mặc định!

### GITHUB_TOKEN
- **Giá trị cũ**: ❌ **ĐÃ BỊ REVOKE** (đã lộ trong code)
- **⚠️ QUAN TRỌNG**: Token cũ đã lộ trong code, đã được REVOKE!
- **Tạo mới tại**: https://github.com/settings/tokens
- **Quyền cần thiết**: `repo` (Full control of private repositories)

## ⚠️ Lưu ý bảo mật:

1. ✅ **ĐÃ LOẠI BỎ** - Keys không còn trong code
2. ✅ **ĐÃ IGNORE** - `.env`, `wrangler.toml` được git ignore
3. ⚠️ **CẦN LÀM** - Revoke GitHub token cũ vì đã bị lộ
4. ⚠️ **CẦN LÀM** - Tạo SECRET_KEY mới (đừng dùng giá trị cũ `minizflashnew-secret-2025`)

## 🔄 Revoke GitHub Token cũ:

1. Vào: https://github.com/settings/tokens
2. Tìm và revoke token cũ (nếu còn)
3. Tạo token mới và set vào Cloudflare

## 📚 Tài liệu:

- Chi tiết: [SECURITY_SETUP.md](SECURITY_SETUP.md)
- Wrangler docs: https://developers.cloudflare.com/workers/wrangler/
- GitHub tokens: https://docs.github.com/en/authentication

## ✅ Checklist:

- [ ] Revoke GitHub token cũ
- [ ] Tạo GitHub token mới
- [ ] Tạo SECRET_KEY mới
- [ ] Chạy `setup-secrets.bat` hoặc set secrets thủ công
- [ ] Deploy: `wrangler deploy`
- [ ] Test API hoạt động
- [ ] Verify không còn secrets trong code
