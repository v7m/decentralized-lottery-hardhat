const { network, ethers } = require("hardhat");
const { verify } = require("../utils/verify");
const {
    chainIds,
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");

const VRF_FUND_AMOUNT = ethers.utils.parseEther("1"); // 1 ETH

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, vrfSubscriptionId, vrfCoordinatorV2Mock;

    if (chainId == chainIds["localhost"]) {
        // create VRFV2 Subscription
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait();
        vrfSubscriptionId = transactionReceipt.events[0].args.subId;
        // Fund the subscription
        await vrfCoordinatorV2Mock.fundSubscription(vrfSubscriptionId, VRF_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        vrfSubscriptionId = networkConfig[chainId]["vrfSubscriptionId"];
    }

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    const contractArguments = [
        vrfCoordinatorV2Address,
        vrfSubscriptionId,
        networkConfig[chainId]["vrfGasLane"],
        networkConfig[chainId]["vrfCallbackGasLimit"],
        networkConfig[chainId]["keepersUpdateInterval"],
        networkConfig[chainId]["lotteryEntrancePrice"],
    ];

    const lotteryContract = await deploy("Lottery", {
        from: deployer,
        args: contractArguments,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    });

    // Ensure the Lottery contract is a valid consumer of the VRFCoordinatorV2Mock contract
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        await vrfCoordinatorV2Mock.addConsumer(vrfSubscriptionId, lotteryContract.address);
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Lottery contract verifying...");
        await verify(lotteryContract.address, contractArguments);
    }

    log("----------------------------------------------------------");
    log("Lottery Deployed!");
    log("----------------------------------------------------------");

    log("Enter lottery with command:");
    const networkName = network.name == "hardhat" ? "localhost" : network.name;
    log(`yarn hardhat run scripts/enterLottery.js --network ${networkName}`);
    log("----------------------------------------------------");
}

module.exports.tags = ["all", "lottery"];
