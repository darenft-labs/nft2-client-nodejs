import * as dotenv from 'dotenv';
import {ethers} from 'ethers';
dotenv.config({
  path: __dirname + '/.env',
});

import {Chain, DareNFTClient} from '../src';

async function main() {
  const client = new DareNFTClient({
    opts: {
      apiKey: process.env.API_KEY || '',
      chainType: parseInt(process.env.CHAIN || '1'),
    },
    chainId: Chain.BSC_TESTNET,
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
