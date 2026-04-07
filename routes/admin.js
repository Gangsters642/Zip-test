const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { isAuthenticated, adminLogin, adminLogout } = require('../middleware/auth');
const { readJSON, writeJSON } = require('../utils/jsonHelpers');
const { uploadAppPackage } = require('../middleware/upload');

// Auth routes (public)
router.post('/login', adminLogin);
router.post('/logout', adminLogout);

// All following routes require authentication
router.use(isAuthenticated);

// Dashboard stats
router.get('/api/stats', (req, res) => {
  const apps = readJSON('data/apps.json');
  const requests = readJSON('data/requests.json');
  res.json({
    totalApps: apps.length,
    approvedApps: apps.filter(a => a.status === 'approved').length,
    pendingApps: apps.filter(a => a.status === 'pending').length,
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'pending').length
  });
});

// Website settings
router.get('/api/settings', (req, res) => {
  res.json(readJSON('data/settings.json'));
});
router.post('/api/settings', (req, res) => {
  const { websiteActive, shutdownMessage, siteTitle } = req.body;
  const settings = readJSON('data/settings.json');
  if (typeof websiteActive === 'boolean') settings.websiteActive = websiteActive;
  if (shutdownMessage !== undefined) settings.shutdownMessage = shutdownMessage;
  if (siteTitle !== undefined) settings.siteTitle = siteTitle;
  if (writeJSON('data/settings.json', settings)) res.json({ success: true, settings });
  else res.status(500).json({ error: 'Failed to save settings' });
});

// Get all apps (including pending)
router.get('/api/apps', (req, res) => {
  res.json(readJSON('data/apps.json'));
});

// Upload new app
router.post('/api/upload', uploadAppPackage, (req, res) => {
  const { name, description, version, tags, price, isPaid } = req.body;
  if (!name || !description || !version) return res.status(400).json({ error: 'Name, description, version required' });
  if (!req.files || !req.files.apkFile) return res.status(400).json({ error: 'APK file required' });

  const apps = readJSON('data/apps.json');
  const newApp = {
    id: Date.now().toString(),
    name, description, version,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    image: req.files.iconImage ? `/uploads/images/${req.files.iconImage[0].filename}` : '',
    filePath: `/uploads/apks/${req.files.apkFile[0].filename}`,
    isPaid: isPaid === 'true' || isPaid === true,
    price: parseFloat(price) || 0,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  apps.push(newApp);
  if (writeJSON('data/apps.json', apps)) res.json({ success: true, app: newApp });
  else res.status(500).json({ error: 'Failed to save app' });
});

// Edit app
router.put('/api/app/:id', uploadAppPackage, (req, res) => {
  const appId = req.params.id;
  const apps = readJSON('data/apps.json');
  const index = apps.findIndex(a => a.id === appId);
  if (index === -1) return res.status(404).json({ error: 'App not found' });
  const app = apps[index];
  const { name, description, version, tags, price, isPaid } = req.body;
  if (name) app.name = name;
  if (description) app.description = description;
  if (version) app.version = version;
  if (tags) app.tags = tags.split(',').map(t => t.trim());
  if (price !== undefined) app.price = parseFloat(price);
  if (isPaid !== undefined) app.isPaid = isPaid === 'true' || isPaid === true;

  if (req.files) {
    if (req.files.apkFile) {
      const oldPath = path.join(__dirname, '..', app.filePath);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      app.filePath = `/uploads/apks/${req.files.apkFile[0].filename}`;
    }
    if (req.files.iconImage) {
      if (app.image && fs.existsSync(path.join(__dirname, '..', app.image))) fs.unlinkSync(path.join(__dirname, '..', app.image));
      app.image = `/uploads/images/${req.files.iconImage[0].filename}`;
    }
  }
  apps[index] = app;
  if (writeJSON('data/apps.json', apps)) res.json({ success: true, app });
  else res.status(500).json({ error: 'Update failed' });
});

// Delete app
router.delete('/api/app/:id', (req, res) => {
  const apps = readJSON('data/apps.json');
  const index = apps.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'App not found' });
  const app = apps[index];
  const apkPath = path.join(__dirname, '..', app.filePath);
  if (fs.existsSync(apkPath)) fs.unlinkSync(apkPath);
  if (app.image && fs.existsSync(path.join(__dirname, '..', app.image))) fs.unlinkSync(path.join(__dirname, '..', app.image));
  apps.splice(index, 1);
  if (writeJSON('data/apps.json', apps)) res.json({ success: true });
  else res.status(500).json({ error: 'Delete failed' });
});

// Approve app
router.post('/api/app/:id/approve', (req, res) => {
  const apps = readJSON('data/apps.json');
  const app = apps.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'App not found' });
  app.status = 'approved';
  if (writeJSON('data/apps.json', apps)) res.json({ success: true });
  else res.status(500).json({ error: 'Approval failed' });
});

// Reject app (delete)
router.post('/api/app/:id/reject', (req, res) => {
  const apps = readJSON('data/apps.json');
  const index = apps.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'App not found' });
  const app = apps[index];
  const apkPath = path.join(__dirname, '..', app.filePath);
  if (fs.existsSync(apkPath)) fs.unlinkSync(apkPath);
  if (app.image && fs.existsSync(path.join(__dirname, '..', app.image))) fs.unlinkSync(path.join(__dirname, '..', app.image));
  apps.splice(index, 1);
  if (writeJSON('data/apps.json', apps)) res.json({ success: true });
  else res.status(500).json({ error: 'Rejection failed' });
});

// Get all requests
router.get('/api/requests', (req, res) => {
  res.json(readJSON('data/requests.json'));
});

// Approve request
router.post('/api/request/:id/approve', (req, res) => {
  const requests = readJSON('data/requests.json');
  const reqIndex = requests.findIndex(r => r.id === req.params.id);
  if (reqIndex === -1) return res.status(404).json({ error: 'Request not found' });
  requests[reqIndex].status = 'approved';
  requests[reqIndex].approvedAt = new Date().toISOString();
  if (writeJSON('data/requests.json', requests)) res.json({ success: true });
  else res.status(500).json({ error: 'Approval failed' });
});

// Reject request
router.post('/api/request/:id/reject', (req, res) => {
  const requests = readJSON('data/requests.json');
  const reqIndex = requests.findIndex(r => r.id === req.params.id);
  if (reqIndex === -1) return res.status(404).json({ error: 'Request not found' });
  requests[reqIndex].status = 'rejected';
  if (writeJSON('data/requests.json', requests)) res.json({ success: true });
  else res.status(500).json({ error: 'Rejection failed' });
});

module.exports = router;