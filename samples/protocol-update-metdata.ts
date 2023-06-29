import * as dotenv from 'dotenv';
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
    // mnemonic: process.env.MNEMONIC,
    privateKey: process.env.PRIVKEY,
    chainId: Chain.BSC_TESTNET,
  });

  const schema = {
    type: 'object',
    properties: {
      tag: {type: 'string'},
      level: {type: 'integer', bigNumber: true},
      attack: {type: 'number', bigNumber: true},
    },
  };

  const nftAddr = '0xe8125dcd6c0e1b7d619f489cc763199889600084';
  const tokenId = '3';
  const gameValue = {tag: 'test', level: 1, attack: 2.5} as any;

  const update = await client.nftMetadata.updateMetadata({
    nftContractAddress: nftAddr,
    tokenId,
    tokenData: gameValue,
    schema,
  });

  console.log(update);
}

main().catch(console.error);
