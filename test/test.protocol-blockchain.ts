import assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import nock from 'nock';
import * as sinon from 'sinon';
import {BigNumber} from 'ethers';
import {MockProvider, deployMockContract} from 'ethereum-waffle';

import {ChainType, ProtocolClient} from '../src';
import GeneralNFTABI from '../src/protocol/abis/general-nft.abi.json';

nock.disableNetConnect();

describe('protocolclient blockchain', () => {
  const CODE = 'SOME_CODE';
  const baseUrl = 'https://protocol-stg.dareplay.io';
  const rpcUrl = 'http://localhost:8545';

  const chainType = ChainType.STAGING;

  describe(__filename, () => {
    let client: ProtocolClient;
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
      const provider = new MockProvider();
      const wallets = provider.getWallets();

      client = new ProtocolClient({
        opts: {
          apiKey: CODE,
          chainType,
        },
        rpcUrl: rpcUrl,
        privateKey: wallets[0].privateKey,
      });

      client.signer = wallets[0];

      sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
      nock.cleanAll();
      sandbox.restore();
    });

    it('should get data for update metadata', async () => {
      const contractAddress = '0x7bebca6b07172a71e7e591f04521db812db78aa8';
      const tokenId = '0';

      const {chainId} = await client.signer.provider.getNetwork();

      const mockNFTContract = await deployMockContract(
        client.signer,
        GeneralNFTABI,
        {
          address: contractAddress,
        }
      );

      assert.deepEqual(mockNFTContract.address, contractAddress);

      const newChannel = tokenId;

      await mockNFTContract.mock.getNonce
        .withArgs(client.signer.address, newChannel)
        .returns(BigNumber.from('0x123'));

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
        providerAddress: client.signer.address,
        chainId,
        providerSignature:
          '0x126811bec1d5d10c74403b560bc2c153287927b84c280b7087ff9c358670726e38bef963c287da1f1c90a319444eceb094d53e852f809201b40e230d20ace18e1c',
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
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock(baseUrl)
          .post('/v1/client/nfts/update-metadata', {
            ...payload,
            nftData,
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
