import {BigNumber, ethers, utils} from 'ethers';
import {getInfos, getSigner} from './blockchain';

import {
  separateJsonSchema,
  encodeDataFromJsonSchema,
  getPredictedMetadataAddress,
  encodeDataKey,
} from './utils';

import {OAuth2Client} from '../auth/oauth2client';
import {
  NFTMetadataConfig,
  NFTMetadataUpdateRequest,
  ProtocolClientOptions,
  NFTMetadataUpdateResponse,
  NFTDetailResponse,
} from './interfaces';

export class ProtocolClient {
  auth: OAuth2Client;
  rpcUrl: string;
  signer: ethers.Wallet;
  constructor(setting: ProtocolClientOptions) {
    this.auth = new OAuth2Client(setting.opts);

    this.rpcUrl = setting.rpcUrl;
    this.signer = getSigner(this.rpcUrl, {
      privateKey: setting?.privateKey,
      mnemonic: setting?.mnemonic,
    });
  }

  /**
   * Update NFT metadata.
   * @param data nft metadata info.
   */
  async updateMetadata(
    data: NFTMetadataUpdateRequest
  ): Promise<NFTMetadataUpdateResponse> {
    const {signer, managerFixture, templateFixture, factoryFixture, helper} =
      await getInfos(this.signer);
    const providerKey = signer.address;

    const {nftContractAddress, tokenData, tokenId, schema} = data;

    const schemas = separateJsonSchema(schema) as any;
    const predictedMetadataAddr = await getPredictedMetadataAddress(
      nftContractAddress,
      tokenId,
      helper,
      templateFixture,
      factoryFixture
    );
    const dataKeys = schemas.map((e: any) => {
      return encodeDataKey(providerKey, e.key);
    });
    const dataValues = schemas.map((e: any) =>
      encodeDataFromJsonSchema(e, {
        [e.key]: tokenData[e.key],
      })
    );

    const calls = [
      {
        target: predictedMetadataAddr,
        data: templateFixture.interface.encodeFunctionData(
          'setData(bytes32[],bytes[])',
          [dataKeys, dataValues]
        ),
      },
    ];
    const METADATA_UPDATE_CHANNEL = 3;
    const nonces = await Promise.all(
      calls.map(async c =>
        (
          (await managerFixture.getNonce(
            signer.address,
            METADATA_UPDATE_CHANNEL
          )) as BigNumber
        ).toString()
      )
    );
    const signatures = await Promise.all(
      nonces.map(async (nonce, idx) =>
        signer._signTypedData(
          {
            name: 'MetadataRelay',
            version: '0.0.1',
            chainId: (await managerFixture.provider.getNetwork()).chainId,
            verifyingContract: managerFixture.address,
          },
          {
            RelayHash: [
              {name: 'nonce', type: 'uint256'},
              {name: 'target', type: 'address'},
              {name: 'data', type: 'bytes'},
            ],
          },
          {
            nonce,
            target: calls[idx].target,
            data: calls[idx].data,
          }
        )
      )
    );

    const body = {
      tokenId: tokenId,
      nftContractAddress: nftContractAddress,
      metadata: {
        calls: calls,
        nonces: nonces,
        signatures: signatures,
      },
      tokenData: tokenData,
    };

    const result = await this.auth.request<NFTMetadataUpdateResponse>({
      url: `${this.auth.url}/protocols/update-metadata-nft`,
      method: 'POST',
      body: JSON.stringify(body),
    });

    return result.data;
  }

  async getNFTMetadataConfig(
    nftContractAddress: string
  ): Promise<NFTMetadataConfig> {
    const body = {
      nftContractAddress,
    };

    const result = await this.auth.request({
      url: `${this.auth.url}/protocols/get-nft-json-schema`,
      method: 'POST',
      body: JSON.stringify(body),
    });

    return result?.data as NFTMetadataConfig;
  }

  /**
   * @param nftContractAddress nft contract address
   * @param tokenId token id of nft
   * @returns nft detail info
   */
  async getNFTDetail(
    nftContractAddress: string,
    tokenId: string
  ): Promise<NFTDetailResponse> {
    const result = await this.auth.request<NFTDetailResponse>({
      url: `${this.auth.url}/nfts/${nftContractAddress}/id/${tokenId}`,
      method: 'GET',
    });

    return result?.data;
  }
}
