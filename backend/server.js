const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config();
const { syncReportsToBlockchain } = require('./utils/syncReports');

app.use(cors());
app.use(express.json());

const reportRoutes = require('./routes/reports');
const authRoutes = require('./routes/auth');
app.use('/reports', reportRoutes);
app.use('/auth', authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected!');
    await syncReportsToBlockchain();
  })
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));