# Decentralized Lottery Hardhat

[![DEL](https://circleci.com/gh/v7m/decentralized-lottery-hardhat.svg?style=shield)](https://app.circleci.com/pipelines/github/v7m/decentralized-lottery-hardhat)

> *This is an educational project with the purpose of acquiring hands-on experience in web3 application development using smart contracts written in Solidity.*

The Decentralized Lottery project consists of 2 parts:

[Hardhat App](https://github.com/v7m/decentralized-lottery-hardhat): This component is responsible for managing smart contracts and includes deployment scripts, using the popular development environment for Ethereum smart contracts.

[Next.js App](https://github.com/v7m/decentralized-lottery-nextjs): This part serves as the frontend of the application and interacts with on-chain logic within the Ethereum ecosystem.

# Description

The **Decentralized Lottery** is a blockchain-based lottery system. It integrates Chainlink's Verifiable Random Function (VRF) to ensure fair and random winner selection, Chainlink's Automation for triggers lottery ending, and includes features for player management, automated lottery upkeep, and secure prize distribution. The contract governs entry rules, maintains the lottery's operational state, and handles the drawing and announcement of winners in an autonomous and transparent manner.

## Built with:
- Solidity
- Chainlink (VRF, Automation)
- Hardhat
- Ethers.js
- Next.js
- Moralis
- IPFS

## Smart contract addresses:

- `Lottery`: [0xE386385CBF96735f4dB76F0D7498Ae3d821175Ac](https://sepolia.etherscan.io/address/0xE386385CBF96735f4dB76F0D7498Ae3d821175Ac)

# Getting Started

```
git clone https://github.com/v7m/decentralized-lottery-hardhat.git
cd decentralized-lottery-hardhat
yarn
```

# Usage

## Deploy:

```
yarn hardhat deploy
```

## Testing

```
yarn hardhat test
```

### Test Coverage

```
yarn hardhat coverage
```

# Linting

To check linting:
```
yarn hardhat check
```

# Deployment to a testnet (Sepolia)

1. Setup environment variables

To get started, configure the following environment variables, `SEPOLIA_RPC_URL` `and PRIVATE_KEY`. You can store them in a `.env` file, similar to the example provided in `.env.example`.

- `PRIVATE_KEY`: This should be the private key associated with your account. **NOTE:** For development purposes, please use a key that doesn't contain any real funds.
- `SEPOLIA_RPC_URL`: This is the URL of the Sepolia testnet node you're using. You can set up a free testnet node with [Alchemy](https://alchemy.com/?a=673c802981).

2. Obtain testnet ETH

Visit [faucets.chain.link](https://faucets.chain.link/) to acquire some testnet `ETH` and `LINK`. Your newly acquired `ETH` and `LINK` will appear in your Metamask wallet.

3. Setup a Chainlink VRF subscription ID

Go to [vrf.chain.link](https://vrf.chain.link/) and create a new subscription to obtain a subscription ID. If you already have one, you can reuse it. If you need guidance, you can follow the provided instructions [here](https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number). After this step, you should have:

1. A subscription ID
2. Your subscription should be funded with LINK
3. Deploy

Add your `SEPOLIA_SUBSCRIPRION_ID` to `.env` file.

Then run:
```
yarn hardhat deploy --network sepolia
```

And copy / remember the contract address.

4. Add your contract address as a Chainlink VRF Consumer

Return to [vrf.chain.link](https://vrf.chain.link), and within your subscription, locate the option to `Add consumer` and insert your contract address. Additionally, ensure that the contract is funded with a minimum of 2 `LINK` tokens.

5. Register a Chainlink Keepers Automation

[Documentation](https://docs.chain.link/chainlink-automation/guides/compatible-contracts)

Go to [automation.chain.link](https://automation.chain.link/new) and register a new upkeep. Select `Custom logic` as your trigger mechanism for automation, and make sure to fund the contract with a minimum of 8 `LINK` tokens.

6. Enter lottery

Your contract is now configured as a tamper-proof, autonomously verifiable random lottery. Enter the lottery by running:

```
yarn hardhat run scripts/enter.js --network sepolia
```

## Estimate GAS cost in USD

Next, remove the comment from the line `coinmarketcap: COINMARKETCAP_API_KEY` in your `hardhat.config.js` to enable USD estimation. However, please be aware that every time you run your tests, it will consume an API call. Thus, so it might make sense to keep CoinMarketCap disabled until it's required, which can be done by commenting the line again.

## Verify on Etherscan

If you're deploying to a testnet or the mainnet, you can enable contract verification by obtaining an [API Key](https://etherscan.io/myapikey) from Etherscan and configuring it as an environment variable called `ETHERSCAN_API_KEY`. Simply place it in your `.env` file following the example in `.env.example`.

As it stands, having your API key configured will enable automatic verification of Sepolia contracts.

However, you can manual verify with:

```
yarn hardhat verify --constructor-args arguments.js <DEPLOYED_CONTRACT_ADDRESS>
```
