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

  const metadata = await client.nft.getNFTMetadatas({
    contractAddress: '0xe714950ec8b8f3ccf8cde35eae95dc3387e091a5',
    tokenId: '50401',
    chainId: 97,
    providerAddress: '0x5a1edbf8017fae540d6471f27e4b963f48b7fdc0',
  });

  console.log(JSON.stringify(metadata));
}

main().catch(console.error);
