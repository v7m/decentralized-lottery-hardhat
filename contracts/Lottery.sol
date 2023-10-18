// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
import "hardhat/console.sol";

error Lottery__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 lotteryState);
error Lottery__TransferToWinnerFailed();
error Lottery__TransactionAmountTooLow();
error Lottery__LotteryTemporarilyClosed();

contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum LotteryState {
        OPEN,
        WINNER_CALCULATING
    }

    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_vrfSubscriptionId;
    bytes32 private immutable i_vrfGasLane;
    uint32 private immutable i_vrfCallbackGasLimit;

    uint256 private immutable i_duration;
    uint256 private immutable i_entrancePrice;
    uint256 private s_startTimestamp;
    address private s_recentWinner;
    address payable[] private s_players;
    LotteryState private s_lotteryState;

    event LotteryWinnerRequested(uint256 indexed requestId);
    event PlayerEnterLottery(address indexed player);
    event LotteryWinnerPicked(address indexed player);

    constructor(
        address vrfCoordinatorV2,
        uint64 vrfSubscriptionId,
        bytes32 vrfGasLane,
        uint32 vrfCallbackGasLimit,
        uint256 duration,
        uint256 entrancePrice
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_vrfSubscriptionId = vrfSubscriptionId;
        i_vrfGasLane = vrfGasLane;
        i_vrfCallbackGasLimit = vrfCallbackGasLimit;
        i_duration = duration;
        i_entrancePrice = entrancePrice;
        s_lotteryState = LotteryState.OPEN;
        s_startTimestamp = block.timestamp;
    }

    function enterLottery() public payable {
        if (msg.value < i_entrancePrice) {
            revert Lottery__TransactionAmountTooLow();
        }

        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__LotteryTemporarilyClosed();
        }

        s_players.push(payable(msg.sender));
        emit PlayerEnterLottery(msg.sender);
    }

    /**
     * @dev Function that the Chainlink Keeper nodes call
     */
    function checkUpkeep(bytes memory /* checkData */) public view override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool lotteryIsOpen = LotteryState.OPEN == s_lotteryState;
        bool lotteryIsOver = ((block.timestamp - s_startTimestamp) > i_duration);
        bool lotteryHasPlayers = s_players.length > 0;
        bool lotteryHasBalance = address(this).balance > 0;
        upkeepNeeded = (lotteryIsOpen && lotteryIsOver && lotteryHasPlayers && lotteryHasBalance);

        return (upkeepNeeded, "0x0"); // can we comment this out?
    }

    /**
     * @dev Function called once `checkUpkeep` is returning `true`. 
     * It kicks off a Chainlink VRF call to get a random lottery winner.
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert Lottery__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_lotteryState));
        }

        closeLottery();
        requestVrfRandomNumber();
    }

    /**
     * @dev Function that Chainlink VRF node calls to send the money to the random lottery winner.
     */
    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        pickLotteryWinner(randomWords[0]);
    }

    function requestVrfRandomNumber() internal {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_vrfGasLane,
            i_vrfSubscriptionId,
            REQUEST_CONFIRMATIONS,
            i_vrfCallbackGasLimit,
            NUM_WORDS
        );

        emit LotteryWinnerRequested(requestId);
    }

    function pickLotteryWinner(uint256 randomNubmer) internal {
        uint256 winnerIndex = randomNubmer % s_players.length;
        address payable winner = s_players[winnerIndex];
        s_recentWinner = winner;
        s_players = new address payable[](0);
        openLottery();
        s_startTimestamp = block.timestamp;
        (bool transferSuccess, ) = winner.call{value: address(this).balance}(""); // transfer money to winner

        if (!transferSuccess) {
            revert Lottery__TransferToWinnerFailed(); 
        }

        emit LotteryWinnerPicked(winner);
    }

    function openLottery() internal {
        s_lotteryState = LotteryState.OPEN;
    }

    function closeLottery() internal {
        s_lotteryState = LotteryState.WINNER_CALCULATING;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getStartTimestamp() public view returns (uint256) {
        return s_startTimestamp;
    }

    function getDuration() public view returns (uint256) {
        return i_duration;
    }

    function getEntrancePrice() public view returns (uint256) {
        return i_entrancePrice;
    }

    function getPlayersCount() public view returns (uint256) {
        return s_players.length;
    }
}
