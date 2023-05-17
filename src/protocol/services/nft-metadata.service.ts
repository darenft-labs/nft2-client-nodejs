import {Service} from 'typedi';
import {BigNumber} from 'ethers';

import {AuthService} from './auth.service';
import {BlockChainService} from './blockchain.service';
import {
  separateJsonSchema,
  encodeDataFromJsonSchema,
  encodeDataKey,
  validateData,
  getInfos,
} from '../utils';
import {
  NFTMetadataUpdateRequest,
  NFTMetadataUpdateResponse,
} from '../types/interfaces';

@Service()
export class NFTMetadataService {
  constructor(
    private authService: AuthService,
    private blockchainService: BlockChainService
  ) {}

  /**
   * Update NFT metadata.
   * @param data nft metadata info.
   */
  async updateMetadata(
    data: NFTMetadataUpdateRequest
  ): Promise<NFTMetadataUpdateResponse> {
    const {nftContractAddress, tokenData, tokenId, schema} = data;

    const originalTokenData = JSON.parse(JSON.stringify(tokenData));

    const {signer, nftContract, chainId} = await getInfos(
      this.blockchainService.signer,
      nftContractAddress
    );

    const providerAddress = signer.address;

    const valid = validateData(schema, tokenData);

    if (!valid) {
      throw new Error('Json schema not match data');
    }

    const schemas = separateJsonSchema(schema) as any;

    const dataKeys = schemas.map((e: any) => {
      return encodeDataKey(providerAddress, e.key);
    }) as string[];
    const dataValues = schemas.map((e: any) =>
      encodeDataFromJsonSchema(e, {
        [e.key]: tokenData[e.key],
      })
    ) as string[];

    const nonce = (await nftContract.getNonce(
      signer.address,
      tokenId
    )) as BigNumber;

    const verifiedSig = await signer._signTypedData(
      {
        name: 'ERC725Z2',
        version: '0.0.1',
        chainId,
        verifyingContract: nftContract.address,
      },
      {
        SetData: [
          {name: 'nonce', type: 'uint256'},
          {name: 'tokenId', type: 'uint256'},
          {name: 'dataKeys', type: 'bytes32[]'},
          {name: 'dataValues', type: 'bytes[]'},
        ],
      },
      {
        nonce,
        tokenId,
        dataKeys,
        dataValues,
      }
    );

    const body = {
      tokenId: tokenId,
      nftContractAddress: nftContractAddress,
      providerAddress,
      chainId: chainId,
      providerSignature: verifiedSig,
      nftData: originalTokenData,
      dataKeys,
      dataValues,
    };

    const result =
      await this.authService.auth.request<NFTMetadataUpdateResponse>({
        url: `${this.authService.getHostPath()}/client/nfts/update-metadata`,
        method: 'POST',
        data: JSON.stringify(body),
      });

    return result.data;
  }
}
