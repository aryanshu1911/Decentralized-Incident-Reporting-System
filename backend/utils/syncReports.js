// backend/utils/syncReports.js
//
// 📖 WHAT THIS FILE DOES:
// When the Hardhat node restarts, ALL on-chain data is lost.
// But MongoDB still has reports with blockchainHash values.
// This script re-stores those hashes on-chain so verification works again.
//
// It runs once at backend startup and:
//  1. Fetches all reports from MongoDB that have a blockchainHash
//  2. For each, checks if the hash already exists on-chain (idempotent)
//  3. If not, calls storeHash() to re-store it
//  4. Updates the txHash in MongoDB with the new transaction hash
//

const Report = require('../models/report');
const { storeHashOnChain, contract, wallet } = require('./blockchain');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Check if a report already exists on the current blockchain node
 */
const reportExistsOnChain = async (reportId) => {
    try {
        await contract.getReport(reportId);
        return true; // No revert = report exists
    } catch {
        return false; // Reverted = report doesn't exist
    }
};

/**
 * Sync all MongoDB reports to the blockchain
 * Called once at backend startup
 */
const syncReportsToBlockchain = async () => {
    try {
        // Find all reports that have a blockchainHash (meaning they were properly submitted)
        const reports = await Report.find({
            blockchainHash: { $exists: true, $ne: null }
        });

        if (reports.length === 0) {
            console.log('📋 No reports to sync to blockchain.');
            return;
        }

        console.log(`🔄 Syncing ${reports.length} reports to blockchain...`);
        let synced = 0;
        let skipped = 0;
        let failed = 0;

        // Get the initial nonce for the wallet to avoid race conditions
        let currentNonce = await wallet.getNonce();

        for (const report of reports) {
            try {
                // Check if already on-chain (idempotent — don't re-store if already there)
                const exists = await reportExistsOnChain(report.reportId);
                if (exists) {
                    skipped++;
                    continue;
                }

                // Re-store hash on blockchain with explicit nonce
                const txHash = await storeHashOnChain(report.reportId, report.blockchainHash, {
                    nonce: currentNonce
                });

                if (txHash) {
                    // Update the txHash in MongoDB to the new one
                    report.txHash = txHash;
                    await report.save();
                    synced++;
                    currentNonce++; // Increment nonce for the next transaction
                } else {
                    failed++;
                }
            } catch (err) {
                console.error(`  ❌ Failed to sync report ${report.reportId}:`, err.message);
                failed++;
            }
        }

        console.log(`✅ Blockchain sync complete: ${synced} synced, ${skipped} already on-chain, ${failed} failed`);
    } catch (err) {
        console.error('⚠️  Blockchain sync failed (non-fatal):', err.message);
    }
};

module.exports = { syncReportsToBlockchain };
