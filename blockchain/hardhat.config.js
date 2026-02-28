require("@nomicfoundation/hardhat-toolbox");
// require("dotenv").config(); // Uncomment when deploying to testnet

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        hardhat: {},
        // Polygon Amoy Testnet — uncomment when ready to deploy
        // amoy: {
        //   url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
        //   accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        //   chainId: 80002,
        // },
    },
};
