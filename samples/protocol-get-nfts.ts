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

  const result = await client.nft.getNFTs({
    filter: {
      ownerAddress: '0x5a1edbf8017fae540d6471f27e4b963f48b7fdc0',
    },
    limit: 10,
    offset: 0,
  });

  console.log(JSON.stringify(result));
}

main().catch(console.error);
