# 🛡️ Decentralized Anonymous Reporting Platform for Social Issues / Crimes

A secure, anonymous, Web3-integrated web application built to empower citizens to report crimes, corruption, and social issues without fear of retaliation. 

Through the combination of immutable blockchain records (Ethereum Smart Contracts) and decentralized storage (IPFS), this platform ensures that once evidence is submitted, it can **never** be tampered with, deleted, or altered by corrupt authorities or malicious actors.

---

## 🌟 Key Features

* **🎭 Absolute Anonymity**: No accounts, emails, or phone numbers required. Users are completely untraceable.
* **🌐 Decentralized Evidence Storage**: Images and sensitive files are uploaded to **IPFS** (InterPlanetary File System) via Pinata, meaning they are stored across a decentralized node network rather than a centralized, vulnerable server.
* **⛓️ Cryptographic Proof**: Once a report is submitted, a SHA-256 hash containing all report data is generated and permanently anchored to an **Ethereum Smart Contract**. The frontend verifies this mathematical proof in real-time.
* **🔍 Secure Tracking Portal**: Users can use their generated randomized `Report ID` to track the status of their specific incident, completely partitioned from other users' reports.
* **👮 Authorized Admin Dashboard**: Investigators have a passcode-protected portal to manage reports. Whenever a status changes (e.g. from *Pending* to *Resolved*), the update is synchronized instantly to both the MongoDB Database and the Ethereum Ledger.

---

## 🏗️ Architecture & Tech Stack

This project is structured as a full-stack monorepo featuring three core pillars:

1. **Frontend (Client)**: `React.js`, `Axios`, `CSS3`
   - A Tab-based Single Page Application (SPA) offering a seamless experience between Submitting, Tracking, and Administering reports.
2. **Backend (Server)**: `Node.js`, `Express.js`, `Mongoose`, `Multer`
   - A robust REST API that handles file uploads, database interactions, and acts as a secure bridge to the blockchain network.
3. **Database & Web3 Integration**: 
   - `MongoDB Atlas`: Fast NoSQL structured datastore for querying and indexing reports.
   - `IPFS (Pinata)`: Decentralized storage layer for media files.
   - `Hardhat / Ethers.js` / `Solidity`: Local Ethereum network node and Smart Contract deployment for immutable record keeping.

---

## 🚀 Local Setup & Installation

Follow these steps to run the platform locally for development or presentation purposes.

### 1. Prerequisites
- Node.js (v16+)
- MongoDB Atlas Account (with a free cluster)
- Pinata Account (for IPFS API keys)

### 2. Clone the Repository
```bash
git clone https://github.com/aryanshu1911/Decentralized-Incident-Reporting-System.git
cd Decentralized-Incident-Reporting-System
```

### 3. Start the Blockchain Network (Hardhat)
Open Terminal 1:
```bash
cd blockchain
npm install
npx hardhat node
```
Open Terminal 2 (Deploy the Smart Contract to the local network):
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
*Note the deployed `Contract Address` from the terminal output.*

### 4. Configure the Backend (Node.js)
Open Terminal 3:
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGO_URI=mongodb+srv://<your_username>:<password>@cluster0...
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_API_KEY=your_pinata_secret
PRIVATE_KEY=your_hardhat_account_0_private_key
CONTRACT_ADDRESS=your_deployed_contract_address_from_step_3
```
Start the Server:
```bash
npm start
# Expected Output: Server running on port 5000, MongoDB connected!
```

### 5. Start the Frontend (React.js)
Open Terminal 4:
```bash
cd frontend
npm install
npm start
# The platform will safely launch at http://localhost:3000
```

---

## 🎓 Capstone Presentation Notes
This repository represents the **Phase 1 & 2** implementation of the Capstone project. It successfully demonstrates a hybridized Web2/Web3 architecture that balances the fast read/write speeds of MongoDB with the permanent cryptographic immutability of an Ethereum-based verifiable ledger.
