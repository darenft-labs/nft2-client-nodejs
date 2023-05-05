import assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import nock from 'nock';
import * as sinon from 'sinon';
import {BigNumber} from 'ethers';
import {MockProvider, deployMockContract} from 'ethereum-waffle';

import {ChainType, ProtocolClient} from '../src';
import {PROTOCOL_CONTRACTS, getChannel} from '../src/protocol/blockchain';
import ManagerFixtureABI from '../src/protocol/abis/manager-fixture.abi.json';
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

      PROTOCOL_CONTRACTS[chainId] = {
        keyManagerAddr: '0xcbd0225f225e8b7907a70be88dc34752b47a5b86',
      };

      const mockManagerContract = await deployMockContract(
        client.signer,
        ManagerFixtureABI,
        {
          address: PROTOCOL_CONTRACTS[chainId].keyManagerAddr,
        }
      );

      assert.deepEqual(
        mockManagerContract.address,
        PROTOCOL_CONTRACTS[chainId].keyManagerAddr
      );

      const newChannel = getChannel(contractAddress, tokenId);

      await mockManagerContract.mock.getNonce
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

      const mockNFTContract = await deployMockContract(
        client.signer,
        GeneralNFTABI,
        {
          address: contractAddress,
        }
      );

      assert.deepEqual(mockNFTContract.address, contractAddress);

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

      const scopes = [
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock(baseUrl)
          .post('/v1/client/nfts/update-metadata', {
            tokenId,
            nftContractAddress: contractAddress,
            providerAddress: client.signer.address,
            chainId,
            metadata: {
              calls: [
                {
                  target: '0x7bebca6b07172a71e7e591f04521db812db78aa8',
                  data: '0xbb3e5e300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000317ec8597ff92c3f44523bdc65bf0f1be632917ff97721080000000000000000017ec8597ff92c3f44523bdc65bf0f1be632917ffd7fe74ba010000000000000017ec8597ff92c3f44523bdc65bf0f1be632917ff46d1af420000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000a09081e45267ccb7aa6ac7531864da5cc3225c041e94ea08074dfd92b86b41758200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000464656d6f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004016e0b4f27c2d744b48eb8f3e50f0d12728011f49a5d2d2f512f83facac37afc40000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004019fa252543c616913cbb0724dc3ff165e9457ba9957da00b371572d6466f301e0000000000000000000000000000000000000000000000000f43fc2c04ee0000',
                },
              ],
              nonces: [{type: 'BigNumber', hex: '0x0123'}],
              signatures: [
                '0xffc079d735e9ae0507f52f499465e3e206040470435e848bc575e2296a8fdd0632da88291e6188375abbfe9ad9d1926a9deae0805228e82355b8d2b8ebae57f11b',
              ],
            },
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
