// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReportHash {
    // ── State ──────────────────────────────────────────────
    address public admin;

    struct Report {
        string  reportHash;
        address reporter;
        uint256 timestamp;
        string  status;
        bool    exists;
    }

    mapping(uint256 => Report) private reports;

    // ── Events ─────────────────────────────────────────────
    event HashStored(uint256 reportId, string reportHash, address reporter);
    event StatusUpdated(uint256 reportId, string status);

    // ── Modifiers ──────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    // ── Constructor ────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }

    // ── Core Functions ─────────────────────────────────────

    /// @notice Store a report hash on-chain
    /// @param reportId    Unique ID of the report
    /// @param reportHash  SHA-256 hash
    function storeReportHash(uint256 reportId, string memory reportHash) public {
        require(!reports[reportId].exists, "Hash already stored for this report");

        reports[reportId] = Report({
            reportHash: reportHash,
            reporter: msg.sender,
            timestamp: block.timestamp,
            status: "Pending",
            exists: true
        });

        emit HashStored(reportId, reportHash, msg.sender);
    }

    /// @notice Admin-only: update the status of a report
    /// @param reportId  Unique ID of the report
    /// @param status    New status string (e.g. "Resolved", "Under Review")
    function updateStatus(uint256 reportId, string memory status) public onlyAdmin {
        require(reports[reportId].exists, "Report does not exist");

        reports[reportId].status = status;

        emit StatusUpdated(reportId, status);
    }

    /// @notice Verify whether a hash matches the stored hash
    /// @param reportId    Unique ID of the report
    /// @param reportHash  Hash to verify against
    /// @return            True if hashes match
    function verifyHash(uint256 reportId, string memory reportHash) public view returns (bool) {
        require(reports[reportId].exists, "Report does not exist");
        return keccak256(abi.encodePacked(reports[reportId].reportHash)) == keccak256(abi.encodePacked(reportHash));
    }

    /// @notice Get full report data
    /// @param reportId  Unique ID of the report
    function getReport(uint256 reportId)
        public
        view
        returns (string memory reportHash, address reporter, uint256 timestamp, string memory status)
    {
        require(reports[reportId].exists, "Report does not exist");

        Report memory r = reports[reportId];
        return (r.reportHash, r.reporter, r.timestamp, r.status);
    }
}