# 🛡️ Decentralized Incident Reporting System

A full-stack decentralized application (DApp) for reporting crime and social issues with **tamper-proof evidence** using IPFS and blockchain smart contracts.

## 📌 Abstract

This system enables citizens to report incidents (crime, harassment, vandalism, fraud, etc.) with image evidence that is stored on **IPFS (via Pinata)** for decentralized, immutable storage. Each report generates a **SHA-256 blockchain hash** combining the report metadata and evidence CID, ensuring the integrity of submitted reports cannot be compromised.

## 🏗️ Architecture Overview

```
                          ┌───────────────────────────┐
                          │        React Frontend     │
                          │  (Submit, Track, Admin)   │
                          └─────────────┬─────────────┘
                                        │
                                  HTTP / REST
                                        │
                                        ▼
                        ┌────────────────────────────┐
                        │        Express API         │
                        │        (Node.js)           │
                        │                            │
                        │  • Report Processing       │
                        │  • SHA-256 Hash Creation   │ 
                        │  • Smart Contract Calls    │ 
                        └─────────────┬──────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
                 ▼                    ▼                    ▼

        ┌───────────────┐     ┌───────────────┐     ┌────────────────┐
        │    MongoDB    │     │    Pinata     │     │  Hardhat Local │
        │   Database    │     │   IPFS API    │     │   Blockchain   │
        │               │     │               │     │                │
        │ • Reports     │     │ • Upload Img  │     │ • SmartContract│
        │ • Status      │     │ • Return CID  │     │ • Hash Storage │
        │ • Metadata    │     │               │     │                │
        └────────┬──────┘     └──────┬────────┘     └────────┬───────┘
                 │                   │                       │
                 │                   ▼                       ▼
                 │             ┌─────────────┐       ┌───────────────┐
                 │             │     IPFS    │       │  Solidity     │
                 │             │ File Storage│       │ SmartContract │
                 │             └─────────────┘       └───────────────┘
                 │
                 ▼
        ┌───────────────────┐
        │  SHA-256 Hashing  │
        │ (Report + CID)    │
        └───────────────────┘
```

## ✨ Features

- 📝 **Submit Reports** — description, location, category & optional image evidence
- �📸 **IPFS Evidence Storage** — images uploaded to Pinata/IPFS for decentralized storage
- 🔒 **SHA-256 Hash Generation** — tamper-proof hash of report data + evidence CID
- 🔍 **Track My Report** — verify your report's blockchain hash using your private Report ID (copy-to-clipboard)
- � **Public Reports View** — read-only Recent/Trending views with summary data, status badges & relative timestamps
- 👮 **Secure Investigator Panel** — passcode-locked portal with full report data, blockchain verification, status filter
- 🔄 **Status Management** — update report status (Pending → In Progress → Resolved → Rejected) on MongoDB + Smart Contract
- 🗑️ **Delete Reports** — remove reports via API

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Axios |
| **Backend** | Node.js, Express 5, ethers.js |
| **Database** | MongoDB (Mongoose) |
| **File Storage** | IPFS via Pinata |
| **Blockchain** | Solidity, Hardhat/Polygon Amoy |
| **File Upload** | Multer |

## 📁 Project Structure

```
Capstone/
├── backend/
│   ├── server.js                     # Express setup + MongoDB connection
│   ├── .env                          # Environment variables (not in repo)
│   ├── models/
│   │   └── report.js                 # Mongoose schema (GeoJSON location, trending fields, 2dsphere index)
│   ├── routes/
│   │   └── reports.js                # REST API (public summary, admin full-data, trending, verify, status)
│   ├── utils/
│   │   ├── pinata.js                 # Pinata IPFS upload utility
│   │   ├── blockchain.js             # Smart contract bridge (ethers.js)
│   │   └── contractABI.json          # Contract ABI for ethers.js
│   └── tests/
│       └── trending.test.js          # Trending aggregation pipeline unit tests
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js                    # Main app (4 tabs: Submit, Reports, Track, Investigator)
│       ├── App.css                   # Global styling
│       ├── index.js                  # React entry point
│       ├── components/
│       │   ├── reportForm.js         # Submit form (optional image, GPS opt-in, Report ID copy)
│       │   ├── PublicReports.js      # Public read-only view (Recent/Trending, summary-only)
│       │   ├── TrackReport.js        # Track-by-ID (full details, blockchain verification)
│       │   ├── AdminDashboard.js     # Investigator login gate
│       │   └── reportList.js         # Admin report list (status filter, blockchain verification)
│       └── utils/
│           └── api.js                # Axios API calls
├── blockchain/
│   ├── contracts/
│   │   └── reportHash.sol            # Solidity smart contract
│   ├── scripts/
│   │   └── deploy.js                 # Contract deployment script
│   ├── test/
│   │   └── reportHash.test.js        # Smart contract unit tests (7 tests)
│   ├── hardhat.config.js             # Hardhat configuration
│   └── package.json                  # Blockchain dependencies
└── .gitignore
```

## ⚙️ Setup & Run

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB)
- Pinata account (for IPFS)

### 1. Clone the repo
```bash
git clone https://github.com/aryanshu1911/Decentralized-Incident-Reporting-System.git
cd Decentralized-Incident-Reporting-System
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
MONGO_URI=your_mongodb_connection_string
PORT=5000
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=your_hardhat_test_private_key
CONTRACT_ADDRESS=your_deployed_contract_address
```

Start the backend:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

The app will open at **http://localhost:3000**

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/reports` | Submit a new report (optional image) |
| `GET` | `/reports` | Get all reports (public summary-only fields) |
| `GET` | `/reports/all` | Get all reports with full details (admin) |
| `GET` | `/reports/trending` | Get trending reports by location (requires `lat`, `lng` params) |
| `GET` | `/reports/:reportId` | Get a specific report by ID (full details) |
| `GET` | `/reports/:reportId/verify` | Verify a report's SHA-256 hash against the Ethereum Ledger |
| `PUT` | `/reports/:reportId/status` | Update report status (Pending, In Progress, Resolved, Rejected) |
| `DELETE` | `/reports/:reportId` | Delete a report |

## 🔐 Security Considerations

- Environment variables (`.env`) are excluded from version control
- Image evidence is stored on decentralized IPFS — not on a single server
- SHA-256 hash ensures data integrity — any tampering changes the hash
- File uploads restricted to images only (JPEG, PNG) with 2MB limit
- Public API endpoints return summary-only data — no blockchain hashes or IPFS CIDs exposed
- Report ID acts as a private access token — only holders can view full report details
- Status updates validated against allowed values (Pending, In Progress, Resolved, Rejected)

## 🚀 Future Enhancements

- Smart contract deployment on Polygon mainnet / testnet
- Real-time notifications via smart contract events
- Robust identity/authentication systems based on Zero-Knowledge proofs

## 📄 License

This project is developed as a Capstone Project for academic purposes.