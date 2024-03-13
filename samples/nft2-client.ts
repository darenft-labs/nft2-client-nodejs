import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});
import {NFT2Client} from '../src/nft2client';
import {buildPreDefineMerkleTree} from '../src';

async function main() {
  const nft2Client = testClient();

  await nft2Client.initialize().then(() => {
    console.log('Client init success: ', nft2Client);
  });

  // await testAPIProtocol(nft2Client);
  testMerkleTree();
}

const testClient = () => {
  const apiKey = process.env.API_KEY || '';
  const nft2Client = new NFT2Client(apiKey);
  return nft2Client;
};

const testContract = async (nft2Client: NFT2Client) => {
  const bnbContract = nft2Client.getNFT2Contract(97);
  const nfts = await bnbContract.getNFTInfo(
    '0xca3991a64c99248085f354f05a8add010881fb9e',
    '7'
  );
  console.log('nft: ', nfts);
};

const testDataRegistry = async (nft2Client: NFT2Client) => {
  const dataRegistry = nft2Client.getNFT2DataRegistry(97);
  const datas = await dataRegistry.getNFTMetaData(
    '0x89033a07b597653b744e4639e7bd78701853df69',
    '0'
  );
  console.log('datas: ', datas);
};

const testAPIProtocol = async (nft2Client: NFT2Client) => {
  const apiProtocol = nft2Client.getAPIService();

  const datas = await apiProtocol.generatePresignedImage({
    files: [
      {
        fileName: 'file1.xyz',
        mimeType: 'image/png',
      },
      {
        fileName: 'file2.abc',
        mimeType: 'image/jpeg',
      },
    ],
  });
  console.log('datas: ', datas);
};

const testMerkleTree = () => {
  const data = buildPreDefineMerkleTree([
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
