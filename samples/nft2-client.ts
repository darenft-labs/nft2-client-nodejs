import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});
import {NFT2Client} from '../src/nft2client';

async function main() {
  const nft2Client = testClient();

  await nft2Client.initialize().then(() => {
    console.log('Client init success: ', nft2Client);
  });

  await testContract(nft2Client);
}

const testClient = () => {
  const apiKey = process.env.API_KEY || '';
  const nft2Client = new NFT2Client(apiKey);
  return nft2Client;
};

const testContract = async (nft2Client: NFT2Client) => {
  const bnbContract = nft2Client.getNFT2Contract(97);
  const nfts = await bnbContract.getNFTsByOwner(
    '0xC90146E70c9B2bf2f2B7Fe14979E73637C40fE4D',
    {limit: 10, offset: 0, filter: {isDerivative: true}}
  );
  console.log('nft: ', nfts.nfts);
};

const testDataRegistry = async (nft2Client: NFT2Client) => {
  const dataRegistry = nft2Client.getNFT2DataRegistry(97);
  const datas = await dataRegistry.getNFTMetaData(
    '0x89033a07b597653b744e4639e7bd78701853df69',
    '0'
  );
  console.log('datas: ', datas);
};

main().catch(console.error);
