import assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import nock from 'nock';
import {MockProvider} from 'ethereum-waffle';
import * as sinon from 'sinon';

import {Chain, ChainType, DareNFTClient, HOST_URL, validateData} from '../src';
import {BlockChainService} from '../src/protocol/services/blockchain.service';

describe('DareNFTClient blockchain', () => {
  const CODE = 'API_2';
  const accessToken = 'test_token_2';
  const chainType = ChainType.STAGING;
  const baseUrl = HOST_URL[chainType];
  let client: DareNFTClient;
  let blockchainService: BlockChainService;
  let sandbox: sinon.SinonSandbox;

  before(async () => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    const provider = new MockProvider();
    const wallets = provider.getWallets();

    client = new DareNFTClient({
      opts: {
        apiKey: CODE,
        chainType,
      },
      chainId: Chain.BSC_TESTNET,
      privateKey: wallets[0].privateKey,
    });

    blockchainService = client.blockchain;
    blockchainService.signer = wallets[0];
  });

  afterEach(async () => {
    nock.cleanAll();
    sandbox.restore();
  });

  it('should be failed with if passing wrong data type', done => {
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

    const tokenData = {
      tag: 'demo',
      level: '9999999999999999',
      attack: '2384728934728935.666999',
    } as any;

    const valid = validateData(schema, tokenData);

    assert.deepEqual(valid, false);

    done();
  });

  it('should be compatible with big number', done => {
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

    const tokenData = {
      tag: 'demo',
      level: 9999999999999999,
      attack: 2384728934728935.666999,
    } as any;

    const valid = validateData(schema, tokenData);

    assert.deepEqual(valid, true);
    done();
  });

  it('should get data for update metadata', async () => {
    const contractAddress = '0x7bebca6b07172a71e7e591f04521db812db78aa8';
    const tokenId = '0';

    const {chainId, signer} = blockchainService;

    const tokenData = {
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

    const gameValue = JSON.parse(JSON.stringify(tokenData));
    const nftData = JSON.parse(JSON.stringify(tokenData));

    const payload = {
      tokenId,
      nftContractAddress: contractAddress,
      providerAddress: signer.address,
      chainId,
      providerSignature:
        '0xa7ecce0deafcf7d1a6b71ac502a8cff4b8463c35d571acc0206588179a32fd8973bc0845e505af52af649bf0c27bfbe7f89a0b5e86ca15f1c73b566a07526b5f1c',
      dataKeys: [
        '0x17ec8597ff92C3F44523bDc65BF0f1bE632917ff977210800000000000000000',
        '0x17ec8597ff92C3F44523bDc65BF0f1bE632917ffd7fe74ba0100000000000000',
        '0x17ec8597ff92C3F44523bDc65BF0f1bE632917ff46d1af420000000000000000',
      ],
      dataValues: [
        '0x9081e45267ccb7aa6ac7531864da5cc3225c041e94ea08074dfd92b86b41758200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000464656d6f00000000000000000000000000000000000000000000000000000000',
        '0x16e0b4f27c2d744b48eb8f3e50f0d12728011f49a5d2d2f512f83facac37afc40000000000000000000000000000000000000000000000000000000000000002',
        '0x19fa252543c616913cbb0724dc3ff165e9457ba9957da00b371572d6466f301e0000000000000000000000000000000000000000000000000f43fc2c04ee0000',
      ],
    };

    const serverResult = {
      ...payload,
      rootSignature: 'test-root-sig',
    };

    const scopes = [
      nock(baseUrl)
        .persist()
        .post(`/auth/api-key/${CODE}`, undefined)
        .reply(200, {accessToken: accessToken, expiresIn: 1}),
      nock(baseUrl)
        .get(
          `/v1/client/chains/nonce?contract_address=${contractAddress}&chain_id=${chainId}&provider_address=${signer.address}&token_id=${tokenId}`
        )
        .reply(200, {
          nonce: '291',
        }),
      nock(baseUrl)
        .post('/v1/client/nfts/update-metadata', {
          ...payload,
          nftData,
        })
        .reply(200, serverResult),
    ];

    const result = await client.nftMetadata.updateMetadata({
      nftContractAddress: contractAddress,
      tokenId,
      tokenData: gameValue,
      schema,
    });
    scopes.forEach(s => s.done());
    scopes[0].persist(false);

    assert.deepEqual(serverResult, result);
  });
});
