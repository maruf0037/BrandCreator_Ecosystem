require('dotenv').config();
const sharp = require('sharp');
const path = require('path');
const { google } = require('googleapis');
const imageService = require('./services/googleDriveImageService');

async function runTest() {
  console.log('==================================================');
  console.log('STARTING GOOGLE DRIVE CREDENTIALS LIVE VERIFICATION');
  console.log('==================================================\n');

  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_PRODUCT_IMAGE_FOLDER_ID;

  if (!clientEmail || !privateKey || !folderId) {
    console.warn('[WARNING] SETUP SKIPPED: Google Drive credentials are not fully configured in your .env file.');
    console.log('\nTo configure, please set the following variables in bc_engine/.env:');
    console.log('  GOOGLE_DRIVE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com');
    console.log('  GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour-key-content\\n-----END PRIVATE KEY-----\\n"');
    console.log('  GOOGLE_DRIVE_PRODUCT_IMAGE_FOLDER_ID=your-shared-folder-id\n');
    console.log('Ensure you share your Google Drive target folder with the service account email as an Editor.\n');
    process.exit(0);
  }

  console.log('Credentials found. Initiating live verification...');
  console.log(`- Service Account Email: ${clientEmail}`);
  console.log(`- Target Folder ID: ${folderId}\n`);

  try {
    // 1. Generate a tiny test image in-memory using sharp
    console.log('1. Generating tiny test PNG image in memory...');
    const dummyImageBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 0, g: 150, b: 255 } // Sleek BrandCreator Blue
      }
    })
      .png()
      .toBuffer();

    const mockFile = {
      buffer: dummyImageBuffer,
      mimetype: 'image/png',
      size: dummyImageBuffer.length
    };
    console.log(`   -> Generated image buffer of size: ${mockFile.size} bytes\n`);

    // 2. Upload using existing googleDriveImageService
    console.log('2. Uploading compressed WebP to Google Drive folder...');
    const result = await imageService.uploadCompressedProductImage(mockFile, 'pos_test_runner');
    
    console.log('   -> Upload Success! Results received:');
    console.log(`      * File ID: ${result.fileId}`);
    console.log(`      * File Name: ${result.fileName}`);
    console.log(`      * Direct View URL: ${result.imageUrl}`);
    console.log(`      * Original Size: ${result.originalSize} bytes`);
    console.log(`      * Compressed WebP Size: ${result.compressedSize} bytes`);
    console.log(`      * Compression Ratio: ${result.compressionRatio}\n`);

    // 3. Perform a safe cleanup deletion of the uploaded dummy file
    console.log('3. Cleaning up test file from Google Drive...');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });
    
    await drive.files.delete({ fileId: result.fileId });
    console.log('   -> Pass: Successfully deleted test file from Google Drive folder.\n');

    console.log('==================================================');
    console.log('*** GOOGLE DRIVE AUTH & UPLOAD VERIFICATION PASSED! ***');
    console.log('==================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n[ERROR] Google Drive live verification failed:');
    console.error(err);
    console.log('\nTroubleshooting Checklist:');
    console.log('1. Check if the service account has been added as an Editor to the folder.');
    console.log('2. Verify that GOOGLE_DRIVE_PRIVATE_KEY is correctly formatted with double quotes and newline characters (\\n).');
    console.log('3. Ensure the folder ID is correct and exists.');
    process.exit(1);
  }
}

runTest();
