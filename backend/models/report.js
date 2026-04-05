const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  locationText: { type: String, required: true }, // renamed from 'location'
  location: {                                     // GeoJSON point
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }               // [longitude, latitude]
  },
  imageCID: { type: String },                     // Now optional
  blockchainHash: { type: String },
  txHash: { type: String, default: null },
  status: { type: String, default: 'Pending' },
  upvotes: { type: Number, default: 0 },
  disputes: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  severity: { type: Number, default: 1 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Enable geospatial queries
reportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', reportSchema);