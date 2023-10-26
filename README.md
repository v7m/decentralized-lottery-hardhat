# Decentralized Ethereum Lottery Hardhat

*The purpose of this project is to acquire hands-on experience in web3 application development.*

This app is a part of the Decentralized Ethereum Lottery project, designed for creating, testing, and deploying smart contracts. You can find the frontend part in the [Next.js Repo](https://github.com/v7m/decentralized-lottery-nextjs).


# Built with:
- Solidity
- Chainlink
- Hardhat
- Ethers.js
- Next.js
- Moralis
- IPFS

# Smart contracts (Sepolia)
[0xe59A431759a5a3C270Bba717C1E3dA350f090df4](https://sepolia.etherscan.io/address/0xe59A431759a5a3C270Bba717C1E3dA350f090df4)

# Getting Started

```
git clone https://github.com/v7m/decentralized-lottery-hardhat.git
cd decentralized-lottery-hardhat
yarn
```

# Usage

Deploy:

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

# Linting

To check linting / code formatting:
```
yarn lint
```
or, to fix:
```
yarn lint:fix
```
