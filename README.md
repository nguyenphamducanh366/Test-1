# Triển Khai Cơ Chế OAuth của Bitrix24

Hướng dẫn này sẽ hướng dẫn bạn quy trình thiết lập một ứng dụng cục bộ cho Bitrix24 bằng cách sử dụng Ngrok, tích hợp OAuth và triển khai các chức năng API cần thiết.

## Mục Lục

1. [Yêu Cầu](#yêu-cầu)
2. [Cài Đặt Ngrok](#cài-đặt-ngrok)
3. [Thiết Lập Máy Chủ Cục Bộ](#thiết-lập-máy-chủ-cục-bộ)
4. [Cấu Hình Bitrix24](#cấu-hình-bitrix24)
5. [Triển Khai Cơ Chế OAuth](#triển-khai-cơ-chế-oauth)
6. [Kết Luận](#kết-luận)

## Yêu Cầu

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt những thứ sau trên máy tính của mình:

- Node.js (v12 trở lên)
- npm (Trình quản lý gói Node)
- Ngrok

## Cài Đặt Ngrok

1. **Tải Ngrok**:
   - Truy cập trang web [Ngrok](https://ngrok.com/download) và tải phiên bản phù hợp với hệ điều hành của bạn.

2. **Cài Đặt Ngrok**:
   - Giải nén tệp đã tải về và đặt tệp thực thi `ngrok` vào thư mục có trong PATH của hệ thống bạn.

3. **Xác Thực Ngrok** (tùy chọn):
   - Đăng ký tài khoản miễn phí trên Ngrok và lấy mã xác thực từ bảng điều khiển.
   - Chạy lệnh sau để xác thực:
     ```bash
     ngrok authtoken YourAuthToken
     ```

## Thiết Lập Máy Chủ Cục Bộ

1. **Clone Kho Lưu Trữ**:
   ```bash
   git clone https://github.com/nguyenphamducanh366/Test-1.git
   cd backend
   ```

2. **Cài Đặt Các Gói Phụ Thuộc**:
   ```bash
   npm install
   ```

3. **Khởi Động Máy Chủ Cục Bộ**:
   ```bash
   node server.js
   ```

4. **Khởi Động Ngrok Tunnel**:
   - Trong một cửa sổ terminal mới, chạy:
     ```bash
     ngrok http 3000
     ```
   - Lưu lại URL HTTPS được cung cấp bởi Ngrok (ví dụ: `https://6fd4-116-96-46-81.ngrok-free.app`).

## Cấu Hình Bitrix24

1. **Truy Cập Tài Nguyên Lập Trình Bitrix24**:
   - Vào tài khoản Bitrix24 của bạn, điều hướng đến **Tài nguyên cho nhà phát triển** > **Khác** > **Ứng Dụng Cục Bộ**.

2. **Tạo Ứng Dụng Cục Bộ Mới**:
   - Nhấn vào **Ứng Dụng Cục Bộ**.
   - Trong **Đường dẫn xử lý của bạn*** và **Đường dẫn cài đặt ban đầu**, nhập URL Ngrok kèm theo các đường dẫn thích hợp:
     - Ví dụ: Đường dẫn xử lý của bạn*: `https://6fd4-116-96-46-81.ngrok-free.app/call-api`.
     - Ví dụ: Đường dẫn cài đặt ban đầu: `https://6fd4-116-96-46-81.ngrok-free.app/install`.

3. **Đặt Văn Bản Menu**:
   - Trong trường **Văn bản mục menu Tiếng Việt (vn)**, nhập văn bản tiếng Việt cho ứng dụng của bạn (ví dụ: "Cơ Chế OAuth Bitrix24").

4. **Nhấn Lưu** để lưu các cài đặt của bạn.

5. **Nhập client_id và client_secret**:
   - Mở tệp **.env** tại `Test1/backend/.env`.
   - Trong **BITRIX_CLIENT_ID** và **BITRIX_CLIENT_SECRET**, nhập ID Ứng dụng (client_id) và Khóa ứng dụng (client_secret):
     - Ví dụ: `BITRIX_CLIENT_ID=local.68491b07ec2365.58539131`
     - Ví dụ: `BITRIX_CLIENT_SECRET=P6Vlzv2wfwGiU2gBxgs4qUEDRpNmJJKMlipeK7qssAURh9QgdQ`.

6. **Nhấn Mở Ứng Dụng** để triển khai cơ chế OAuth.
   
## Triển Khai Cơ Chế OAuth

1. **Nhận Sự Kiện Cài Đặt**:
   - Tạo một route trong `server.js` để xử lý sự kiện cài đặt:
     ```javascript
     app.all('/install', (req, res) => {
      // Xử lý logic cài đặt
      // Lấy domain và code từ request
      // Gọi API để lấy token
      });
     ```

2. **Lưu Access Token và Refresh Token**:
   
     ```javascript
     const saveTokens = (tokens) => {
        fs.writeFileSync('tokens.json', JSON.stringify(tokens));
      };
      
      const getTokens = () => {
        return JSON.parse(fs.readFileSync('tokens.json'));
      };
     ```

3. **Gia Hạn Token Khi Hết Hạn**:
     ```javascript
     async function callBitrixAPI(method, params = {}) {
        try {
          // Gọi API
        } catch (error) {
          if (error.response?.data?.error === 'expired_token') {
            // Refresh token
            const newTokens = await axios.post(`https://${tokens.domain}/oauth/token/`, {
              grant_type: 'refresh_token',
              // ... thông tin client
            });
            saveTokens(newTokens.data);
            return callBitrixAPI(method, params); // Gọi lại API
          }
        }
      }
     ```
     4. **Gọi API bất kỳ với token**:
     ```javascript
     app.post('/call-api', async (req, res) => {
        const { method, params } = req.body;
        const response = await callBitrixAPI(method, params);
        res.json(response.data);
      });
     ```

## Kết Luận

Bằng cách làm theo hướng dẫn này, bạn đã thiết lập một ứng dụng cục bộ cho Bitrix24 sử dụng Ngrok, triển khai cơ chế OAuth và tạo ra các chức năng API cần thiết.
