import {OAuth2Client} from '../auth/oauth2client';
import {
  ChainConfig,
  ChainConfigResponse,
  ClaimTokenUriInfoResponse,
  FreemintInfoResponse,
  JsonUriMetadata,
  PresignImageData,
  PresignedImageResponse,
  UploadJsonUriRespone,
} from '../types';

export class APIService {
  apiKey: string;
  apiEndpoint: string;
  authClient: OAuth2Client;

  constructor(apiKey: string, apiEndpoint?: string) {
    this.authClient = new OAuth2Client({
      apiKey,
      apiEndpoint,
    });
  }

  /**
   * @returns all chain config
   */
  async getChainConfigs(): Promise<ChainConfig[]> {
    const result = await this.authClient.request<ChainConfigResponse[]>({
      url: `${this.authClient.url}/configs/internal-config-v2`,
      method: 'GET',
    });

    if (!result.data) return [];

    return result.data.map(item => ({
      chainId: item.chainId,
      providerUrl: item.internalConfig.PROVIDER_URL,
      factoryAddress: item.internalConfig.NFT_FACTORY_ADDRESS,
      subQueryEndpoint: item.internalConfig.SUB_QUERY_ENDPOINT,
    }));
  }

  /**
   * @param chainId id of chain
   * @param contractAddress collection contract address
   * @param campaignId campaign id
   * @param walletAddress user wallet address
   * @returns freemint info
   */
  async getFreeMintInfo(
    chainId: number,
    contractAddress: string,
    campaignId: string,
    walletAddress: string
  ): Promise<FreemintInfoResponse> {
    const result = await this.authClient.request<FreemintInfoResponse>({
      url: `${this.authClient.url}/freemint/get-free-mint-info`,
      method: 'GET',
      params: {
        chain_id: chainId,
        contract_address: contractAddress,
        campaign_id: campaignId,
        wallet_address: walletAddress,
      },
    });

    return result?.data ? result.data : {};
  }

  /**
   * @param chainId id of chain
   * @param contractAddress collection contract address
   * @param tokenId token id
   * @returns nft claim token uri info
   */
  async getClaimTokenUriInfo(
    chainId: number,
    contractAddress: string,
    tokenId: string | number
  ): Promise<ClaimTokenUriInfoResponse> {
    const result = await this.authClient.request<ClaimTokenUriInfoResponse>({
      url: `${this.authClient.url}/nfts/${tokenId}/claim-token-uri-info`,
      method: 'GET',
      params: {
        chain_id: chainId,
        contract_address: contractAddress,
      },
    });

    return result?.data ? result.data : {};
  }

  /**
   * @param data JsonUriMetadata
   * @param data.items array object uri data
   * @returns array uploaded tokenUri
   */
  async uploadJSONUriInfo(
    data: JsonUriMetadata
  ): Promise<UploadJsonUriRespone[]> {
    const result = await this.authClient.request<UploadJsonUriRespone[]>({
      url: `${this.authClient.url}/upload/json-uri`,
      method: 'POST',
      data: data,
    });

    return result?.data ? result.data : [];
  }

  /**
   * @param data PresignImageData
   * @param data.files array presign info (mimeType, fileName)
   * @returns object with array presigned url
   */
  async generatePresignedImage(
    data: PresignImageData
  ): Promise<PresignedImageResponse> {
    const result = await this.authClient.request<PresignedImageResponse>({
      url: `${this.authClient.url}/upload/presigned-image`,
      method: 'POST',
      data: data,
    });

    return result?.data ? result.data : {urls: []};
  }
}
