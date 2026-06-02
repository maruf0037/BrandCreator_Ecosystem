require('dotenv').config();
const { poolPromise, sql } = require('./config/db');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const imageUploadService = require('./services/imageUploadService');
const inventoryController = require('./controllers/inventoryController');

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PRODUCT IMAGE SYSTEM E2E VERIFICATION TEST');
  console.log('==================================================\n');

  try {
    const pool = await poolPromise;

    // 1. Verify static uploads folder creation
    console.log('1. Verifying uploads directory exists...');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('   -> Created uploads/ folder.');
    } else {
      console.log('   -> uploads/ folder already exists. Pass.');
    }

    // 2. Generate dummy image and test Unified Image Upload Service
    console.log('\n2. Testing Unified Image Upload Service (Local Storage Fallback verification)...');
    const dummyImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 16, g: 185, b: 129 } // Mint Emerald
      }
    })
      .png()
      .toBuffer();

    const mockFile = {
      buffer: dummyImageBuffer,
      mimetype: 'image/png',
      size: dummyImageBuffer.length
    };

    // Force Local Fallback by temporarily clearing Drive/Cloudinary env vars in execution context
    const origCloud = process.env.CLOUDINARY_CLOUD_NAME;
    const origDrive = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.GOOGLE_DRIVE_CLIENT_EMAIL;

    const uploadResult = await imageUploadService.uploadCompressedProductImage(mockFile, 'test_runner_fallback');
    
    // Restore env vars
    if (origCloud) process.env.CLOUDINARY_CLOUD_NAME = origCloud;
    if (origDrive) process.env.GOOGLE_DRIVE_CLIENT_EMAIL = origDrive;

    console.log('   -> Fallback active. Results received:');
    console.log(`      * Image URL: ${uploadResult.imageUrl}`);
    console.log(`      * Saved Local File: ${uploadResult.fileName}`);
    console.log(`      * Original Size: ${uploadResult.originalSize} bytes`);
    console.log(`      * Compressed WebP Size: ${uploadResult.compressedSize} bytes`);
    
    if (uploadResult.imageUrl.startsWith('/uploads') && uploadResult.isLocal) {
      console.log('   -> Pass: Successfully fell back to Local Storage WebP compress + save.');
    } else {
      throw new Error('Fallback failed to return local paths.');
    }

    // 3. Create a test product with multiple images
    console.log('\n3. Creating a test product with multiple images...');
    const testSku = 'TEST-CAROUSEL-' + Math.floor(Math.random() * 100000);
    const testProductName = 'E2E Carousel Test Dress';
    
    const mockImages = [
      { imageUrl: '/uploads/dummy1.webp', isPrimary: true, altText: 'Front View' },
      { imageUrl: '/uploads/dummy2.webp', isPrimary: false, altText: 'Back View' },
      { imageUrl: '/uploads/dummy3.webp', isPrimary: false, altText: 'Zoom View' }
    ];

    // Mock Express Request and Response to call inventoryController.createProduct
    let createdProduct = null;
    const mockReq = {
      body: {
        supplierUserId: 999,
        sku: testSku,
        productName: testProductName,
        basePrice: 1250.00,
        images: mockImages
      },
      user: { email: 'supplier@test.com', role: 'Supplier' }
    };

    const mockRes = {
      status: (code) => {
        return {
          json: (data) => {
            createdProduct = data.product || data;
          }
        };
      }
    };

    await inventoryController.createProduct(mockReq, mockRes);
    console.log(`   -> Product created! ID: ${createdProduct.ProductId || createdProduct.productId}`);

    // Verify DB records
    const dbImages = await pool.request()
      .input('productId', sql.Int, createdProduct.ProductId || createdProduct.productId)
      .query('SELECT * FROM dbo.ProductImages WHERE ProductId = @productId ORDER BY IsPrimary DESC, ImageId ASC');

    console.log(`   -> Database records in ProductImages table: ${dbImages.recordset.length} found.`);
    dbImages.recordset.forEach((img, idx) => {
      console.log(`      * Image #${idx + 1}: URL=${img.ImageUrl}, Primary=${img.IsPrimary}, AltText=${img.AltText}`);
    });

    if (dbImages.recordset.length === 3) {
      console.log('   -> Pass: Multiple images successfully recorded in SQL Server.');
    } else {
      throw new Error('Failed to insert multiple images.');
    }

    // 4. Test reordering and gallery update API (PUT /api/products/:productId/images)
    console.log('\n4. Testing gallery update API (PUT /api/products/:productId/images)...');
    const updatedImages = [
      { imageUrl: '/uploads/dummy2.webp', isPrimary: true, altText: 'Back View is now Front' }, // Swap order & make primary
      { imageUrl: '/uploads/dummy1.webp', isPrimary: false, altText: 'Old Front is now Back' }
      // image 3 deleted
    ];

    const mockPutReq = {
      params: { productId: createdProduct.ProductId || createdProduct.productId },
      body: { images: updatedImages },
      user: { email: 'supplier@test.com', role: 'Supplier' }
    };

    let putSuccess = false;
    const mockPutRes = {
      json: (data) => {
        putSuccess = data.success;
      },
      status: (code) => ({ json: (data) => { console.error('PUT Error:', data); } })
    };

    await inventoryController.updateProductImages(mockPutReq, mockPutRes);
    
    if (putSuccess) {
      console.log('   -> PUT request processed successfully.');
    } else {
      throw new Error('PUT API failed.');
    }

    // Verify DB update
    const dbImagesUpdated = await pool.request()
      .input('productId', sql.Int, createdProduct.ProductId || createdProduct.productId)
      .query('SELECT * FROM dbo.ProductImages WHERE ProductId = @productId ORDER BY IsPrimary DESC, ImageId ASC');

    console.log(`   -> Database records AFTER update: ${dbImagesUpdated.recordset.length} found.`);
    dbImagesUpdated.recordset.forEach((img, idx) => {
      console.log(`      * Image #${idx + 1}: URL=${img.ImageUrl}, Primary=${img.IsPrimary}, AltText=${img.AltText}`);
    });

    if (dbImagesUpdated.recordset.length === 2 && dbImagesUpdated.recordset[0].ImageUrl === '/uploads/dummy2.webp' && dbImagesUpdated.recordset[0].IsPrimary) {
      console.log('   -> Pass: Product images successfully reordered, primary updated, and 1 image deleted atomically.');
    } else {
      throw new Error('Atomic reorder/delete update failed in DB verification.');
    }

    // 5. Clean up test records
    console.log('\n5. Cleaning up test database records and files...');
    await pool.request()
      .input('productId', sql.Int, createdProduct.ProductId || createdProduct.productId)
      .query('DELETE FROM dbo.ProductImages WHERE ProductId = @productId');
    
    await pool.request()
      .input('productId', sql.Int, createdProduct.ProductId || createdProduct.productId)
      .query('DELETE FROM dbo.ProductOwnership WHERE ProductId = @productId');

    await pool.request()
      .input('productId', sql.Int, createdProduct.ProductId || createdProduct.productId)
      .query('DELETE FROM dbo.InventoryLedgers WHERE ProductId = @productId');

    await pool.request()
      .input('productId', sql.Int, createdProduct.ProductId || createdProduct.productId)
      .query('DELETE FROM dbo.Products WHERE ProductId = @productId');

    const localFilePath = path.join(uploadsDir, uploadResult.fileName);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    console.log('   -> Cleanup finished. Pass.\n');

    console.log('==================================================');
    console.log('*** ALL PRODUCT IMAGE SYSTEM E2E TESTS PASSED! ***');
    console.log('==================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n[ERROR] E2E Verification failed:');
    console.error(err);
    process.exit(1);
  }
}

runTests();
