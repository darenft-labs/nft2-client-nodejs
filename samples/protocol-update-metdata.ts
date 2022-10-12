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

  const schema = (
    await client.getNFTMetadataConfig(
      '0xd3524648ec627fb28216ebd2424ccbecafb6f9c9'
    )
  )?.schema;

  console.log(schema);

  const nftAddr = '0xd3524648ec627fb28216ebd2424ccbecafb6f9c9';
  const tokenId = '1';
  const gameValue = {
    level: ethers.BigNumber.from(10).toString(),
    star: ethers.BigNumber.from(200).toString(),
    title: 'demo',
    xyz: [1, 2, 3],
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
