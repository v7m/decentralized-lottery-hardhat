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

/**
 * @title Lottery
 * @dev A contract that represents a decentralized lottery system.
 */
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
    uint256 private immutable i_minEntrancePrice;
    uint256 private s_startTimestamp;
    address private s_recentWinner;
    address payable[] private s_players;
    LotteryState private s_lotteryState;
    mapping(address => uint256) private s_addressToPlayerAmount;

    event LotteryWinnerRequested(uint256 indexed requestId);
    event PlayerEnterLottery(address indexed player);
    event LotteryWinnerPicked(address indexed player);
    event LotteryOpened();
    event LotteryClosed();
    event LotteryStarted();

    /**
     * @dev Contract constructor.
     * @param vrfCoordinatorV2 The address of the VRF Coordinator contract.
     * @param vrfSubscriptionId The subscription ID for VRF randomness requests.
     * @param vrfGasLane The gas lane for VRF randomness requests.
     * @param vrfCallbackGasLimit The gas limit for VRF callback function.
     * @param duration The duration of the lottery.
     * @param minEntrancePrice The minimum entrance price for participants.
     */
    constructor(
        address vrfCoordinatorV2,
        uint64 vrfSubscriptionId,
        bytes32 vrfGasLane,
        uint32 vrfCallbackGasLimit,
        uint256 duration,
        uint256 minEntrancePrice
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_vrfSubscriptionId = vrfSubscriptionId;
        i_vrfGasLane = vrfGasLane;
        i_vrfCallbackGasLimit = vrfCallbackGasLimit;
        i_duration = duration;
        i_minEntrancePrice = minEntrancePrice;
        s_lotteryState = LotteryState.OPEN;
        s_startTimestamp = block.timestamp;
    }

    // External functions

    /**
     * @dev Allows a player to enter the lottery by sending a specified amount of Ether.
     */
    function enterLottery() external payable {
        if (msg.value < i_minEntrancePrice) {
            revert Lottery__TransactionAmountTooLow();
        }
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__LotteryTemporarilyClosed();
        }
        if (!isPlayerPresent(msg.sender)) {
            s_players.push(payable(msg.sender));
        }
        s_addressToPlayerAmount[msg.sender] += msg.value;
        emit PlayerEnterLottery(msg.sender);
        if (s_players.length == 1) {
            emit LotteryStarted();
        }
    }

    /**
     * @dev Performs the upkeep of the Lottery contract.
     * @notice This function is called by the Upkeep contract to perform necessary maintenance tasks.
     * It checks if upkeep is needed, and if so, closes the lottery and requests a VRF random number.
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
     * @dev Returns the average amount of the lottery prize per player.
     * @return The average amount of the lottery prize per player.
     */
    function getPlayersAmountAvg() external view returns(uint256) {
        if (s_players.length == 0) {
            return 0;
        }
        return getLotteryPrize() / s_players.length;
    }

    /**
     * @dev Retrieves the amount of tokens held by a specific player.
     * @param playerAddress The address of the player.
     * @return The amount of tokens held by the player.
     */
    function getGetPlayerAmount(address playerAddress) external view returns (uint256) {
        return s_addressToPlayerAmount[playerAddress];
    }

    /**
     * @dev Retrieves the current state of the lottery.
     * @return The current state of the lottery.
     */
    function getLotteryState() external view returns (LotteryState) {
        return s_lotteryState;
    }

    /**
     * @dev Retrieves the address of the most recent winner of the lottery.
     * @return The address of the most recent winner.
     */
    function getRecentWinner() external view returns (address) {
        return s_recentWinner;
    }

    /**
     * @dev Retrieves the address of a player at the specified index.
     * @param index The index of the player to retrieve.
     * @return The address of the player.
     */
    function getPlayer(uint256 index) external view returns (address) {
        return s_players[index];
    }

    /**
     * @dev Returns the start timestamp of the lottery.
     * @return The start timestamp as a uint256 value.
     */
    function getStartTimestamp() external view returns (uint256) {
        return s_startTimestamp;
    }

    /**
     * @dev Returns the duration of the lottery.
     * @return The duration of the lottery.
     */
    function getDuration() external view returns (uint256) {
        return i_duration;
    }

    /**
     * @dev Returns the minimum entrance price of the lottery.
     * @return The minimum entrance price of the lottery.
     */
    function getMinEntrancePrice() external view returns (uint256) {
        return i_minEntrancePrice;
    }

    /**
     * @dev Returns the number of players in the lottery.
     * @return The number of players in the lottery.
     */
    function getPlayersCount() external view returns (uint256) {
        return s_players.length;
    }

    /**
     * @dev Returns the number of words in the lottery.
     * @return The number of words.
     */
    function getNumWords() external pure returns (uint256) {
        return NUM_WORDS;
    }

    /**
     * @dev Returns the number of confirmations required for a request.
     * @return The number of confirmations required.
     */
    function getRequestConfirmations() external pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    // Public functions

    /**
     * @dev Checks if the lottery contract requires upkeep.
     * @return upkeepNeeded A boolean indicating whether upkeep is needed.
     * @return performData Unused parameter.
     */
    function checkUpkeep(
        bytes memory /* checkData */
    ) public view override returns (bool upkeepNeeded, bytes memory performData) {
        bool lotteryIsOpen = LotteryState.OPEN == s_lotteryState;
        bool lotteryIsOver = ((block.timestamp - s_startTimestamp) > i_duration);
        bool lotteryHasPlayers = s_players.length > 0;
        bool lotteryHasBalance = address(this).balance > 0;
        upkeepNeeded = (lotteryIsOpen && lotteryIsOver && lotteryHasPlayers && lotteryHasBalance);
        return (upkeepNeeded, "0x0");
    }

    /**
     * @dev Gets the current prize amount of the lottery.
     * @return The current prize amount.
     */
    function getLotteryPrize() public view returns (uint256) {
        return address(this).balance;
    }

    // Internal functions

    /**
     * @dev Callback function used by the VRF Coordinator to fulfill the random words request.
     * @param randomWords An array of random words generated by the VRF Coordinator.
     */
    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        sendPrizeToWinner(randomWords[0]);
    }

    /**
     * @dev Requests a random number from the VRF (Verifiable Random Function) service.
     */
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

    /**
     * @dev Sends the prize to the winner of the lottery.
     * @param randomNubmer The random number used to pick the winner.
     * @notice This function is internal and should only be called within the contract.
     */
    function sendPrizeToWinner(uint256 randomNubmer) internal {
        address payable winner = pickLotteryWinner(randomNubmer);
        s_recentWinner = winner;
        resetPlayers();
        openLottery();
        s_startTimestamp = block.timestamp;
        (bool transferSuccess, ) = winner.call{value: address(this).balance}(""); // transfer money to winner
        if (!transferSuccess) {
            revert Lottery__TransferToWinnerFailed(); 
        }
        emit LotteryWinnerPicked(winner);
    }

    /**
     * @dev Opens the lottery by changing the lottery state to OPEN.
     */
    function openLottery() internal {
        s_lotteryState = LotteryState.OPEN;
        emit LotteryOpened();
    }

    /**
     * @dev Closes the lottery and sets the lottery state to "WINNER_CALCULATING".
     */
    function closeLottery() internal {
        s_lotteryState = LotteryState.WINNER_CALCULATING;
        emit LotteryClosed();
    }

    /**
     * @dev Resets the players and their corresponding amounts in the lottery.
     */
    function resetPlayers() internal {
        for (uint256 playerIndex = 0; playerIndex < s_players.length; playerIndex++) {
            address player = s_players[playerIndex];
            s_addressToPlayerAmount[player] = 0;
        }
        s_players = new address payable[](0);
    }

    /**
     * @dev Checks if a player is present in the lottery.
     * @param _targetAddress The address of the player to check.
     * @return A boolean indicating whether the player is present or not.
     */
    function isPlayerPresent(address _targetAddress) internal view returns (bool) {
        return s_addressToPlayerAmount[_targetAddress] > 0;
    }

    /**
     * @dev Picks the winner of the lottery based on a random number.
     * @param randomNubmer The random number used to determine the winner.
     * @return winner - the address of the winner.
     */
    function pickLotteryWinner(uint256 randomNubmer) internal view returns(address payable winner) {
        uint256 randomAmountValue = randomNubmer % address(this).balance;
        uint256 amountRangeStart = 0;
        for (uint256 playerIndex = 0; playerIndex < s_players.length; playerIndex++) {
            address player = s_players[playerIndex];
            uint256 playerAmount = s_addressToPlayerAmount[player];
            uint256 amountRangeEnd = amountRangeStart + playerAmount;
            // If the random value falls within the player's amount range, return their address.
            if (randomAmountValue >= amountRangeStart && randomAmountValue < amountRangeEnd) {
                return s_players[playerIndex];
            }
            amountRangeStart = amountRangeEnd;
        }
    }
}
