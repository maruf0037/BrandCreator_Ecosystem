const multer = require('multer');
const imageService = require('../services/imageUploadService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.PRODUCT_IMAGE_MAX_UPLOAD_MB || 8) * 1024 * 1024
  }
});

// Support up to 10 images at once
exports.productImageMiddleware = upload.array('image', 10);

exports.uploadProductImage = async (req, res) => {
  try {
    const files = req.files || [];
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'IMAGE_REQUIRED', message: 'At least one image file is required.' });
    }

    // Process all images in parallel
    const results = await Promise.all(
      files.map(file => imageService.uploadCompressedProductImage(file, req.user?.email))
    );

    // If it's a single file, return the single result at the root (backwards-compatible) plus the array
    if (results.length === 1) {
      return res.status(201).json({
        success: true,
        message: 'Product image compressed and processed successfully.',
        ...results[0],
        images: results
      });
    }

    // For multiple files, return the array of results
    return res.status(201).json({
      success: true,
      message: `${results.length} product images compressed and processed successfully.`,
      images: results
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.code || 'UPLOAD_FAILED',
      message: err.message
    });
  }
};
