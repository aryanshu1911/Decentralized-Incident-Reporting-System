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
    const { category, description, location } = req.body;
    const file = req.file;

    if (!description || !location || !category || !file) {
      return res.status(400).json({ message: 'Missing required fields or file' });
    }

    // Upload file to Pinata
    const filePath = file.path;
    const imageCID = await uploadFileToPinata(filePath, file.originalname);

    // Delete local temp file after upload
    fs.unlinkSync(filePath);

    // Auto-generate reportId (timestamp)
    const reportId = new Date().getTime().toString();

    // SHA-256 hash including reportId + description + location + category + imageCID
    const blockchainHash = crypto
      .createHash('sha256')
      .update(reportId + description + location + category + imageCID)
      .digest('hex');

    const report = new Report({
      reportId,
      description,
      location,
      category,
      imageCID,
      blockchainHash,
      status: 'Pending',
    });

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

// GET: all reports
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching reports' });
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
        message: 'Report is missing blockchain verification data.'
      });
    }

    // Ping the blockchain smart contract!
    const isVerified = await verifyHashOnChain(report.reportId, report.blockchainHash);

    res.json({
      reportId: report.reportId,
      verified: isVerified,
      blockchainHash: report.blockchainHash,
      message: isVerified
        ? 'Cryptographic Hash mathematically verified on the Ethereum Blockchain ✅'
        : 'Warning: Blockchain data does not match database record ❌'
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