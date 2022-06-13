require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.6.12",
  networks: {
    kovan: {
      url: `${process.env.MORALIS_RPC_URL}/eth/kovan`,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
    ropsten: {
      url: `${process.env.MORALIS_RPC_URL}/eth/ropsten`,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
    mumbai: {
      url: `${process.env.MORALIS_RPC_URL}/polygon/mumbai`,
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY,
        process.env.USER_PRIVATE_KEY,
      ],
      timeout: 60000,
    },
    hardhat: {
      forking: {
        url: process.env.RPC_URL_MAINNET,
        blockNumber: 14873514,
        // blockNumber: 14800181
      },
    },
  },
  etherscan: {
    // apiKey: process.env.ETHERSCAN_API_KEY, //etherscan
    apiKey: process.env.POLYGONSCAN_API_KEY, // polygonscan
  },
};
