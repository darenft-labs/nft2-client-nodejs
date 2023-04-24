import * as dotenv from 'dotenv';
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

  const providerAddress = '0xf93331c32b85d5783e5628a50c36c6ccb7c92d26';

  const schema = (await client.getProviderSchema(providerAddress))?.jsonSchema;

  console.log(JSON.stringify(schema));
}

main().catch(console.error);
