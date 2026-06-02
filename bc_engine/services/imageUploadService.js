const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Import existing services
const cloudinaryService = require('./cloudinaryImageService');
const googleDriveService = require('./googleDriveImageService');

/**
 * Checks if Cloudinary is fully configured in the environment.
 */
function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Checks if Google Drive is fully configured in the environment.
 */
function isGoogleDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL &&
    process.env.GOOGLE_DRIVE_PRIVATE_KEY
  );
}

/**
 * Compresses an image and writes it locally to the static uploads folder.
 */
async function uploadToLocalStorage(file, supplierEmail = 'supplier') {
  const safeSupplier = String(supplierEmail).replace(/[^a-z0-9._-]/gi, '_').slice(0, 60);
  const fileName = `brandcreator-product-${safeSupplier}-${Date.now()}.webp`;
  const uploadsDir = path.join(__dirname, '..', 'uploads');

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Compress to WebP using Sharp (matching other cloud uploaders)
  const compressed = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: Number(process.env.PRODUCT_IMAGE_WEBP_QUALITY || 78) })
    .toBuffer();

  const filePath = path.join(uploadsDir, fileName);
  await fs.promises.writeFile(filePath, compressed);

  const relativeUrl = `/uploads/${fileName}`;

  return {
    fileId: fileName,
    fileName: fileName,
    imageUrl: relativeUrl,
    webViewLink: relativeUrl,
    originalSize: file.size,
    compressedSize: compressed.length,
    compressionRatio: file.size ? Number((compressed.length / file.size).toFixed(3)) : null,
    isLocal: true
  };
}

/**
 * Unified image upload handler using a waterfall fallback strategy:
 * 1. Cloudinary (if configured)
 * 2. Google Drive (if configured)
 * 3. Local Storage fallback (default/failover)
 */
async function uploadCompressedProductImage(file, supplierEmail = 'supplier') {
  if (!file) {
    throw Object.assign(new Error('Image file is required.'), { code: 'IMAGE_REQUIRED', status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw Object.assign(
      new Error('Only JPG, PNG, or WEBP images are allowed.'),
      { code: 'INVALID_IMAGE_TYPE', status: 400 }
    );
  }

  // Waterfall 1: Try Cloudinary if configured
  if (isCloudinaryConfigured()) {
    try {
      console.log('UnifiedImageService: Attempting Cloudinary upload...');
      return await cloudinaryService.uploadCompressedProductImage(file, supplierEmail);
    } catch (err) {
      console.warn('UnifiedImageService: Cloudinary upload failed. Falling back...', err.message);
    }
  }

  // Waterfall 2: Try Google Drive if configured
  if (isGoogleDriveConfigured()) {
    try {
      console.log('UnifiedImageService: Attempting Google Drive upload...');
      return await googleDriveService.uploadCompressedProductImage(file, supplierEmail);
    } catch (err) {
      console.warn('UnifiedImageService: Google Drive upload failed. Falling back...', err.message);
    }
  }

  // Waterfall 3: Local Storage fallback
  console.log('UnifiedImageService: Falling back to local storage upload...');
  return await uploadToLocalStorage(file, supplierEmail);
}

module.exports = {
  uploadCompressedProductImage
};
