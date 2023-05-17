# nft2-sdk

This is DareNFT 2.0 Protocol's officially supported node.js client library.

[![License](https://img.shields.io/npm/l/@cosmostation/cosmosjs.svg)](https://www.npmjs.com/package/@darenft/nft2-client)

## Quick start

Install the sdk

```
yarn add @darenft/nft2-client
```

# Contact us for more information

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
