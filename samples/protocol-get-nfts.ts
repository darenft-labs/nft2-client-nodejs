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
      chainType: parseInt(process.env.CHAIN || '1'),
    },
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    mnemonic: process.env.MNEMONIC,
  });

  const result = await client.getNFTs({
    filter: {
      ownerAddress: '0x5a1edbf8017fae540d6471f27e4b963f48b7fdc0',
    },
    limit: 10,
    offset: 0,
  });

  console.log(JSON.stringify(result));
}

main().catch(console.error);
