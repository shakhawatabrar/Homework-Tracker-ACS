import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = 3000;

const getRedirectUri = (req: express.Request) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}/auth/callback`;
};

app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set' });
  }
  
  const redirectUri = getRedirectUri(req);
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
    prompt: 'consent'
  });

  res.json({ url });
});

app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!code || typeof code !== 'string') {
    return res.status(400).send('No code provided');
  }

  try {
    const redirectUri = getRedirectUri(req);
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                token: '${tokens.access_token}' 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.post('/api/export-sheets', async (req, res) => {
  const { token, examTitle, examDate, passed, failed, absent, existingSpreadsheetId } = req.body;
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    let spreadsheetId = existingSpreadsheetId;

    if (!spreadsheetId) {
      // Create spreadsheet
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `পরীক্ষার ফলাফল - ${examTitle} (${examDate})`,
          },
          sheets: [
            { properties: { title: 'পাস করেছে' } },
            { properties: { title: 'ফেল করেছে' } },
            { properties: { title: 'অনুপস্থিত' } }
          ]
        }
      });
      spreadsheetId = spreadsheet.data.spreadsheetId;
    } else {
      // Clear existing data to avoid leftover rows
      await sheets.spreadsheets.values.batchClear({
        spreadsheetId,
        requestBody: {
          ranges: ["'পাস করেছে'!A:C", "'ফেল করেছে'!A:C", "'অনুপস্থিত'!A:C"]
        }
      });
    }

    // Prepare data for Passed
    const passedData = [
      ['রোল', 'নাম', 'প্রাপ্ত স্টার'],
      ...passed.map((s: any) => [s.roll, s.name, `${s.mark}★`])
    ];

    // Prepare data for Failed
    const failedData = [
      ['রোল', 'নাম', 'প্রাপ্ত স্টার'],
      ...failed.map((s: any) => [s.roll, s.name, '০★'])
    ];

    // Prepare data for Absent
    const absentData = [
      ['রোল', 'নাম'],
      ...absent.map((s: any) => [s.roll, s.name])
    ];

    // Update sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId!,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'পাস করেছে'!A1", values: passedData },
          { range: "'ফেল করেছে'!A1", values: failedData },
          { range: "'অনুপস্থিত'!A1", values: absentData }
        ]
      }
    });

    res.json({ 
      success: true, 
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` 
    });
  } catch (error: any) {
    console.error('Sheets API error:', error);
    res.status(500).json({ error: error.message || 'Failed to create/update spreadsheet' });
  }
});

app.post('/api/export-homework-sheets', async (req, res) => {
  const { token, date, submitted, notSubmitted, existingSpreadsheetId } = req.body;
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    let spreadsheetId = existingSpreadsheetId;

    if (!spreadsheetId) {
      // Create spreadsheet
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `হোমওয়ার্ক রিপোর্ট - ${date}`,
          },
          sheets: [
            { properties: { title: 'জমা দিয়েছে' } },
            { properties: { title: 'জমা দেয়নি' } }
          ]
        }
      });
      spreadsheetId = spreadsheet.data.spreadsheetId;
    } else {
      // Clear existing data
      await sheets.spreadsheets.values.batchClear({
        spreadsheetId,
        requestBody: {
          ranges: ["'জমা দিয়েছে'!A:B", "'জমা দেয়নি'!A:B"]
        }
      });
    }

    // Prepare data for Submitted
    const submittedData = [
      ['রোল', 'নাম'],
      ...submitted.map((s: any) => [s.roll, s.name])
    ];

    // Prepare data for Not Submitted
    const notSubmittedData = [
      ['রোল', 'নাম'],
      ...notSubmitted.map((s: any) => [s.roll, s.name])
    ];

    // Update sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId!,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'জমা দিয়েছে'!A1", values: submittedData },
          { range: "'জমা দেয়নি'!A1", values: notSubmittedData }
        ]
      }
    });

    res.json({ 
      success: true, 
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` 
    });
  } catch (error: any) {
    console.error('Sheets API error:', error);
    res.status(500).json({ error: error.message || 'Failed to create/update spreadsheet' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
