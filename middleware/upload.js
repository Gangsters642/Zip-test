const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
createDir('./uploads/apks');
createDir('./uploads/images');
createDir('./uploads/proofs');

const apkStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/apks'),
  filename: (req, file, cb) => cb(null, `apk-${Date.now()}-${Math.round(Math.random() * 1e9)}.apk`)
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.fieldname === 'proofImage' ? './uploads/proofs' : './uploads/images';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'proofImage' ? 'proof' : 'icon';
    cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const apkFilter = (req, file, cb) => {
  if (file.mimetype === 'application/vnd.android.package-archive' || path.extname(file.originalname).toLowerCase() === '.apk')
    cb(null, true);
  else cb(new Error('Only APK files are allowed'), false);
};

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (mime && ext) cb(null, true);
  else cb(new Error('Only images allowed'), false);
};

const uploadAppPackage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'apkFile') cb(null, './uploads/apks');
      else if (file.fieldname === 'iconImage') cb(null, './uploads/images');
      else cb(null, './uploads');
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      let prefix = file.fieldname === 'apkFile' ? 'apk' : 'icon';
      cb(null, `${prefix}-${unique}${ext}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'apkFile') apkFilter(req, file, cb);
    else if (file.fieldname === 'iconImage') imageFilter(req, file, cb);
    else cb(new Error('Invalid field'), false);
  }
}).fields([{ name: 'apkFile', maxCount: 1 }, { name: 'iconImage', maxCount: 1 }]);

const uploadProof = multer({ storage: imageStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('proofImage');

module.exports = { uploadAppPackage, uploadProof };