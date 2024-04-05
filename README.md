# nft2-sdk

This is DareNFT 2.0 Protocol's officially supported node.js client library.

[![License](https://img.shields.io/npm/l/@cosmostation/cosmosjs.svg)](https://www.npmjs.com/package/@darenft-labs/nft2-client)

## Installing

Install by yarn
```
yarn add @darenft-labs/nft2-client
```

or using npm
```
npm add @darenft-labs/nft2-client
```

**Note:** node version should be greater than 16.14

## Quick start

```js
import { NFT2Client } from "@darenft-labs/nft2-client";

const apiKey = 'xxx'; // must get from NT2 console 
const nft2Client = new NFT2Client(apiKey);

await nft2Client.initialize().then(() => {
    console.log('Client init success: ', nft2Client);
});
```

The SDK will automatic load configuration from API server (`GET: /configs/internal-config`). However, you can set your alternative configuration as you want:
```js
const configs: ChainConfig[] = [{
  chainId: 1,
  providerUrl: "https://eth-mainnet.nodereal.io/v1/xxx",
  factoryAddress: "0xabcd",
  subQueryEndpoint: "https://api.subquery.network/sq/xxx"
}]
nft2Client.updateConfig(configs)
```

Example get list NFTs of a wallet on Ether:
```js
const chainId = 1; // chain Ether
const nft2Contract = nft2Client.getNFT2Contract(chainId);

const nfts = await nft2Contract.getNFTsByOwner(ownerAddress, {limit: 20, offset: 0});
console.log('nft: ', nfts);
```

Example get NFT data saved on Data Registry:
```js
const chainId = 1; // chain Ether
const dataRegistry = nft2Client.getNFT2DataRegistry(chainId);

const datas = await dataRegistry.getNFTMetaData(
    '0xabcd', // NFT address
    '0' // token ID
);
console.log('datas: ', datas);
```

## Architecture

- [Class diagram](./docs/class-diagram.md)

## Run sample

Install libs
```
yarn install
```

Edit `.env` file in `/samples` folder
```
cp .env.example .env
```

Run 1 sample
```
yarn ts-node samples/[file_name].ts
```

## Run tests
```
yarn test -g protocolclient
```

Run with debug logging
```
yarn test-debug -g protocolclient
```

Testing a single file
```
yarn test-single test/xxx.ts
yarn test-debug test/
```
