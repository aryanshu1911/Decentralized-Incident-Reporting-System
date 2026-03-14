const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const { syncReportsToBlockchain } = require('./utils/syncReports');

app.use(cors());
app.use(express.json());

const reportRoutes = require('./routes/reports');
app.use('/reports', reportRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected!');
    await syncReportsToBlockchain();
  })
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));