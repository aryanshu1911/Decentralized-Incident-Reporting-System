// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ComplaintHash {
    struct Complaint {
        bytes32 hash;
        address reporter;
        bool exists;
    }

    mapping(string => Complaint) public complaints;

    function storeHash(string memory complaintId, bytes32 hash) public {
        require(!complaints[complaintId].exists, "Already stored");
        complaints[complaintId] = Complaint(hash, msg.sender, true);
    }

    function verifyHash(string memory complaintId, bytes32 hash) public view returns (bool) {
        return complaints[complaintId].hash == hash;
    }
}