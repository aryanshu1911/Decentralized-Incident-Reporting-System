// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ComplaintHash {
    // ── State ──────────────────────────────────────────────
    address public admin;

    struct Complaint {
        bytes32 hash;
        address reporter;
        uint256 timestamp;
        string  status;
        bool    exists;
    }

    mapping(string => Complaint) private complaints;

    // ── Events ─────────────────────────────────────────────
    event HashStored(string complaintId, bytes32 hash, address reporter);
    event StatusUpdated(string complaintId, string status);

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

    /// @notice Store a complaint hash on-chain
    /// @param complaintId  Unique ID of the complaint
    /// @param hash         SHA-256 hash (cast to bytes32)
    function storeHash(string memory complaintId, bytes32 hash) public {
        require(!complaints[complaintId].exists, "Hash already stored for this complaint");

        complaints[complaintId] = Complaint({
            hash: hash,
            reporter: msg.sender,
            timestamp: block.timestamp,
            status: "Pending",
            exists: true
        });

        emit HashStored(complaintId, hash, msg.sender);
    }

    /// @notice Admin-only: update the status of a complaint
    /// @param complaintId  Unique ID of the complaint
    /// @param status       New status string (e.g. "Resolved", "Under Review")
    function updateStatus(string memory complaintId, string memory status) public onlyAdmin {
        require(complaints[complaintId].exists, "Complaint does not exist");

        complaints[complaintId].status = status;

        emit StatusUpdated(complaintId, status);
    }

    /// @notice Verify whether a hash matches the stored hash
    /// @param complaintId  Unique ID of the complaint
    /// @param hash         Hash to verify against
    /// @return             True if hashes match
    function verifyHash(string memory complaintId, bytes32 hash) public view returns (bool) {
        require(complaints[complaintId].exists, "Complaint does not exist");
        return complaints[complaintId].hash == hash;
    }

    /// @notice Get full complaint data
    /// @param complaintId  Unique ID of the complaint
    function getComplaint(string memory complaintId)
        public
        view
        returns (bytes32 hash, address reporter, uint256 timestamp, string memory status)
    {
        require(complaints[complaintId].exists, "Complaint does not exist");

        Complaint memory c = complaints[complaintId];
        return (c.hash, c.reporter, c.timestamp, c.status);
    }
}