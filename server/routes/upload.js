const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const auth = require('../middleware/auth');

// Upload image
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    res.json({ 
      imageUrl: req.file.path,
      publicId: req.file.filename 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// Delete image
router.delete('/:publicId', auth, async (req, res) => {
  try {
    const { cloudinary } = require('../config/cloudinary');
    await cloudinary.uploader.destroy(req.params.publicId);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

module.exports = router;
