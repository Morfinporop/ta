const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/videos';
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = 'uploads/thumbnails';
    if (file.fieldname === 'avatar') dir = 'uploads/avatars';
    if (file.fieldname === 'banner') dir = 'uploads/avatars';
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'), false);
  }
};

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const maxVideoSize = parseInt(process.env.MAX_VIDEO_SIZE_MB || '10240') * 1024 * 1024;

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: maxVideoSize }
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = { uploadVideo, uploadImage };
