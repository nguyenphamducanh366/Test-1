const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
const qs = require('querystring'); 

app.use((req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => data += chunk);
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const saveTokens = (tokens) => {
  fs.writeFileSync('tokens.json', JSON.stringify(tokens));
};

const getTokens = () => {
  try {
    return JSON.parse(fs.readFileSync('tokens.json'));
  } catch (e) {
    return null;
  }
};

app.all('/install', (req, res) => {
  let code, domain, authId, authExpires, refreshId;

  domain = req.query.DOMAIN;

  if (req.rawBody) {
    const params = new URLSearchParams(req.rawBody);
    code = params.get('AUTH_ID');
    authId = params.get('AUTH_ID');
    authExpires = params.get('AUTH_EXPIRES');
    refreshId = params.get('REFRESH_ID');
    
    console.log('Parsed URLSearchParams:', Object.fromEntries(params));
  }

  if (!domain || !code) {
    console.error('Thiếu parameters');
    return res.status(400).json({ 
      error: 'Thiếu domain hoặc parameter',
      received: {
        query: req.query,
        rawBody: req.rawBody,
        parsedCode: code,
        parsedDomain: domain
      }
    });
  }

  console.log(`Using domain: ${domain}, code: ${code}`);

  axios.post(`https://${domain}/oauth/token`, {
    grant_type: 'authorization_code',
    client_id: process.env.BITRIX_CLIENT_ID,
    client_secret: process.env.BITRIX_CLIENT_SECRET,
    code: code,
    redirect_uri: `https://${req.headers.host}/install`
  })
  .then(response => {
    const tokenData = {
      ...response.data,
      domain: domain,
      auth_id: authId,
      auth_expires: authExpires,
      refresh_id: refreshId
    };
    
    saveTokens(tokenData);
    console.log('Tokens saved successfully:', tokenData);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .token-info { background: #f5f5f5; padding: 15px; border-radius: 5px; }
          .token-item { margin: 5px 0; }
          .label { font-weight: bold; }
        </style>
        <script>
          window.opener && window.opener.postMessage('authSuccess', '*');
          window.close();
        </script>
      </head>
      <body>
        <h1>Authentication Successful</h1>
        <p>You can close this window.</p>
        
        <div class="token-info">
          <h3>Authentication Details:</h3>
          <div class="token-item"><span class="label">AUTH_ID:</span> ${authId || 'N/A'}</div>
          <div class="token-item"><span class="label">AUTH_EXPIRES:</span> ${authExpires || 'N/A'}</div>
          <div class="token-item"><span class="label">REFRESH_ID:</span> ${refreshId || 'N/A'}</div>
          <div class="token-item"><span class="label">Access Token:</span> ${response.data.access_token}</div>
          <div class="token-item"><span class="label">Refresh Token:</span> ${response.data.refresh_token}</div>
          <div class="token-item"><span class="label">Expires In:</span> ${response.data.expires_in} seconds</div>
        </div>
      </body>
      </html>
    `);
  })
  .catch(error => {
    console.error('OAuth Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Lỗi xác thực',
      details: error.response?.data 
    });
  });
});

const callBitrixAPI = async (method, params = {}) => {
  const tokens = getTokens();
  if (!tokens) throw new Error('Chưa cài đặt ứng dụng');

  try {
    return await axios.get(`https://${tokens.domain}/rest/${method}`, {
      params: {
        ...params,
        auth: tokens.access_token
      }
    });
  } catch (error) {
    if (error.response?.data?.error === 'expired_token') {
      console.log('token đã hết hạn, chuẩn bị refresh');
      const newTokens = await axios.post(`https://${tokens.domain}/oauth/token/`, {
        grant_type: 'refresh_token',
        client_id: process.env.BITRIX_CLIENT_ID,
        client_secret: process.env.BITRIX_CLIENT_SECRET,
        refresh_token: tokens.refresh_token
      });
      
      const tokenData = {
        ...newTokens.data,
        domain: tokens.domain
      };
      saveTokens(tokenData);
      console.log('refresh Token thành công');
      return callBitrixAPI(method, params); 
    }
    console.error('Lỗi API:', error.response?.data || error.message);
    throw error;
  }
};


app.post('/call-api', async (req, res) => {
  try {
    const { method, params } = req.body;
    const response = await callBitrixAPI(method, params);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: ' Call API thất bại' });
  }
});
app.use(express.static('public'));

app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).send('Không tìm thấy trang');
});

app.listen(3000, () => {
  console.log('Server chạy tại http://localhost:3000');
  console.log('Dùng Ngrok: ngrok http 3000');
});