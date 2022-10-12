# nft2-sdk

This is DareNFT 2.0 Protocol's officially supported node.js client library.

[![License](https://img.shields.io/npm/l/@cosmostation/cosmosjs.svg)](https://www.npmjs.com/package/@darenft/nft2-client)

## Quick start

Install the sdk

```
yarn add @darenft/nft2-client
```

Update nft metadata

```js
const {ProtocolClient} = require('@darenft/nft2-client');
const {ethers} = require('ethers');
require('dotenv').config();

async function main() {
  const client = new ProtocolClient({
    opts: {
      apiKey: process.env.API_KEY || '',
      url: 'https://protocol-stg.dareplay.io',
    },
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    mnemonic: process.env.MNEMONIC,
  });

  const schema = (
    await client.getNFTMetadataConfig(
      '0xd3524648ec627fb28216ebd2424ccbecafb6f9c9'
    )
  )?.schema;

  console.log(schema);

  const nftAddr = '0xd3524648ec627fb28216ebd2424ccbecafb6f9c9';
  const tokenId = '1';
  const gameValue = {
    level: ethers.BigNumber.from(10).toString(),
    star: ethers.BigNumber.from(200).toString(),
    title: 'demo',
    xyz: [1, 2, 3],
  };

  const update = await client.updateMetadata({
    nftContractAddress: nftAddr,
    tokenId,
    tokenData: gameValue,
    schema,
  });

  console.log(update);
}

main().catch(console.error);
```

Get NFT detail

```js
const {ProtocolClient} = require('@darenft/nft2-client');
require('dotenv').config();

async function main() {
  const client = new ProtocolClient({
    opts: {
      apiKey: process.env.API_KEY || '',
      url: 'https://protocol-stg.dareplay.io',
    },
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    mnemonic: process.env.MNEMONIC,
  });

  const nft = await client.getNFTDetail(
    '0xd3524648ec627fb28216ebd2424ccbecafb6f9c9',
    '1'
  );

  console.log(JSON.stringify(nft));
}

main().catch(console.error);
```

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
