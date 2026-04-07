require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { checkSiteStatus, getSettings } = require('./middleware/siteStatus');
const { readJSON, writeJSON } = require('./utils/jsonHelpers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(checkSiteStatus);

// Create necessary directories
const dirs = [
  './uploads/apks',
  './uploads/images',
  './uploads/proofs',
  './public/css',
  './public/js',
  './public/assets'
];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== ROUTES ====================
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');
const recommendRoutes = require('./routes/recommend');

app.use('/api', apiRoutes);
app.use(process.env.ADMIN_SECRET_ROUTE, adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommend', recommendRoutes);

// ==================== WEBSITE SHUTDOWN HANDLER ====================
app.get('/', (req, res, next) => {
  if (req.siteDown) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Maintenance</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#111;color:#fff;}</style></head>
      <body>
        <h1>🔧 Website is temporarily offline</h1>
        <p>${req.shutdownMessage}</p>
        <small>Admin panel is still accessible at the secret route.</small>
      </body>
      </html>
    `);
  }
  next();
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔐 Admin panel: ${process.env.ADMIN_SECRET_ROUTE}`);
});