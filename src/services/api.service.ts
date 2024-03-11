import {OAuth2Client} from '../auth/oauth2client';
import {
  ChainConfig,
  ChainConfigResponse,
  ClaimTokenUriInfoResponse,
  FreemintInfoResponse,
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
      url: `${this.authClient.url}/configs/internal-config`,
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
}
