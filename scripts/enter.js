const { ethers } = require("hardhat");

async function enterLottery() {
    const lottery = await ethers.getContract("Lottery");
    const minEntrancePrice = await lottery.getMinEntrancePrice();
    await lottery.enterLottery({ value: minEntrancePrice + 1 });
    console.log("Lottery entered!");
}

enterLottery()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    });
