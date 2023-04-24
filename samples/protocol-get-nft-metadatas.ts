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
    version: process.env.VERSION || '',
  });

  const metadata = await client.getNFTMetadatas({
    contractAddress: '0xe714950ec8b8f3ccf8cde35eae95dc3387e091a5',
    tokenId: '50401',
    chainId: 97,
    providerAddress: '0x5a1edbf8017fae540d6471f27e4b963f48b7fdc0',
  });

  console.log(JSON.stringify(metadata));
}

main().catch(console.error);
