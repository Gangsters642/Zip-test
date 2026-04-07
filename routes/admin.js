const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON } = require('../utils/jsonHelpers');
const { uploadAppPackage } = require('../middleware/upload');

// Simple session store (in-memory)
const sessions = new Map();

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15);
}

// Login route
router.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        const sessionId = generateSessionId();
        sessions.set(sessionId, { loggedIn: true });
        res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) sessions.delete(sessionId);
    res.clearCookie('sessionId');
    res.json({ success: true });
});

// Authentication middleware
function isAuthenticated(req, res, next) {
    const sessionId = req.cookies?.sessionId;
    if (sessionId && sessions.has(sessionId)) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please login first.' });
    }
}

// ==================== PROTECTED ROUTES ====================

// Dashboard stats
router.get('/api/stats', isAuthenticated, (req, res) => {
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

// Get all apps
router.get('/api/apps', isAuthenticated, (req, res) => {
    res.json(readJSON('data/apps.json'));
});

// Upload app
router.post('/api/upload', isAuthenticated, uploadAppPackage, (req, res) => {
    const { name, description, version, tags, price, isPaid } = req.body;
    if (!name || !description || !version) {
        return res.status(400).json({ error: 'Name, description, version required' });
    }
    if (!req.files || !req.files.apkFile) {
        return res.status(400).json({ error: 'APK file required' });
    }
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
    if (writeJSON('data/apps.json', apps)) {
        res.json({ success: true, app: newApp });
    } else {
        res.status(500).json({ error: 'Failed to save app' });
    }
});

// Approve app
router.post('/api/app/:id/approve', isAuthenticated, (req, res) => {
    const apps = readJSON('data/apps.json');
    const app = apps.find(a => a.id === req.params.id);
    if (!app) return res.status(404).json({ error: 'App not found' });
    app.status = 'approved';
    if (writeJSON('data/apps.json', apps)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Approval failed' });
    }
});

// Delete app
router.delete('/api/app/:id', isAuthenticated, (req, res) => {
    const apps = readJSON('data/apps.json');
    const index = apps.findIndex(a => a.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'App not found' });
    const app = apps[index];
    const apkPath = path.join(__dirname, '..', app.filePath);
    if (fs.existsSync(apkPath)) fs.unlinkSync(apkPath);
    if (app.image && fs.existsSync(path.join(__dirname, '..', app.image))) {
        fs.unlinkSync(path.join(__dirname, '..', app.image));
    }
    apps.splice(index, 1);
    if (writeJSON('data/apps.json', apps)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Get all requests
router.get('/api/requests', isAuthenticated, (req, res) => {
    res.json(readJSON('data/requests.json'));
});

// Approve request
router.post('/api/request/:id/approve', isAuthenticated, (req, res) => {
    const requests = readJSON('data/requests.json');
    const reqIndex = requests.findIndex(r => r.id === req.params.id);
    if (reqIndex === -1) return res.status(404).json({ error: 'Request not found' });
    requests[reqIndex].status = 'approved';
    requests[reqIndex].approvedAt = new Date().toISOString();
    if (writeJSON('data/requests.json', requests)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Approval failed' });
    }
});

// Get settings
router.get('/api/settings', isAuthenticated, (req, res) => {
    res.json(readJSON('data/settings.json'));
});

// Update settings
router.post('/api/settings', isAuthenticated, (req, res) => {
    const { websiteActive, shutdownMessage, siteTitle } = req.body;
    const settings = readJSON('data/settings.json');
    if (typeof websiteActive === 'boolean') settings.websiteActive = websiteActive;
    if (shutdownMessage !== undefined) settings.shutdownMessage = shutdownMessage;
    if (siteTitle !== undefined) settings.siteTitle = siteTitle;
    if (writeJSON('data/settings.json', settings)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;
