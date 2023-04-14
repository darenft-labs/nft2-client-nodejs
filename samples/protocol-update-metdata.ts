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
      url: process.env.URL || '',
    },
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    mnemonic: process.env.MNEMONIC,
  });

  const providerAddress = '0x5a1edbf8017fae540d6471f27e4b963f48b7fdc0';

  const schema = (await client.getProviderSchema(providerAddress))?.jsonSchema;

  console.log(JSON.stringify(schema));

  const nftAddr = '0xe714950ec8b8f3ccf8cde35eae95dc3387e091a5';
  const tokenId = '50401';
  const gameValue = {
    tag: 'hallu',
    level: 4,
    attack: 2.5,
  } as any;

  const update = await client.updateMetadata({
    nftContractAddress: nftAddr,
    tokenId,
    tokenData: gameValue,
    schema,
  });

  console.log(update);
}

main().catch(console.error);
