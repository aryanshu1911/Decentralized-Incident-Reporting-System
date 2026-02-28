// backend/utils/blockchain.js
//
// 📖 WHAT THIS FILE DOES:
// This is the "bridge" between your Express backend and the smart contract.
// It uses ethers.js to:
//   1. Connect to the blockchain network (local Hardhat node for now)
//   2. Create a "wallet" from the private key in .env (this signs transactions)
//   3. Load the contract using the ABI + deployed address
//   4. Call storeHash() on the contract
//
// 📖 WHY "0x" + hash?
// Your backend generates a hex string like "a1b2c3...". But the smart contract
// expects a bytes32 type. So we add "0x" prefix to tell ethers.js it's a hex value.
//

const { ethers } = require('ethers');
const contractABI = require('./contractABI.json');
require('dotenv').config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Connect to blockchain
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

/**
 * Store a complaint hash on the blockchain
 * @param {string} reportId   - Unique report ID (e.g. "1709123456789")
 * @param {string} hexHash    - SHA-256 hash as hex string (without 0x prefix)
 * @returns {string|null}     - Transaction hash on success, null on failure
 */
const storeHashOnChain = async (reportId, hexHash) => {
    try {
        // Convert hex string → bytes32 (smart contract expects this format)
        const bytes32Hash = '0x' + hexHash;

        console.log(`⛓️  Sending hash to blockchain for report: ${reportId}`);
        const tx = await contract.storeHash(reportId, bytes32Hash);

        // Wait for the transaction to be mined (confirmed)
        const receipt = await tx.wait();
        console.log(`✅ Blockchain tx confirmed: ${receipt.hash}`);

        return receipt.hash; // This is the proof — store it in MongoDB!
    } catch (err) {
        // If blockchain fails, we DON'T crash the backend.
        // The report is already saved in MongoDB — we just won't have a txHash.
        console.error('⚠️  Blockchain call failed (report still saved in DB):', err.message);
        return null;
    }
};

module.exports = { storeHashOnChain };
