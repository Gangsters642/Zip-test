const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDir('./uploads/apks');
ensureDir('./uploads/images');
ensureDir('./uploads/proofs');

// Simple storage - no complex filters
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'apkFile') {
            cb(null, './uploads/apks');
        } else if (file.fieldname === 'iconImage') {
            cb(null, './uploads/images');
        } else {
            cb(null, './uploads');
        }
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + unique + ext);
    }
});

// Accept all files - let server handle validation
const uploadAppPackage = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
}).fields([
    { name: 'apkFile', maxCount: 1 },
    { name: 'iconImage', maxCount: 1 }
]);

module.exports = { uploadAppPackage };
