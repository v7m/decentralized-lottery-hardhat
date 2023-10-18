const { assert, expect } = require("chai");
const { getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Staging Tests", function () {
        let lotteryContract, lotteryEntrancePrice, deployer;

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            lotteryContract = await ethers.getContract("Lottery", deployer);
            lotteryEntrancePrice = await lotteryContract.getEntrancePrice();
        });

        describe("fulfillRandomWords", function () {
            it("picks random winner and sends correct amount using Chainlink VRF and Keepers", async function () {
                const startTimestamp = await lotteryContract.getStartTimestamp();
                const accounts = await ethers.getSigners();
                const player = accounts[0];

                await new Promise(async (resolve, reject) => {
                    lotteryContract.once("LotteryWinnerPicked", async () => {
                        try {
                            const recentWinner = await lotteryContract.getRecentWinner();
                            const lotteryState = await lotteryContract.getLotteryState();
                            const winnerEndingBalance = await player.getBalance();
                            const endTimestamp = await lotteryContract.getStartTimestamp();

                            await expect(lotteryContract.getPlayer(0)).to.be.reverted;
                            expect(recentWinner.toString()).to.equal(player.address);
                            expect(lotteryState).to.equal(0);
                            expect(endTimestamp.toNumber()).to.be.greaterThan(startTimestamp.toNumber());
                            expect(winnerEndingBalance.toString())
                                .to.equal(winnerStartingBalance.add(lotteryEntrancePrice).toString());

                            resolve();
                        } catch (error) {
                            console.log(error);
                            reject(error);
                        }
                    });

                    const txResponse = await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
                    await txResponse.wait(1);
                    const winnerStartingBalance = await player.getBalance();
                });
            });
        });
    });
