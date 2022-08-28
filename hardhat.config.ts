import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";
import "solidity-coverage";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers:[
      {
        version: "0.8.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 512,
            details: {
              yul: false,
            },
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 512,
            details: {
              yul: false,
            },
          },
        },
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 1337,
      blockGasLimit: 100000000000
    },
    goerli: {
      url: process.env.RPC_URL_GOERLI || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: process.env.RPC_URL_MUMBAI || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined? [process.env.PRIVATE_KEY] : [],
    },
    rinkeby: {
      url: process.env.RPC_URL_RINKEBY || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      url: process.env.RPC_URL_MAIN || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.RPC_URL_POLYGON || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      mainnet:
        process.env.ETHERSCAN_API_KEY !== undefined
          ? process.env.ETHERSCAN_API_KEY
          : "",
      rinkeby:
        process.env.ETHERSCAN_API_KEY !== undefined
          ? process.env.ETHERSCAN_API_KEY
          : "",
      goerli:
        process.env.ETHERSCAN_API_KEY !== undefined
          ? process.env.ETHERSCAN_API_KEY
          : "",
      //polygon
      polygon:
        process.env.POLYGONSCAN_API_KEY != undefined
          ? process.env.POLYGONSCAN_API_KEY
          : "",
      polygonMumbai:
        process.env.POLYGONSCAN_API_KEY != undefined
          ? process.env.POLYGONSCAN_API_KEY
          : "",
    },
  },
};

export default config;
