const { ethers, network } = require("hardhat");
const { chainIds } = require("../helper-hardhat-config");

async function mockKeepers() {
    const lottery = await ethers.getContract("Lottery");
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
    const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(checkData);

    if (upkeepNeeded) {
        const txResponse = await lottery.performUpkeep(checkData);
        const txReceipt = await txResponse.wait(1);
        const requestId = txReceipt.events[1].args.requestId;
        console.log(`Performed upkeep with RequestId: ${requestId}`);

        if (network.config.chainId == chainIds["localhost"]) {
            await mockVrf(requestId, lottery);
        }
    } else {
        console.log("No upkeep needed!");
    }
}

async function mockVrf(requestId, lottery) {
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
    const recentWinner = await lottery.getRecentWinner();
    console.log(`The recent winner is: ${recentWinner}`);
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    });
