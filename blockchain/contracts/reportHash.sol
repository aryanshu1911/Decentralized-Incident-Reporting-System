// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReportHash {
    // ── State ──────────────────────────────────────────────
    address public admin;

    struct Report {
        bytes32 hash;
        address reporter;
        uint256 timestamp;
        string  status;
        bool    exists;
    }

    mapping(string => Report) private reports;

    // ── Events ─────────────────────────────────────────────
    event HashStored(string reportId, bytes32 hash, address reporter);
    event StatusUpdated(string reportId, string status);

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
    /// @param reportId  Unique ID of the report
    /// @param hash      SHA-256 hash (cast to bytes32)
    function storeHash(string memory reportId, bytes32 hash) public {
        require(!reports[reportId].exists, "Hash already stored for this report");

        reports[reportId] = Report({
            hash: hash,
            reporter: msg.sender,
            timestamp: block.timestamp,
            status: "Pending",
            exists: true
        });

        emit HashStored(reportId, hash, msg.sender);
    }

    /// @notice Admin-only: update the status of a report
    /// @param reportId  Unique ID of the report
    /// @param status    New status string (e.g. "Resolved", "Under Review")
    function updateStatus(string memory reportId, string memory status) public onlyAdmin {
        require(reports[reportId].exists, "Report does not exist");

        reports[reportId].status = status;

        emit StatusUpdated(reportId, status);
    }

    /// @notice Verify whether a hash matches the stored hash
    /// @param reportId  Unique ID of the report
    /// @param hash      Hash to verify against
    /// @return          True if hashes match
    function verifyHash(string memory reportId, bytes32 hash) public view returns (bool) {
        require(reports[reportId].exists, "Report does not exist");
        return reports[reportId].hash == hash;
    }

    /// @notice Get full report data
    /// @param reportId  Unique ID of the report
    function getReport(string memory reportId)
        public
        view
        returns (bytes32 hash, address reporter, uint256 timestamp, string memory status)
    {
        require(reports[reportId].exists, "Report does not exist");

        Report memory r = reports[reportId];
        return (r.hash, r.reporter, r.timestamp, r.status);
    }
}