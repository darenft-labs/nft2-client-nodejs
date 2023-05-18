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
    chainId: Chain.BSC_TESTNET,
    mnemonic: process.env.MNEMONIC,
  });

  const providerAddress = '0xf93331c32b85d5783e5628a50c36c6ccb7c92d26';

  const schema = (await client.provider.getProviderSchema(providerAddress))
    ?.jsonSchema;

  console.log(JSON.stringify(schema));
}

main().catch(console.error);
