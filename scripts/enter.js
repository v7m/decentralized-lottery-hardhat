const { ethers } = require("hardhat");

async function enterLottery() {
    const lottery = await ethers.getContract("Lottery");
    const entrancePrice = await lottery.getEntrancePrice();
    await lottery.enterLottery({ value: entrancePrice + 1 });
    console.log("Lottery entered!");
}

enterLottery()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    });
