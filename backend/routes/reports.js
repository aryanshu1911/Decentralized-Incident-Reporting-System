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
const auth = require('../middleware/auth');

// Multer setup: store temp files in 'uploads/' with 10MB limit
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, JPG, PNG files allowed'));
    }
    cb(null, true);
  },
});

// POST: submit a report
router.post('/', auth, upload.single('file'), async (req, res) => {
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
      userId: req.user.id,
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
    // Only return fields safe for public display, now including community validation and authenticity info
    const reports = await Report.find()
      .select('reportId category description locationText status imageCID createdAt upvotes disputes txHash blockchainHash')
      .sort({ createdAt: -1 });

    const processedReports = reports.map(r => {
      const imgCID = r.imageCID || "NO_IMAGE";
      const recalculatedHash = crypto
        .createHash('sha256')
        .update(r.reportId + r.description + r.locationText + r.category + imgCID)
        .digest('hex');

      return {
        ...r.toObject(),
        isTampered: r.blockchainHash && r.txHash && r.txHash !== 'Blockchain pending'
          ? recalculatedHash !== r.blockchainHash
          : false
      };
    });

    res.json(processedReports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
});

// GET: my reports
router.get('/my-reports', auth, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const processedReports = reports.map(r => {
      const imgCID = r.imageCID || "NO_IMAGE";
      const recalculatedHash = crypto
        .createHash('sha256')
        .update(r.reportId + r.description + r.locationText + r.category + imgCID)
        .digest('hex');

      return {
        ...r.toObject(),
        isTampered: r.blockchainHash && r.txHash && r.txHash !== 'Blockchain pending'
          ? recalculatedHash !== r.blockchainHash
          : false
      };
    });

    res.json(processedReports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching my reports' });
  }
});

// GET: all reports with full details (admin/internal use)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'investigator') {
      return res.status(403).json({ error: 'Not authorized as investigator' });
    }
    
    const User = require('../models/User');
    const investigator = await User.findById(req.user.id);
    let query = {};
    if (investigator && investigator.specializations && investigator.specializations.length > 0) {
      query.category = { $in: investigator.specializations };
    }

    const reports = await Report.find(query).sort({ createdAt: -1 });

    const processedReports = reports.map(r => {
      const imgCID = r.imageCID || "NO_IMAGE";
      const recalculatedHash = crypto
        .createHash('sha256')
        .update(r.reportId + r.description + r.locationText + r.category + imgCID)
        .digest('hex');

      const obj = r.toObject();
      if (obj.assignedInvestigator && obj.assignedInvestigator.toString() !== req.user.id) {
          delete obj.messages;
          obj.isLockedToOther = true;
      } else {
          obj.isLockedToOther = false;
      }

      return {
        ...obj,
        isTampered: r.blockchainHash && r.txHash && r.txHash !== 'Blockchain pending'
          ? recalculatedHash !== r.blockchainHash
          : false
      };
    });

    res.json(processedReports);
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

// POST: Upvote a report (Community Validation)
router.post('/:reportId/upvote', auth, async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    
    if (report.upvotedBy && report.upvotedBy.includes(req.user.id)) {
      return res.status(400).json({ error: 'Already upvoted' });
    }

    report.upvotes += 1;
    if (!report.upvotedBy) report.upvotedBy = [];
    report.upvotedBy.push(req.user.id);
    await report.save();

    res.json({ message: 'Upvote successful', upvotes: report.upvotes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating upvotes' });
  }
});

// POST: Dispute/Flag a report (Community Validation)
router.post('/:reportId/dispute', auth, async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    
    if (report.disputedBy && report.disputedBy.includes(req.user.id)) {
      return res.status(400).json({ error: 'Already disputed' });
    }

    report.disputes += 1;
    if (!report.disputedBy) report.disputedBy = [];
    report.disputedBy.push(req.user.id);
    await report.save();

    res.json({ message: 'Dispute registered', disputes: report.disputes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating disputes' });
  }
});

// PUT: update status via reportId (Admin Only)
router.put('/:reportId/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'investigator') {
      return res.status(403).json({ error: 'Not authorized as investigator' });
    }
    const { status } = req.body;

    // Validate status value (Title Case, consistent across app)
    const allowedStatuses = ['Pending Review', 'Need More Evidence', 'Under Investigation', 'Resolved', 'Rejected'];
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

// POST: Send a private message
router.post('/:reportId/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Message text is required' });

    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (req.user.role === 'user') {
        if (!report.userId || report.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to reply to this report' });
        }
    }

    if (req.user.role === 'investigator') {
        if (!report.assignedInvestigator) {
            report.assignedInvestigator = req.user.id;
        } else if (report.assignedInvestigator.toString() !== req.user.id) {
            return res.status(403).json({ error: 'This report is handled by another investigator' });
        }
    }

    const newMessage = {
        senderId: req.user.id,
        senderRole: req.user.role,
        text: text.trim(),
        createdAt: new Date()
    };

    if (!report.messages) report.messages = [];
    report.messages.push(newMessage);
    
    await report.save();

    res.status(201).json({ message: 'Message sent successfully', newMessage, assignedInvestigator: report.assignedInvestigator });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error sending message' });
  }
});

// GET: Fetch private messages for a report
router.get('/:reportId/messages', auth, async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (req.user.role === 'user') {
        if (!report.userId || report.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to view these messages' });
        }
    }
    if (req.user.role === 'investigator') {
        if (report.assignedInvestigator && report.assignedInvestigator.toString() !== req.user.id) {
            return res.status(403).json({ error: 'This report is handled by another investigator' });
        }
    }

    res.json({ messages: report.messages || [], assignedInvestigator: report.assignedInvestigator });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching messages' });
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