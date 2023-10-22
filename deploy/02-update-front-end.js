const { FRONTEND_CONTRACT_ADDERS_FILE, FRONTEND_CONTRACT_ABI_FILE } = require("../helper-hardhat-config");
const fs = require("fs");
const { network } = require("hardhat");

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating contract address and ABI on frontend...");
        await updateContractAddresses();
        await updateContractAbi();

        console.log("----------------------------------------------------------");
        console.log("Contract address and ABI updated on frontend!");
        console.log("----------------------------------------------------------");
    }
}

async function updateContractAbi() {
    const lottery = await ethers.getContract("Lottery");
    fs.writeFileSync(FRONTEND_CONTRACT_ABI_FILE, lottery.interface.format(ethers.utils.FormatTypes.json));
}

async function updateContractAddresses() {
    const lottery = await ethers.getContract("Lottery");
    const contractAddresses = JSON.parse(fs.readFileSync(FRONTEND_CONTRACT_ADDERS_FILE, "utf8"));
    const chainId = network.config.chainId.toString();

    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId].includes(lottery.address)) {
            contractAddresses[chainId].push(lottery.address);
        }
    } else {
        contractAddresses[chainId] = [lottery.address];
    }

    fs.writeFileSync(FRONTEND_CONTRACT_ADDERS_FILE, JSON.stringify(contractAddresses));
}

module.exports.tags = ["all", "frontend"];
