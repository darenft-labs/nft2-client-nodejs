import * as dotenv from 'dotenv';
import {ethers} from 'ethers';
dotenv.config({
  path: __dirname + '/.env',
});

import {DareNFTClient} from '../src';

async function main() {
  const client = new DareNFTClient({
    opts: {
      apiKey: process.env.API_KEY || '',
      chainType: parseInt(process.env.CHAIN || '1'),
    },
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    mnemonic: process.env.MNEMONIC,
  });

  const result = await client.nft.getNFTTokenURIs([
    {
      contractAddress: '0xfe7c7711c02a1d9f4c73a702fc6890ac48aafad7',
      tokenId: '0',
      chainId: 97,
    },
  ]);

  console.log(JSON.stringify(result));
}

main().catch(console.error);
