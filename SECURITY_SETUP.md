# 🔐 Hướng dẫn cấu hình bảo mật

## 📋 Tổng quan
Dự án này sử dụng environment variables để bảo vệ các key nhạy cảm. **KHÔNG BAO GIỜ** commit các key thật vào Git!

## 🔑 Các Key cần cấu hình

### 1. SECRET_KEY
**Mô tả**: Key bí mật để mã hóa token xác thực  
**Vị trí**: Cloudflare Worker Environment Variables  
**Cách tạo**: Chuỗi ngẫu nhiên, dài ít nhất 32 ký tự

**Cách set trên Cloudflare:**
```bash
# Option 1: Qua Cloudflare Dashboard
1. Vào Workers & Pages → Your Worker → Settings → Variables
2. Add variable: SECRET_KEY = your-secret-key-here

# Option 2: Qua CLI
wrangler secret put SECRET_KEY
# Nhập giá trị khi được hỏi
```

### 2. GITHUB_TOKEN
**Mô tả**: GitHub Personal Access Token để truy cập private repository  
**Vị trí**: Cloudflare Worker Secrets  
**Quyền cần thiết**: `repo` (Full control of private repositories)

**Cách tạo GitHub Token:**
1. Vào https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Chọn scope: `repo` 
4. Copy token (chỉ hiển thị 1 lần!)

**Cách set trên Cloudflare:**
```bash
wrangler secret put GITHUB_TOKEN
# Paste token khi được hỏi
```

### 3. TURNSTILE_SECRET (Optional)
**Mô tả**: Cloudflare Turnstile secret key  
**Vị trí**: Cloudflare Worker Environment Variables  
**Lấy từ**: Cloudflare Dashboard → Turnstile

**Cách set:**
```bash
wrangler secret put TURNSTILE_SECRET
```

## 📁 File được bảo vệ trong .gitignore

```
wrangler.toml          # Chứa cấu hình local
src/worker.js          # Code có thể chứa keys khi test
.env                   # Environment variables local
LICENSE_KEYS_PRIVATE.txt
```

## ✅ Checklist triển khai

- [ ] Tạo SECRET_KEY ngẫu nhiên (32+ ký tự)
- [ ] Tạo GitHub Personal Access Token
- [ ] Set SECRET_KEY trên Cloudflare
- [ ] Set GITHUB_TOKEN trên Cloudflare (dùng secret, không dùng variable)
- [ ] Verify không có key nào trong code được commit
- [ ] Test worker hoạt động với env variables

## 🧪 Test local

```bash
# 1. Copy template
cp .env.example .env

# 2. Điền thông tin vào .env
# Edit file .env với các giá trị thật

# 3. Test với wrangler
wrangler dev

# 4. Deploy
wrangler deploy
```

## ⚠️ Lưu ý bảo mật

1. **KHÔNG** commit file `.env` hoặc `wrangler.toml` với giá trị thật
2. **KHÔNG** share keys qua email/chat không mã hóa
3. **Rotate keys** định kỳ (3-6 tháng)
4. **Thu hồi token** ngay khi nghi ngờ bị lộ
5. **Dùng Secrets** cho sensitive data trên Cloudflare (không dùng Variables)

## 🔄 Rotate Keys

Khi cần thay đổi key:

```bash
# 1. Tạo key mới
# 2. Update trên Cloudflare
wrangler secret put SECRET_KEY
# 3. Deploy lại
wrangler deploy
# 4. Thu hồi key cũ (nếu là GitHub token)
```

## 📚 Tài liệu tham khảo

- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
