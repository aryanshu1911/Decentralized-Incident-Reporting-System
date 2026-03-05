// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const Report = require('../models/report');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFileToPinata } = require('../utils/pinata');
const { storeHashOnChain, updateStatusOnChain, verifyHashOnChain } = require('../utils/blockchain');

// Multer setup: store temp files in 'uploads/' with 2MB limit
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, JPG, PNG files allowed'));
    }
    cb(null, true);
  },
});

// POST: submit a report
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { category, description, locationText, longitude, latitude } = req.body;
    const file = req.file;

    if (!description || !locationText || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let imageCID = "NO_IMAGE";

    // Upload file to Pinata if provided
    if (file) {
      const filePath = file.path;
      imageCID = await uploadFileToPinata(filePath, file.originalname);
      fs.unlinkSync(filePath); // Delete local temp file
    }

    // Auto-generate reportId (timestamp)
    const reportId = new Date().getTime().toString();

    // SHA-256 hash including reportId + description + locationText + category + imageCID
    const blockchainHash = crypto
      .createHash('sha256')
      .update(reportId + description + locationText + category + imageCID)
      .digest('hex');

    const reportData = {
      reportId,
      description,
      locationText,
      category,
      imageCID,
      blockchainHash,
      status: 'Pending',
    };

    // Include GeoJSON location only if valid coordinates are provided
    if (longitude && latitude) {
      reportData.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    const report = new Report(reportData);

    await report.save();

    // 🆕 Send hash to blockchain (after MongoDB save)
    // If this fails, the report is still in MongoDB — we just won't have txHash
    const txHash = await storeHashOnChain(reportId, blockchainHash);

    // Save txHash back to MongoDB (if blockchain succeeded)
    if (txHash) {
      report.txHash = txHash;
      await report.save();
    }

    // Return reportId + txHash to user
    res.status(201).json({
      message: 'Report submitted successfully!',
      reportId,
      txHash: txHash || 'Blockchain pending',
      status: report.status,
    });
  } catch (err) {
    console.error('Report submission error:', err.message || err);
    res.status(500).json({ error: err.stack || err.message || 'Server error during report submission' });
  }
});

// GET: all reports (public — returns summary-only fields for privacy)
router.get('/', async (req, res) => {
  try {
    // Only return fields safe for public display
    const reports = await Report.find()
      .select('reportId category description locationText status createdAt')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
});

// GET: all reports with full details (admin/internal use)
router.get('/all', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
});

// GET: top trending reports by location
router.get('/trending', async (req, res) => {
  try {
    const { lat, lng, radius = 10000, limit = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const maxDistance = parseFloat(radius);
    const resultLimit = parseInt(limit);

    const pipeline = [
      // Stage 1: Filter by radius from user's location (only documents with valid coordinates)
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: maxDistance,
          spherical: true,
          query: { "location.coordinates": { $exists: true } }
        }
      },
      // Stage 2: Calculate how many hours ago the report was created
      {
        $addFields: {
          hours_since_post: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              3600000 // milliseconds in one hour
            ]
          }
        }
      },
      // Stage 3: Linear recency boost — decays from 10 to 0 over ~10 days (240 hours)
      // Formula: recencyBoost = max(0, 10 - (hours_since_post / 24))
      {
        $addFields: {
          recencyBoost: {
            $max: [
              0,
              { $subtract: [10, { $divide: ["$hours_since_post", 24] }] }
            ]
          }
        }
      },
      // Stage 4: Compute final trending score
      // score = (2 × upvotes) + (1.5 × commentsCount) + (3 × severity) + recencyBoost
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: [2, { $ifNull: ["$upvotes", 0] }] },
              { $multiply: [1.5, { $ifNull: ["$commentsCount", 0] }] },
              { $multiply: [3, { $ifNull: ["$severity", 1] }] },
              "$recencyBoost"
            ]
          }
        }
      },
      // Stage 5 & 6: Sort by score descending and limit results
      { $sort: { score: -1 } },
      { $limit: resultLimit },
      // Stage 7: Project only public-safe summary fields
      {
        $project: {
          reportId: 1, category: 1, description: 1, locationText: 1,
          status: 1, createdAt: 1, score: 1, distance: 1,
          upvotes: 1, commentsCount: 1, severity: 1
        }
      }
    ];

    const trendingReports = await Report.aggregate(pipeline);
    res.json(trendingReports);
  } catch (err) {
    console.error('Trending fetch error:', err);
    res.status(500).json({ error: 'Server error fetching trending reports' });
  }
});

// GET: single report by ID
router.get('/:reportId', async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching report' });
  }
});

// GET: verify a specific report on the blockchain
router.get('/:reportId/verify', async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: 'Report not found in database' });

    if (!report.blockchainHash || !report.txHash || report.txHash === 'Blockchain pending') {
      return res.json({
        reportId: report.reportId,
        verified: false,
        reason: 'no_blockchain_data',
        message: 'Report is missing blockchain verification data.'
      });
    }

    // Recalculate hash from CURRENT database data
    // Important: Use locationText here, and handle NO_IMAGE correctly!
    const imgCID = report.imageCID || "NO_IMAGE";
    const recalculatedHash = crypto
      .createHash('sha256')
      .update(report.reportId + report.description + report.locationText + report.category + imgCID)
      .digest('hex');

    // Ping the blockchain smart contract with the RECALCULATED hash!
    const result = await verifyHashOnChain(report.reportId, recalculatedHash);

    const messages = {
      match: 'Cryptographic Hash mathematically verified on the Ethereum Blockchain ✅',
      not_on_chain: 'Report not found on the current blockchain node. The node may have been restarted.',
      hash_mismatch: 'Warning: Blockchain data does not match database record (Data may have been altered) ❌',
      error: 'Could not connect to blockchain for verification.',
    };

    res.json({
      reportId: report.reportId,
      verified: result.verified,
      reason: result.reason,
      blockchainHash: report.blockchainHash,
      recalculatedHash,
      message: messages[result.reason] || messages.error
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error verifying report' });
  }
});

// PUT: update status via reportId (Admin Only)
router.put('/:reportId/status', async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status value (Title Case, consistent across app)
    const allowedStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const report = await Report.findOneAndUpdate(
      { reportId: req.params.reportId },
      { status },
      { returnDocument: 'after' }
    );

    if (!report) return res.status(404).json({ error: 'Report not found' });

    // 🆕 Also update the status permanently on the Blockchain!
    // Since only Admin can do this on the contract, ensure the backend `.env` is the Admin wallet
    const chainSuccess = await updateStatusOnChain(req.params.reportId, status);

    res.json({
      message: 'Status updated',
      reportId: report.reportId,
      status: report.status,
      blockchainSynced: chainSuccess
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating status' });
  }
});

// DELETE: remove a report (for testing/cleanup)
router.delete('/:reportId', async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted', reportId: report.reportId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting report' });
  }
});

module.exports = router;