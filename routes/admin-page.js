const express = require('express');
const path = require('path');
const router = express.Router();

// Serve admin HTML page (no authentication required for the page itself)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

module.exports = router;
