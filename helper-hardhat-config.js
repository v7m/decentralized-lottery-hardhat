const { ethers } = require("hardhat");

const LOCALHOST_CHAIN_ID = 31337;
const SEPOLIA_CHAIN_ID = 11155111;
const MAINNET_CHAIN_ID = 1;
const GAS_LANE = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"; // 30 gwei
const KEEPERS_UPDATE_INTERVAL = "30"; // 30 sec
const RAFFLE_ENTRANCE_PRICE = ethers.utils.parseEther("0.01"); // 0.01 ETH
const CALLBACK_GAS_LIMIT = "500000"; // 500,000 gas
const SEPOLIA_SUBSCRIPRION_ID = process.env.SEPOLIA_SUBSCRIPRION_ID;
const SEPOLIA_VRF_COORDINATOR_V2_CONTRACT = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625";
const FRONTEND_DIRECTORY = process.env.FRONTEND_DIRECTORY || "decentralized-lottery-nextjs"
const FRONTEND_CONTRACT_ADDERS_FILE = `../${FRONTEND_DIRECTORY}/constants/contractAddresses.json`;
const FRONTEND_CONTRACT_ABI_FILE = `../${FRONTEND_DIRECTORY}/constants/abi.json`;
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;


chainIds = {
    localhost: LOCALHOST_CHAIN_ID,
    sepolia: SEPOLIA_CHAIN_ID,
    mainnet: MAINNET_CHAIN_ID
}

const networkConfig = {
    default: {
        name: "hardhat",
        keepersUpdateInterval: KEEPERS_UPDATE_INTERVAL,
    },
    [LOCALHOST_CHAIN_ID]: {
        name: "localhost",
        vrfGasLane: GAS_LANE,
        keepersUpdateInterval: KEEPERS_UPDATE_INTERVAL,
        lotteryEntrancePrice: RAFFLE_ENTRANCE_PRICE,
        vrfCallbackGasLimit: CALLBACK_GAS_LIMIT,
    },
    [SEPOLIA_CHAIN_ID]: {
        name: "sepolia",
        vrfSubscriptionId: SEPOLIA_SUBSCRIPRION_ID,
        vrfGasLane: GAS_LANE,
        keepersUpdateInterval: KEEPERS_UPDATE_INTERVAL,
        lotteryEntrancePrice: RAFFLE_ENTRANCE_PRICE,
        vrfCallbackGasLimit: CALLBACK_GAS_LIMIT,
        vrfCoordinatorV2: SEPOLIA_VRF_COORDINATOR_V2_CONTRACT,
    },
    [MAINNET_CHAIN_ID]: {
        name: "mainnet",
        keepersUpdateInterval: KEEPERS_UPDATE_INTERVAL,
    },
}

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    chainIds,
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    FRONTEND_CONTRACT_ADDERS_FILE,
    FRONTEND_CONTRACT_ABI_FILE,
}
