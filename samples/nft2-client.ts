import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});
import {NFT2Client} from '../src/nft2client';
import {utils} from '../src';

async function main() {
  const nft2Client = testClient();

  await nft2Client.initialize().then(() => {
    console.log('Client init success: ', nft2Client);
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
  const bnbContract = nft2Client.getNFT2Contract(43113);
  const nfts = await bnbContract.getNFTInfo(
    '0xe878aaabc4c4b1773c5888873d5bf464a0f71d6a',
    '1'
  );
  console.log('nft: ', nfts);
};

const testDataRegistry = async (nft2Client: NFT2Client) => {
  const dataRegistry = nft2Client.getNFT2DataRegistry(43113);
  const datas = await dataRegistry.getNFTProtocolMetaData(
    '0x8d6638c8b8e460c8bae91be5ee882ca26e3d6200',
    '0',
    '0x8790bd846c1bbe8757219e2397fe4783df336a22'
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
