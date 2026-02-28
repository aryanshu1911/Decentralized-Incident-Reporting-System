const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReportHash", function () {
    let contract, admin, user1;

    // Helper: create a bytes32 hash from a string
    const toHash = (str) => ethers.keccak256(ethers.toUtf8Bytes(str));

    beforeEach(async function () {
        [admin, user1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReportHash");
        contract = await Factory.deploy();
        await contract.waitForDeployment();
    });

    // ── 1. Deployment ────────────────────────────────────────
    it("should set deployer as admin", async function () {
        expect(await contract.admin()).to.equal(admin.address);
    });

    // ── 2. storeHash ─────────────────────────────────────────
    it("should store a hash and emit HashStored event", async function () {
        const hash = toHash("report1-data");

        await expect(contract.connect(user1).storeHash("RPT001", hash))
            .to.emit(contract, "HashStored")
            .withArgs("RPT001", hash, user1.address);
    });

    // ── 3. storeHash duplicate ───────────────────────────────
    it("should revert if hash already stored for same reportId", async function () {
        const hash = toHash("report1-data");
        await contract.storeHash("RPT001", hash);

        await expect(contract.storeHash("RPT001", hash))
            .to.be.revertedWith("Hash already stored for this report");
    });

    // ── 4. verifyHash ────────────────────────────────────────
    it("should return true for correct hash, false for wrong hash", async function () {
        const correctHash = toHash("report1-data");
        const wrongHash = toHash("tampered-data");

        await contract.storeHash("RPT001", correctHash);

        expect(await contract.verifyHash("RPT001", correctHash)).to.be.true;
        expect(await contract.verifyHash("RPT001", wrongHash)).to.be.false;
    });

    // ── 5. updateStatus (admin) ──────────────────────────────
    it("should allow admin to update status and emit StatusUpdated", async function () {
        const hash = toHash("report1-data");
        await contract.storeHash("RPT001", hash);

        await expect(contract.updateStatus("RPT001", "Resolved"))
            .to.emit(contract, "StatusUpdated")
            .withArgs("RPT001", "Resolved");
    });

    // ── 6. updateStatus (non-admin reverts) ──────────────────
    it("should revert if non-admin tries to update status", async function () {
        const hash = toHash("report1-data");
        await contract.storeHash("RPT001", hash);

        await expect(contract.connect(user1).updateStatus("RPT001", "Resolved"))
            .to.be.revertedWith("Only admin can call this");
    });

    // ── 7. getReport ──────────────────────────────────────
    it("should return correct report data", async function () {
        const hash = toHash("report1-data");
        await contract.connect(user1).storeHash("RPT001", hash);

        const [storedHash, reporter, timestamp, status] = await contract.getReport("RPT001");

        expect(storedHash).to.equal(hash);
        expect(reporter).to.equal(user1.address);
        expect(timestamp).to.be.greaterThan(0);
        expect(status).to.equal("Pending");
    });
});
