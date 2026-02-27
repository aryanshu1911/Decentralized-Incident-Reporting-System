const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  imageCID: { type: String, required: true },
  blockchainHash: { type: String },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);