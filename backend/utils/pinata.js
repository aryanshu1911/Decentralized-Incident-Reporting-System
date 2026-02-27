// backend/utils/pinata.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

// Upload file to Pinata
const uploadFileToPinata = async (filePath, fileName) => {
  try {
    const data = new FormData();
    data.append('file', fs.createReadStream(filePath));

    const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
      maxBodyLength: 'Infinity',
      headers: {
        ...data.getHeaders(),
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
    });

    console.log('Pinata CID:', res.data.IpfsHash);
    return res.data.IpfsHash; // This is the CID
  } catch (err) {
    console.error('Pinata upload error:', err.response?.data || err.message);
    throw err;
  }
};

module.exports = { uploadFileToPinata };