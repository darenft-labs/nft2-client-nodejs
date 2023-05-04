import assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import nock from 'nock';
import * as sinon from 'sinon';
import {BigNumber, Wallet, ethers} from 'ethers';

import {ChainType, ProtocolClient} from '../src';
import {NFTDetailResponse} from '../src/protocol/interfaces';
import {buildURLQuery} from '../src/protocol/utils';

nock.disableNetConnect();

describe('protocolclient', () => {
  const CODE = 'SOME_CODE';
  const baseUrl = 'https://protocol-stg.dareplay.io';
  const rpcUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545';

  // Just for test
  const mnemonic =
    'sell nature comfort actual bridge glory priority shadow blue panel bicycle curious';

  const chainType = ChainType.STAGING;

  describe(__filename, () => {
    let client: ProtocolClient;
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
      client = new ProtocolClient({
        opts: {
          apiKey: CODE,
          chainType,
        },
        rpcUrl: rpcUrl,
        mnemonic: mnemonic,
      });
      sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
      nock.disableNetConnect();
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
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock(baseUrl)
          .get(
            `/v1/client/nfts/${tokenId}?contract_address=${contractAddress}&chain_id=${chainId}`
          )
          .reply(200, nftInfo),
      ];

      const nft = await client.getNFTDetail({
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
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock(baseUrl)
          .get(
            '/v1/client/nfts/50401/metadatas?contract_address=0xe714950ec8b8f3ccf8cde35eae95dc3387e091a5&chain_id=97&provider_address=0x5a1edbf8017fae540d6471f27e4b963f48b7fdc0'
          )
          .reply(200, metadata),
      ];

      const result = await client.getNFTMetadatas({
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
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock(baseUrl)
          .get(
            '/v1/client/nfts/0/providers?contract_address=0x6357c915a765441bf6a5e91139e727f0fcc8c705&chain_id=97&limit=10&offset=0'
          )
          .reply(200, actualResult),
      ];

      const result = await client.getNFTProviders({
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
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock(baseUrl)
          .get(`/v1/client/transactions${params}`)
          .reply(200, actualResult),
      ];

      const result = await client.getNFTTransactionHistory(inputParams);
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
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock(baseUrl)
          .get(
            '/v1/client/nft-schemas/0xf93331c32b85d5783e5628a50c36c6ccb7c92d26'
          )
          .reply(200, actualResult),
      ];

      const result = await client.getProviderSchema(
        '0xf93331c32b85d5783e5628a50c36c6ccb7c92d26'
      );
      scopes.forEach(s => s.done());

      assert.deepEqual(result, actualResult);
    });

    it('should get data for update metadata', async () => {
      const contractAddress = '0x7bebca6b07172a71e7e591f04521db812db78aa8';
      const tokenId = '0';
      const gameValue = {
        tag: 'demo',
        level: 2,
        attack: 1.1,
      } as any;

      const schema = {
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
      };

      const serverResult = {
        calls: [
          {
            target: '0x7bebca6b07172a71e7e591f04521db812db78aa8',
            data: '0xbb3e5e300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000003146f795b30a4ae2d1eeb537832f00843c2c5b845977210800000000000000000146f795b30a4ae2d1eeb537832f00843c2c5b845d7fe74ba0100000000000000146f795b30a4ae2d1eeb537832f00843c2c5b84546d1af420000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000a09081e45267ccb7aa6ac7531864da5cc3225c041e94ea08074dfd92b86b41758200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000464656d6f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004016e0b4f27c2d744b48eb8f3e50f0d12728011f49a5d2d2f512f83facac37afc40000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004019fa252543c616913cbb0724dc3ff165e9457ba9957da00b371572d6466f301e0000000000000000000000000000000000000000000000000f43fc2c04ee0000',
          },
        ],
        nonces: [
          {
            type: 'BigNumber',
            hex: '0x16b176805f1bd3a05aee0cb8e208d38100000000000000000000000000000000',
          },
        ],
        signatures: [
          '0x9828cf7c396d55b814fb5945d6ddc05d7eb25e72387c47db962ee7ecfe7568fc343e8e80666746d6dbc3e7003f27887311b4787411acda90bcfb91af78c3835f1b',
        ],
        rootSignature:
          '0x07c0aa363772ad813bd32944fbf10e99cb9921390a693144593cb945abe6e6ae118ebd59eaec650f905c7d70bf4a6816eb57d57cbbfb4bb8b07cb4c37b84b10a1b',
      };

      nock.enableNetConnect();
      const scopes = [
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock(baseUrl)
          .post('/v1/client/nfts/update-metadata', {
            tokenId: tokenId,
            nftContractAddress: contractAddress,
            providerAddress: '0x146f795B30a4ae2d1EEb537832F00843c2C5b845',
            chainId: 97,
            metadata: {
              calls: [
                {
                  target: '0x7bebca6b07172a71e7e591f04521db812db78aa8',
                  data: '0xbb3e5e300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000003146f795b30a4ae2d1eeb537832f00843c2c5b845977210800000000000000000146f795b30a4ae2d1eeb537832f00843c2c5b845d7fe74ba0100000000000000146f795b30a4ae2d1eeb537832f00843c2c5b84546d1af420000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000a09081e45267ccb7aa6ac7531864da5cc3225c041e94ea08074dfd92b86b41758200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000464656d6f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004016e0b4f27c2d744b48eb8f3e50f0d12728011f49a5d2d2f512f83facac37afc40000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004019fa252543c616913cbb0724dc3ff165e9457ba9957da00b371572d6466f301e0000000000000000000000000000000000000000000000000f43fc2c04ee0000',
                },
              ],
              nonces: [
                {
                  type: 'BigNumber',
                  hex: '0x16b176805f1bd3a05aee0cb8e208d38100000000000000000000000000000000',
                },
              ],
              signatures: [
                '0x9828cf7c396d55b814fb5945d6ddc05d7eb25e72387c47db962ee7ecfe7568fc343e8e80666746d6dbc3e7003f27887311b4787411acda90bcfb91af78c3835f1b',
              ],
            },
            nftData: {
              tag: 'demo',
              level: 2,
              attack: 1.1,
            },
          })
          .reply(200, serverResult),
      ];

      const result = await client.updateMetadata({
        nftContractAddress: contractAddress,
        tokenId,
        tokenData: gameValue,
        schema,
      });
      scopes.forEach(s => s.done());

      assert.deepEqual(serverResult, result);
    });
  });
});
