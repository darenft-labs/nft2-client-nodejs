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
      contractAddress: '0xd34a3a5d3dee29b74d20c6a38b047b181ca8538e',
      chainId: 97,
    },
    size: 10,
    offset: 0,
  });

  console.log(result);
}

main().catch(console.error);
