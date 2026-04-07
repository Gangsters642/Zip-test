const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON } = require('../utils/jsonHelpers');
const { uploadProof } = require('../middleware/upload');

// Get all approved apps
router.get('/apps', (req, res) => {
  const apps = readJSON('data/apps.json');
  const approved = apps.filter(a => a.status === 'approved');
  res.json(approved);
});

// Get single app
router.get('/app/:id', (req, res) => {
  const apps = readJSON('data/apps.json');
  const app = apps.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'App not found' });
  res.json(app);
});

// Submit download request
router.post('/request-download', uploadProof, (req, res) => {
  const { name, email, appId, isPaid } = req.body;
  if (!name || !email || !appId) return res.status(400).json({ error: 'Name, email, and app ID required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

  const apps = readJSON('data/apps.json');
  const app = apps.find(a => a.id === appId);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const isPaidBool = isPaid === 'true' || isPaid === true;
  let proofPath = '';
  if (isPaidBool) {
    if (!req.file) return res.status(400).json({ error: 'Payment proof required' });
    proofPath = `/uploads/proofs/${req.file.filename}`;
  }

  const requests = readJSON('data/requests.json');
  const newRequest = {
    id: Date.now().toString(),
    appId, appName: app.name, userName: name, userEmail: email,
    isPaid: isPaidBool, price: isPaidBool ? app.price : 0,
    proofImage: proofPath, status: 'pending', createdAt: new Date().toISOString(), approvedAt: null
  };
  requests.push(newRequest);
  if (writeJSON('data/requests.json', requests)) res.json({ success: true, message: 'Request submitted', requestId: newRequest.id });
  else res.status(500).json({ error: 'Failed to save request' });
});

// Get user requests by email
router.get('/my-requests', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const requests = readJSON('data/requests.json');
  const userRequests = requests.filter(r => r.userEmail.toLowerCase() === email.toLowerCase());
  res.json(userRequests);
});

// Download APK (only if approved)
router.get('/download/:requestId', (req, res) => {
  const requests = readJSON('data/requests.json');
  const request = requests.find(r => r.id === req.params.requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'approved') return res.status(403).json({ error: 'Request not approved yet' });

  const apps = readJSON('data/apps.json');
  const app = apps.find(a => a.id === request.appId);
  if (!app) return res.status(404).json({ error: 'App not found' });
  const filePath = path.join(__dirname, '..', app.filePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'APK file missing' });
  res.download(filePath, `${app.name.replace(/[^a-z0-9]/gi, '_')}.apk`);
});

module.exports = router;