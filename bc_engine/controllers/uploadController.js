const multer = require('multer');
const imageService = require('../services/googleDriveImageService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.PRODUCT_IMAGE_MAX_UPLOAD_MB || 8) * 1024 * 1024
  }
});

exports.productImageMiddleware = upload.single('image');

exports.uploadProductImage = async (req, res) => {
  try {
    const result = await imageService.uploadCompressedProductImage(req.file, req.user?.email);
    return res.status(201).json({
      success: true,
      message: 'Product image compressed and uploaded to Google Drive.',
      ...result
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.code || 'UPLOAD_FAILED',
      message: err.message
    });
  }
};
