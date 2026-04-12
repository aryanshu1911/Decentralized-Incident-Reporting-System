const { ethers } = require('ethers');
const path = require('path');
const ReportHashABI = require('../../blockchain/artifacts/contracts/reportHash.sol/ReportHash.json');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Connect to blockchain
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Load the contract using the ABI + deployed address
const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    ReportHashABI.abi,
    wallet
);

/**
 * Store a report hash on the blockchain
 * @param {string|number} reportId   - Unique report ID
 * @param {string} reportHash        - SHA-256 hash
 * @param {object} options           - Custom transaction options (e.g. nonce, gasPrice)
 * @returns {string|null}            - Transaction hash on success, null on failure
 */
const storeHashOnChain = async (reportId, reportHash, options = {}) => {
    try {
        console.log(`⛓️  Sending hash to blockchain for report: ${reportId}`);
        
        // Ensure reportId is a number/bigint for the contract call (uint256)
        const id = BigInt(reportId);

        // Call the smart contract method
        const tx = await contract.storeReportHash(id, reportHash, {
            ...options
        });
        
        // Wait for the transaction to be mined (confirmed)
        const receipt = await tx.wait();
        console.log(`✅ Blockchain write success: ${receipt.hash}`);

        return receipt.hash;
    } catch (err) {
        console.warn('⚠️  Blockchain call failed:', err.message);
        return null;
    }
};

/**
 * Update the status of a report on the blockchain (Admin only)
 * @param {string|number} reportId - Unique report ID
 * @param {string} status          - New status string
 * @returns {boolean}              - True on success, false on failure
 */
const updateStatusOnChain = async (reportId, status) => {
    try {
        console.log(`⛓️  Updating status on blockchain for report: ${reportId} to ${status}`);
        const id = BigInt(reportId);
        const tx = await contract.updateStatus(id, status);
        const receipt = await tx.wait();
        console.log(`✅ Blockchain status updated tx: ${receipt.hash}`);
        return true;
    } catch (err) {
        console.warn('⚠️  Failed to update status on blockchain:', err.message);
        return false;
    }
};

/**
 * Verify a hash exists on the blockchain for a report
 * @param {string|number} reportId   - Unique report ID
 * @param {string} reportHash        - SHA-256 hash to verify
 * @returns {object}                 - Verification result
 */
const verifyHashOnChain = async (reportId, reportHash) => {
    try {
        const id = BigInt(reportId);
        console.log(`🔍 Verifying hash on blockchain for report: ${reportId}`);

        try {
            await contract.getReport(id);
        } catch (e) {
            return { verified: false, reason: 'not_on_chain' };
        }

        const isVerified = await contract.verifyHash(id, reportHash);
        return { verified: isVerified, reason: isVerified ? 'match' : 'hash_mismatch' };
    } catch (err) {
        console.warn('⚠️  Failed to verify hash on blockchain:', err.message);
        return { verified: false, reason: 'error' };
    }
};

module.exports = {
    storeHashOnChain,
    updateStatusOnChain,
    verifyHashOnChain,
    provider,
    wallet,
    contract
};
