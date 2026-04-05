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
  status: { type: String, default: 'Pending Review' },
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  disputes: { type: Number, default: 0 },
  disputedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 },
  severity: { type: Number, default: 1 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedInvestigator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  messages: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderRole: { type: String, enum: ['user', 'investigator'] },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Enable geospatial queries
reportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', reportSchema);