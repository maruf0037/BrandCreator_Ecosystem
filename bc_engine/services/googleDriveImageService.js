const { google } = require('googleapis');
const sharp = require('sharp');
const { Readable } = require('stream');

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw Object.assign(new Error('Google Drive upload is not configured. Set GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY.'), {
      code: 'DRIVE_CONFIG_MISSING',
      status: 503
    });
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  return google.drive({ version: 'v3', auth });
}

async function uploadCompressedProductImage(file, supplierEmail = 'supplier') {
  if (!file) {
    throw Object.assign(new Error('Image file is required.'), { code: 'IMAGE_REQUIRED', status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw Object.assign(new Error('Only JPG, PNG, or WEBP images are allowed.'), { code: 'INVALID_IMAGE_TYPE', status: 400 });
  }

  const compressed = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: Number(process.env.PRODUCT_IMAGE_WEBP_QUALITY || 78) })
    .toBuffer();

  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_PRODUCT_IMAGE_FOLDER_ID;
  const safeSupplier = String(supplierEmail).replace(/[^a-z0-9._-]/gi, '_').slice(0, 60);
  const fileName = `brandcreator-product-${safeSupplier}-${Date.now()}.webp`;

  const createRes = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'image/webp',
      ...(folderId ? { parents: [folderId] } : {})
    },
    media: {
      mimeType: 'image/webp',
      body: Readable.from(compressed)
    },
    fields: 'id,name,webViewLink,webContentLink',
    supportsAllDrives: true
  });

  const fileId = createRes.data.id;

  await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

  return {
    fileId,
    fileName,
    imageUrl: directUrl,
    webViewLink: createRes.data.webViewLink,
    originalSize: file.size,
    compressedSize: compressed.length,
    compressionRatio: file.size ? Number((compressed.length / file.size).toFixed(3)) : null
  };
}

module.exports = {
  uploadCompressedProductImage
};
