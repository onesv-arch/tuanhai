# Spotify Transfer Backend

Backend Node.js/Express cho ứng dụng Spotify Transfer Tool.

## Yêu cầu

- Node.js 18+
- npm hoặc yarn

## Cài đặt

1. **Clone và cài dependencies:**
```bash
cd backend
npm install
```

2. **Cấu hình environment:**
```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
PORT=3001
FRONTEND_URL=https://yourdomain.com
```

3. **Lấy Spotify credentials:**
   - Vào https://developer.spotify.com/dashboard
   - Tạo app mới hoặc dùng app hiện có
   - Copy Client ID và Client Secret
   - Thêm Redirect URI: `https://yourdomain.com/callback`

## Chạy server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Deploy trên VPS với aaPanel

### 1. Upload code
```bash
cd /www/wwwroot
git clone <repo-url>
cd <project>/backend
npm install
```

### 2. Tạo file .env
```bash
cp .env.example .env
nano .env
# Điền credentials
```

### 3. Chạy với PM2
```bash
npm install -g pm2
pm2 start server.js --name spotify-backend
pm2 save
pm2 startup
```

### 4. Cấu hình Nginx reverse proxy

Thêm vào config của site trong aaPanel:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## API Endpoints

### POST /api/spotify-auth
Xử lý OAuth flow với Spotify.

**Actions:**
- `get_auth_url`: Tạo URL đăng nhập Spotify
- `exchange_token`: Đổi code lấy access token
- `refresh_token`: Làm mới access token

### POST /api/spotify-data
Xử lý dữ liệu Spotify.

**Actions:**
- `get_user_data`: Lấy tất cả dữ liệu của user
- `transfer_data`: Chuyển dữ liệu giữa 2 tài khoản

### GET /health
Kiểm tra server status.

## Troubleshooting

### Lỗi CORS
- Kiểm tra `FRONTEND_URL` trong `.env`
- Đảm bảo domain frontend được phép

### Lỗi Spotify 403
- Thêm email tài khoản vào User Management trong Spotify Developer Dashboard
- Kiểm tra Redirect URI đã được thêm chưa

### PM2 không chạy
```bash
pm2 logs spotify-backend
pm2 restart spotify-backend
```
