import * as dotenv from 'dotenv';
import {ethers} from 'ethers';
dotenv.config({
  path: __dirname + '/.env',
});

import {ProtocolClient} from '../src';

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
