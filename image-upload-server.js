#!/usr/bin/env node

import express from 'express';
import multer from 'multer';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8081;

// Enable CORS for all routes
app.use(cors());

// Configure multer for file uploads
const upload = multer();

// Handle file uploads
app.post('/save-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filename = req.file.originalname || `image_${Date.now()}.jpg`;
    const filepath = path.join('/tmp/fal-images', filename);

    // Write file to filesystem
    await writeFile(filepath, req.file.buffer);

    console.log(`✅ Saved image: ${filepath}`);

    res.json({
      success: true,
      filename,
      path: filepath
    });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

// Handle direct binary uploads via PUT
app.put('/save-image/:filename', express.raw({ type: 'image/*', limit: '10mb' }), async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join('/tmp/fal-images', filename);

    // Write file to filesystem
    await writeFile(filepath, req.body);

    console.log(`✅ Saved image: ${filepath}`);

    res.json({
      success: true,
      filename,
      path: filepath
    });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Image upload server running on port ${port}`);
});