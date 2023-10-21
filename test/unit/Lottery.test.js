const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Tests", function () {
        let lotteryContract, vrfCoordinatorV2Mock, lotteryEntrancePrice, lotteryDuration, player;

        beforeEach(async () => {
            accounts = await ethers.getSigners();
            player = accounts[1];
            await deployments.fixture(["mocks", "lottery"]);
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
            lotteryContract = await ethers.getContract("Lottery", player);
            lotteryEntrancePrice = await lotteryContract.getMinEntrancePrice();
            lotteryDuration = await lotteryContract.getDuration();
        });

        describe("constructor", function () {
            it("initializes the lottery with correct state", async () => {
                const lotteryState = (await lotteryContract.getLotteryState()).toString();

                expect(lotteryState).to.eq("0");
            });

            it("initializes the lottery with correct lottery duration", async () => {
                const keepersUpdateInterval = networkConfig[network.config.chainId]["keepersUpdateInterval"];

                expect(lotteryDuration.toString()).to.eq(keepersUpdateInterval);
            });
        });

        describe("enterLottery", function () {
            context("when player doesn't send any amount", () => {
                it("reverts with Lottery__TransactionAmountTooLow error", async () => {
                    await expect(lotteryContract.enterLottery()).to.be.revertedWith(
                        "Lottery__TransactionAmountTooLow"
                    );
                });
            });

            context("when player doesn't send enough amount", () => {
                it("reverts with Lottery__TransactionAmountTooLow error", async () => {
                    const entranceAmount = lotteryEntrancePrice.div(2);

                    await expect(lotteryContract.enterLottery({ value: entranceAmount })).to.be.revertedWith(
                        "Lottery__TransactionAmountTooLow"
                    );
                });
            });

            context("when player sent enough amount", () => {
                it("records player when they enter", async () => {
                    await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
                    const playerAddress = await lotteryContract.getPlayer(0);

                    expect(player.address).to.eq(playerAddress);
                });

                it("emits PlayerEnterLottery event on player enter lottery", async () => {
                    await expect(lotteryContract.enterLottery({ value: lotteryEntrancePrice })).to.emit(
                        lotteryContract,
                        "PlayerEnterLottery"
                    );
                });

                context("when lottery is calculating winner", () => {
                    beforeEach(async () => {
                        await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
                        await time.increase(lotteryDuration.toNumber() + 1);
                        await lotteryContract.performUpkeep("0x");
                    });

                    it("reverts with Lottery__LotteryIsTemporarilyClosed error", async () => {
                        await expect(lotteryContract.enterLottery({ value: lotteryEntrancePrice })).to.be.revertedWith(
                            "Lottery__LotteryTemporarilyClosed"
                        );
                    });
                });
            });
        });

        describe("checkUpkeep", function () {
            let checkUpkeepResult;

            context("when players haven't sent any amount", () => {
                beforeEach(async () => {
                    await time.increase(lotteryDuration.toNumber() + 1);
                    checkUpkeepResult = await lotteryContract.callStatic.checkUpkeep("0x");
                });

                it("returns false", async () => {
                    const { upkeepNeeded } = checkUpkeepResult;
    
                    expect(upkeepNeeded).to.be.false;
                });
            });

            context("when lottery isn't open", () => {
                let lotteryState;

                beforeEach(async () => {
                    await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
                    await time.increase(lotteryDuration.toNumber() + 1);
                    await lotteryContract.performUpkeep("0x");
                    lotteryState = await lotteryContract.getLotteryState();
                    checkUpkeepResult = await lotteryContract.callStatic.checkUpkeep("0x");
                });

                it("returns false", async () => {
                    const { upkeepNeeded } = checkUpkeepResult;

                    expect(lotteryState.toString()).to.eq("1");
                    expect(upkeepNeeded).to.be.false;
                });
            });

            context("when lottery isn't finished", () => {
                beforeEach(async () => {
                    await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
                    await time.increase(lotteryDuration.toNumber() - 5);
                    checkUpkeepResult = await lotteryContract.callStatic.checkUpkeep("0x");
                });

                it("returns false", async () => {
                    const { upkeepNeeded } = checkUpkeepResult;

                    expect(upkeepNeeded).to.be.false;
                });
            });

            context("when lottery is open and finished, players sent amount", () => {
                beforeEach(async () => {
                    await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
                    await time.increase(lotteryDuration.toNumber() + 1);
                    upkeepResult = await lotteryContract.callStatic.checkUpkeep("0x");
                });

                it("returns true", async () => {
                    const { upkeepNeeded } = await lotteryContract.callStatic.checkUpkeep("0x");

                    expect(upkeepNeeded).to.be.true;
                });
            });
        });

        describe("performUpkeep", function () {
            context("when checkUpkeep returns true", () => {
                let txResponse;

                beforeEach(async () => {
                    await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
                    await time.increase(lotteryDuration.toNumber() + 1);
                    txResponse = await lotteryContract.performUpkeep("0x");
                });

                it("doesn't revert transaction", async () => {
                    expect(txResponse).to.exist;
                });

                it("updates the lottery state and emits a requestId", async () => {
                    const txReceipt = await txResponse.wait(1);
                    const lotteryState = await lotteryContract.getLotteryState();
                    const requestId = txReceipt.events[2].args.requestId;

                    expect(requestId.toNumber()).to.be.greaterThan(0);
                    expect(lotteryState).to.eq(1);
                });
            });

            context("when checkUpkeep returns false", () => {
                it("reverts with Lottery__UpkeepNotNeeded error", async () => {
                    await expect(lotteryContract.performUpkeep("0x")).to.be.revertedWith("Lottery__UpkeepNotNeeded");
                });
            });
        });

        describe("fulfillRandomWords", function () {
            beforeEach(async () => {
                await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
                await time.increase(lotteryDuration.toNumber() + 1);
            });

            context("when called before performUpkeep", () => {
                it("reverts transaction", async () => {
                    await expect(
                        vrfCoordinatorV2Mock.fulfillRandomWords(0, lotteryContract.address)
                    ).to.be.revertedWith("nonexistent request");

                    await expect(
                        vrfCoordinatorV2Mock.fulfillRandomWords(1, lotteryContract.address)
                    ).to.be.revertedWith("nonexistent request");
                });
            });

            context("when called after performUpkeep", () => {
                let startTimestamp, winnerStartingBalance, winner;

                beforeEach(async () => {
                    // total: lotteryEntrancePrice * 103
                    const players = [
                        { account: accounts[2], amount: lotteryEntrancePrice.mul(100) },
                        { account: accounts[3], amount: lotteryEntrancePrice },
                        { account: accounts[4], amount: lotteryEntrancePrice }
                    ];

                    winner = accounts[2];

                    for (const player of players) {
                        lotteryContract = lotteryContract.connect(player.account);
                        await lotteryContract.enterLottery({ value: player.amount });
                    }
                    
                    startTimestamp = await lotteryContract.getStartTimestamp();
                    const txResponse = await lotteryContract.performUpkeep("0x");
                    const txReceipt = await txResponse.wait(1);
                    winnerStartingBalance = await winner.getBalance();
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[2].args.requestId,
                        lotteryContract.address
                    );
                });

                it("picks winner correctly", async () => {
                    await new Promise(async (resolve, reject) => {
                        lotteryContract.once("LotteryWinnerPicked", async () => { 
                            try {
                                const recentWinner = await lotteryContract.getRecentWinner();

                                assert.equal(recentWinner.toString(), winner.address);

                                resolve();
                            } catch (e) { 
                                reject(e);
                            }
                        });
                    });
                });

                it("reset previous players", async () => {
                    await new Promise(async (resolve, reject) => {
                        lotteryContract.once("LotteryWinnerPicked", async () => { 
                            try {
                                await expect(lotteryContract.getPlayer(0)).to.be.reverted;
                                await expect(lotteryContract.getGetPlayerAmount(winner)).to.be.reverted;
                                
                                resolve();
                            } catch (e) { 
                                reject(e);
                            }
                        });
                    });
                });

                it("change lottery state to open", async () => {
                    await new Promise(async (resolve, reject) => {
                        lotteryContract.once("LotteryWinnerPicked", async () => { 
                            try {
                                const lotteryState = await lotteryContract.getLotteryState();
                                
                                expect(lotteryState).to.eq(0);
                                
                                resolve();
                            } catch (e) { 
                                reject(e);
                            }
                        });
                    });
                });

                it("sends correct amount to winner", async () => {
                    await new Promise(async (resolve, reject) => {
                        lotteryContract.once("LotteryWinnerPicked", async () => { 
                            try {
                                const winnerBalance = await accounts[2].getBalance();
                                const winnerPrize = lotteryEntrancePrice.mul(103)
                                const expectedWinnerBalance = winnerStartingBalance.add(winnerPrize);

                                expect(winnerBalance.toString()).to.eq(expectedWinnerBalance.toString())
                                
                                resolve();
                            } catch (e) { 
                                reject(e);
                            }
                        });
                    });
                });

                it("sets startTimestamp correctly", async () => {
                    await new Promise(async (resolve, reject) => {
                        lotteryContract.once("LotteryWinnerPicked", async () => { 
                            try {
                                const endTimestamp = await lotteryContract.getStartTimestamp();

                                expect(endTimestamp.toNumber()).to.be.greaterThan(startTimestamp.toNumber());
                                
                                resolve();
                            } catch (e) { 
                                reject(e);
                            }
                        });
                    });
                });
            });
        });

        describe("getLotteryPrize", function () {
            beforeEach(async () => {
                await lotteryContract.enterLottery({ value: lotteryEntrancePrice });
            });

            it("returns correct lottery prize", async () => {
                const lotteryPrize = await lotteryContract.getLotteryPrize();

                expect(lotteryPrize).to.eq(lotteryEntrancePrice);
            });
        });

        describe("getGetPlayerAmount", function () {
            let expectedPlayerAmount;

            beforeEach(async () => {
                expectedPlayerAmount = lotteryEntrancePrice.mul(2);
                await lotteryContract.enterLottery({ value: expectedPlayerAmount });
            });

            it("returns correct player amount", async () => {
                const playerAddress = await lotteryContract.getPlayer(0);
                const playerAmount = await lotteryContract.getGetPlayerAmount(playerAddress);

                expect(playerAmount.toString()).to.eq(expectedPlayerAmount.toString());
            });
        });

        describe("getPlayersAmountAvg", function () {
            context("when no players present", () => {
                it("returns correct players amount AVG", async () => {
                    const playersAmountAvg = await lotteryContract.getPlayersAmountAvg();

                    expect(playersAmountAvg.toString()).to.eq("0");
                });
            });

            context("when players present", () => {
                beforeEach(async () => {
                    const players = [
                        { account: accounts[2], amount: ethers.utils.parseEther("1") },
                        { account: accounts[3], amount: ethers.utils.parseEther("2") },
                        { account: accounts[4], amount: ethers.utils.parseEther("3") }
                    ];

                    for (const player of players) {
                        lotteryContract = lotteryContract.connect(player.account);
                        await lotteryContract.enterLottery({ value: player.amount });
                    }
                });

                it("returns correct players amount AVG", async () => {
                    const playersAmountAvg = await lotteryContract.getPlayersAmountAvg();

                    expect(playersAmountAvg.toString()).to.eq(ethers.utils.parseEther("2").toString());
                });
            });
        });
    });
