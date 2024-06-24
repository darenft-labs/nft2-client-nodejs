import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});
import {NFT2Client} from '../src/nft2client';
import {utils} from '../src';

async function main() {
  const nft2Client = testClient();

  await nft2Client.initialize().then(() => {
    console.log('Client init success: ', nft2Client.dataRegistryMultichains);
  });

  await testDataRegistry(nft2Client);
  // testMerkleTree();
}

const testClient = () => {
  const apiKey = process.env.API_KEY || '';
  const apiEndpoint = process.env.API_ENDPOINT || '';
  const nft2Client = new NFT2Client(apiKey, apiEndpoint);
  return nft2Client;
};

const testContract = async (nft2Client: NFT2Client) => {
  const bnbContract = nft2Client.getNFT2ContractMultichain('testnet');
  const nfts = await bnbContract.getNFTInfoFromCached(
    43113,
    '0x6dd2fbb992cef092b4691ba786d7a7615ab915f9',
    '2'
    // {
    //   limit: 10,
    //   offset: 0,
    //   sort: {field: 'mintedAt', order: 'ASC'},
    //   filter: {isDerivative: true},
    // }
    // [97]
  );
  console.log('nft: ', nfts);
};

const testDataRegistry = async (nft2Client: NFT2Client) => {
  const dataRegistry = nft2Client.getNFT2DataRegistryMultichain('testnet');
  const datas = await dataRegistry.getNFTProtocolMetaDataFromCached(
    43113,
    '0x4022a9c81eb4835f602669de7f8b76f9f3a3650f',
    '0',
    '0xbdea4df162f786cf2fb17f4893431cabf27df10b'
    // {
    //   limit: 10,
    //   offset: 0,
    //   // sort: {field: 'registeredAt', order: 'ASC'},
    //   // filter: {isDerivative: true},
    // }
    // [97]
  );
  console.log('datas: ', datas);
};

const testAPIProtocol = async (nft2Client: NFT2Client) => {
  const apiProtocol = nft2Client.getAPIService();

  const datas = await apiProtocol.getTokenBalancesOfWallet(
    97,
    '0xCa4597167270D2AD6931C35DEA4c59837E1A9E74'
  );
  console.log('datas: ', datas);
};

const testMerkleTree = () => {
  const data = utils.buildPreDefineMerkleTree([
    {
      tokenId: 5,
      tokenUri: 'token_uri_1',
    },
    {
      tokenId: 4,
      tokenUri: 'token_uri_2',
    },
    {
      tokenId: 3,
      tokenUri: 'token_uri_3',
    },
    {
      tokenId: 2,
      tokenUri: 'token_uri_4',
    },
  ]);

  console.log('data: ', data);
};

main().catch(console.error);
