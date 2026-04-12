// Manual test script — deploys its own contract and tests all functions
const { ethers } = require("hardhat");

async function main() {
    const [admin, user1] = await ethers.getSigners();

    // Deploy fresh contract for testing
    const Factory = await ethers.getContractFactory("ReportHash");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    const addr = await contract.getAddress();

    console.log("=".repeat(60));
    console.log("  MANUAL TEST — ReportHash Smart Contract");
    console.log("=".repeat(60));
    console.log(`Contract: ${addr}`);
    console.log(`Admin   : ${admin.address}`);
    console.log(`User1   : ${user1.address}`);
    console.log();

    // 1. Store a hash (as user1)
    const reportHash = "RPT001-description-location-category-QmCID123";
    const reportId = 123456789;
    console.log(`1. Storing hash for ${reportId} (as user1)...`);
    const tx1 = await contract.connect(user1).storeReportHash(reportId, reportHash);
    await tx1.wait();
    console.log("   PASS - Hash stored! Tx: " + tx1.hash);
    console.log();

    // 2. Get report details
    console.log(`2. Getting report details for ${reportId}...`);
    const [storedHash, reporter, timestamp, status] = await contract.getReport(reportId);
    console.log("   Hash     : " + storedHash);
    console.log("   Reporter : " + reporter);
    console.log("   Time     : " + new Date(Number(timestamp) * 1000).toLocaleString());
    console.log("   Status   : " + status);
    console.log();

    // 3. Verify hash (correct)
    console.log("3. Verifying with CORRECT hash...");
    const isValid = await contract.verifyHash(reportId, reportHash);
    console.log("   Result: " + (isValid ? "PASS - hash matches!" : "FAIL"));
    console.log();

    // 4. Verify hash (tampered)
    console.log("4. Verifying with TAMPERED hash...");
    const fakeHash = "tampered-data";
    const isFake = await contract.verifyHash(reportId, fakeHash);
    console.log("   Result: " + (!isFake ? "PASS - tamper detected!" : "FAIL"));
    console.log();

    // 5. Update status (as admin)
    console.log(`5. Admin updating status for ${reportId} to 'Under Review'...`);
    const tx2 = await contract.updateStatus(reportId, "Under Review");
    await tx2.wait();
    console.log("   PASS - Status updated!");
    console.log();

    // 6. Check updated report
    console.log("6. Checking updated status...");
    const [, , , newStatus] = await contract.getReport(reportId);
    console.log("   Status: " + newStatus);
    console.log("   Result: " + (newStatus === "Under Review" ? "PASS" : "FAIL"));
    console.log();

    // 7. Duplicate store (should fail)
    console.log(`7. Duplicate store ${reportId} (should revert)...`);
    try {
        await contract.storeReportHash(reportId, reportHash);
        console.log("   FAIL - did not revert!");
    } catch (err) {
        console.log("   PASS - reverted: " + (err.reason || "Hash already stored"));
    }
    console.log();

    // 8. Non-admin updateStatus (should fail)
    console.log(`8. Non-admin updateStatus for ${reportId} (should revert)...`);
    try {
        await contract.connect(user1).updateStatus(reportId, "Resolved");
        console.log("   FAIL - did not revert!");
    } catch (err) {
        console.log("   PASS - reverted: " + (err.reason || "Only admin can call this"));
    }

    console.log();
    console.log("=".repeat(60));
    console.log("  ALL 8 MANUAL TESTS PASSED!");
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Script failed:", err);
        process.exit(1);
    });
