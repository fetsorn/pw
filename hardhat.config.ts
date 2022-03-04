import "@typechain/hardhat"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "hardhat-abi-exporter"
import "@nomiclabs/hardhat-etherscan"

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    ftm: {
      // url: "https://rpc.ankr.com/fantom",
      url: "https://rpcapi-tracing.fantom.network",
      accounts: process.env.PK ? [process.env.PK] : undefined,
    },
    ftmtestnet: {
      // url: "https://rpc.ankr.com/fantom",
      url: "https://rpc.testnet.fantom.network",
      accounts: [
        // Privkey: 0xfac28c28db705553e432d2a80773bae17f129e8f287a03f2397c182f491bb372
        // Address: 0xF9038bD0Fa10992aA51765e60641C297669dC0eA

        // Privkey: 0x39300504b2a986bd6cd81709bf8f7845810746fe783f31050c42c7271d5d29cd
        // Address: 0xA3364b8A4560249B66402111C01C68cFb9C1C2Bd

        // Privkey: 0xd08ba90b5a0d515b794709b91ad8088c4fdf27497a119d6e394e2bf9b6e2516a
        // Address: 0x527d39C9d84e1431CC754A00AB60B1797A476FD7

        // Privkey: 0x87fcd23f02583a31b43014e42f787bafe671da789accbf9fc22b24552a65345d
        // Address: 0x8A2BF6061f587B7220F8E2d0802A450A3AEcC102

        // Privkey: 0xfb0fb914932c28cecdc9bc85e6fa406134467b50081ff48327724ce9a311f557
        // Address: 0x0075B6f103d1c984Dd611cc39A34E95aFf475473
        // deployer
        "0xfac28c28db705553e432d2a80773bae17f129e8f287a03f2397c182f491bb372",
        "0x39300504b2a986bd6cd81709bf8f7845810746fe783f31050c42c7271d5d29cd",
        "0xd08ba90b5a0d515b794709b91ad8088c4fdf27497a119d6e394e2bf9b6e2516a",
        "0x87fcd23f02583a31b43014e42f787bafe671da789accbf9fc22b24552a65345d",
        "0xfb0fb914932c28cecdc9bc85e6fa406134467b50081ff48327724ce9a311f557",
      ],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  abiExporter: {
    clear: true,
    flat: true,
    spacing: 2,
  },
  mocha: {
    timeout: "100000000000000",
  },
  etherscan: {
    apiKey: {
      opera: "PYTF1XH3ND5KGGQCKREIQEZQ8X2M8R12SP",
    },
  },
}
