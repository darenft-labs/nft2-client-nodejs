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

  const providers = await client.nft.getNFTTransactionHistory({
    filter: {
      contractAddress: '0x58078b56d7a1b70d86f076c7adf8a857b6547758',
      tokenId: '2',
      chainId: 97,
    },
    limit: 20,
    offset: 0,
  });

  console.log(providers);
}

main().catch(console.error);
