const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');

function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw Object.assign(
      new Error('Cloudinary upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'),
      { code: 'CLOUDINARY_CONFIG_MISSING', status: 503 }
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return cloudinary;
}

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

  const compressed = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: Number(process.env.PRODUCT_IMAGE_WEBP_QUALITY || 78) })
    .toBuffer();

  const client = getCloudinaryClient();
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'brandcreator/products';
  const safeSupplier = String(supplierEmail).replace(/[^a-z0-9._-]/gi, '_').slice(0, 60);
  const publicId = `${folder}/${safeSupplier}-${Date.now()}`;

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'image',
        format: 'webp',
        overwrite: true,
        access_mode: 'public'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(compressed);
  });

  return {
    fileId: uploadResult.public_id,
    fileName: uploadResult.original_filename || `${safeSupplier}-${Date.now()}`,
    imageUrl: uploadResult.secure_url,
    webViewLink: uploadResult.url,
    originalSize: file.size,
    compressedSize: compressed.length,
    compressionRatio: file.size ? Number((compressed.length / file.size).toFixed(3)) : null
  };
}

module.exports = { uploadCompressedProductImage };
