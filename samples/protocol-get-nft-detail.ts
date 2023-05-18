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

  const nft = await client.nft.getNFTDetail({
    contractAddress: '0xfe7c7711c02a1d9f4c73a702fc6890ac48aafad7',
    tokenId: '0',
    chainId: 97,
  });

  console.log('nft', JSON.stringify(nft));
}

main().catch(console.error);
