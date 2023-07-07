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

  const result = await client.nft.getNFTDetails([
    {
      contractAddress: '0xd78ea36059726a0c73c662cf759b120ffc281d34',
      tokenId: '1',
      chainId: 97,
    },
  ]);

  console.log(JSON.stringify(result));
}

main().catch(console.error);
