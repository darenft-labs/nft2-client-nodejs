import assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import nock from 'nock';
import {Wallet} from 'ethers';
import * as sinon from 'sinon';

import {ChainType, DareNFTClient, Chain, HOST_URL} from '../src';
import {buildURLQuery} from '../src/protocol/utils';

describe('DareNFTClient', () => {
  const CODE = 'API_1';
  const accessToken = 'test_token_1';

  const mnemonic = Wallet.createRandom().mnemonic.phrase;

  const chainType = ChainType.STAGING;
  const baseUrl = HOST_URL[chainType];

  let client: DareNFTClient;
  let sandbox: sinon.SinonSandbox;

  before(async () => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    client = new DareNFTClient({
      opts: {
        apiKey: CODE,
        chainType,
      },
      chainId: Chain.BSC_TESTNET,
      mnemonic: mnemonic,
    });
  });

  afterEach(async () => {
    nock.cleanAll();
    sandbox.restore();
  });

  it('should get token detail', async () => {
    const contractAddress = '0xe714950ec8b8f3ccf8cde35eae95dc3387e091a5';
    const tokenId = '1';
    const chainId = 97;

    const nftInfo = {
      name: 'Dusk',
      description: 'Descriptionnnnnnnn',
      tokenId: '0',
      chainId: 97,
      creatorAddress: '0xb60dd7af47691ff70b6396e832d86a8ac3751303',
      ownerAddress: '0xb60dd7af47691ff70b6396e832d86a8ac3751303',
      imageUrl:
        'https://dareplay-public-2.s3.amazonaws.com/dareprotocol/download-d1c4cf02-ec44-4ede-8255-25f814b0058d.png',
      tokenUri:
        'https://protocol-stg.dareplay.io/nfts/uri/eefab270-75b6-47ab-b08e-f476ae79edb1',
      type: 0,
      royalties: '0.0000000000',
      status: 0,
      mintedAt: '2023-04-27T04:02:40.000Z',
      closeAt: null,
      openAt: null,
      nftContractAddress: '0x6357c915a765441bf6a5e91139e727f0fcc8c705',
      nftContract: {
        name: 'mor27',
        symbol: 'mor',
        description: null,
        contractAddress: '0x6357c915a765441bf6a5e91139e727f0fcc8c705',
        creatorAddress: '0xb60dd7af47691ff70b6396e832d86a8ac3751303',
        ownerAddress: '0xb60dd7af47691ff70b6396e832d86a8ac3751303',
        originalNFTContractAddress: null,
        originalTokenId: null,
        parentNFTContractAddress: null,
        parentTokenId: null,
        chainId: 97,
        imageUrl: null,
        contractVersion: 2,
        type: 0,
        royaltyRate: null,
        deployedAt: '2023-04-27T04:01:52.000Z',
      },
    };

    const scopes = [
      nock(baseUrl).post(`/auth/api-key/${CODE}`, undefined).reply(200, {
        accessToken: accessToken,
        expiresIn: 1,
      }),
      nock(baseUrl)
        .get(
          `/v1/client/nfts/${tokenId}?contract_address=${contractAddress}&chain_id=${chainId}`
        )
        .reply(200, nftInfo),
    ];

    const nft = await client.nft.getNFTDetail({
      contractAddress,
      tokenId,
      chainId,
    });
    scopes.forEach(s => s.done());

    assert.deepEqual(nft, nftInfo);
  });

  it('should get nft metadata', async () => {
    const metadata = {
      attack: 1.1,
    };

    const scopes = [
      nock(baseUrl).post(`/auth/api-key/${CODE}`, undefined).reply(200, {
        accessToken: accessToken,
        expiresIn: 1,
      }),
      nock(baseUrl)
        .get(
          '/v1/client/nfts/50401/metadatas?contract_address=0xe714950ec8b8f3ccf8cde35eae95dc3387e091a5&chain_id=97&provider_address=0x5a1edbf8017fae540d6471f27e4b963f48b7fdc0'
        )
        .reply(200, metadata),
    ];

    const result = await client.nft.getNFTMetadatas({
      contractAddress: '0xe714950ec8b8f3ccf8cde35eae95dc3387e091a5',
      tokenId: '50401',
      chainId: 97,
      providerAddress: '0x5a1edbf8017fae540d6471f27e4b963f48b7fdc0',
    });
    scopes.forEach(s => s.done());

    assert.deepEqual(result, metadata);
  });

  it('should get nft providers', async () => {
    const actualResult = {
      items: [
        {
          name: 'Game Provider 1',
          description: null,
          providerAddress: '0xf93331c32b85d5783e5628a50c36c6ccb7c92d26',
          providerType: null,
          url: null,
        },
        {
          name: 'Game Provider 3',
          description: null,
          providerAddress: '0xe6baffdef4e9df674be916d6e076e4887a781d07',
          providerType: null,
          url: null,
        },
        {
          name: 'Game Provider 2',
          description: null,
          providerAddress: '0x5adba054a64ed79bef659f55dfdb874715e79e5d',
          providerType: null,
          url: null,
        },
      ],
      total: 3,
    };
    const scopes = [
      nock(baseUrl).post(`/auth/api-key/${CODE}`, undefined).reply(200, {
        accessToken: accessToken,
        expiresIn: 1,
      }),
      nock(baseUrl)
        .get(
          '/v1/client/nfts/0/providers?contract_address=0x6357c915a765441bf6a5e91139e727f0fcc8c705&chain_id=97&limit=10&offset=0'
        )
        .reply(200, actualResult),
    ];

    const result = await client.nft.getNFTProviders({
      contractAddress: '0x6357c915a765441bf6a5e91139e727f0fcc8c705',
      tokenId: '0',
      chainId: 97,
      limit: 10,
      offset: 0,
    });
    scopes.forEach(s => s.done());

    assert.deepEqual(result, actualResult);
  });

  it('should get nft transactions', async () => {
    const actualResult = {
      items: [
        {
          eventType: 'nft2_royalty_changed',
          tokenId: '2',
          chainId: 97,
          nftContractAddress: '0x73a81082556853347ea41b30a0730117ea7a3e53',
          txHash:
            '0xd8d3af9ef289d7e5059c63ef8edc680300d310ca95566fb60e375b04e112cc74',
          blockNumber: 29497251,
          txIndex: 11,
          logIndex: 16,
          timestamps: 1683183728,
          fromAddress: null,
          toAddress: null,
        },
      ],
      total: 1,
    };

    const inputParams = {
      filter: {
        contractAddress: '0x6357c915a765441bf6a5e91139e727f0fcc8c705',
        tokenId: '50401',
        chainId: 97,
      },
      limit: 10,
      offset: 0,
    };

    const params = buildURLQuery(inputParams);

    const scopes = [
      nock(baseUrl).post(`/auth/api-key/${CODE}`, undefined).reply(200, {
        accessToken: accessToken,
        expiresIn: 1,
      }),
      nock(baseUrl)
        .get(`/v1/client/transactions${params}`)
        .reply(200, actualResult),
    ];

    const result = await client.nft.getNFTTransactionHistory(inputParams);
    scopes.forEach(s => s.done());

    assert.deepEqual(result, actualResult);
  });

  it('should get provider schema', async () => {
    const actualResult = {
      name: 'Game 1',
      version: 1,
      jsonSchema: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
          },
          level: {
            type: 'integer',
            bigNumber: true,
          },
          attack: {
            type: 'number',
            bigNumber: true,
          },
        },
      },
      status: 1,
      publishedAt: null,
      provider: {
        name: 'Game Provider 1',
        description: null,
        providerAddress: '0xf93331c32b85d5783e5628a50c36c6ccb7c92d26',
        providerType: null,
        url: null,
      },
      createdAt: '2023-04-21T10:44:52.221Z',
      updatedAt: '2023-04-21T10:44:52.221Z',
    };
    const scopes = [
      nock(baseUrl).post(`/auth/api-key/${CODE}`, undefined).reply(200, {
        accessToken: accessToken,
        expiresIn: 1,
      }),
      nock(baseUrl)
        .get(
          '/v1/client/nft-schemas/0xf93331c32b85d5783e5628a50c36c6ccb7c92d26'
        )
        .reply(200, actualResult),
    ];

    const result = await client.provider.getProviderSchema(
      '0xf93331c32b85d5783e5628a50c36c6ccb7c92d26'
    );
    scopes.forEach(s => s.done());

    assert.deepEqual(result, actualResult);
  });
});
