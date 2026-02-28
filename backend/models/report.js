const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  imageCID: { type: String, required: true },
  blockchainHash: { type: String },
  txHash: { type: String, default: null },     // blockchain transaction proof
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);