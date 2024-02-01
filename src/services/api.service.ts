import {OAuth2Client} from '../auth/oauth2client';
import {ChainConfig, ChainConfigResponse} from '../types';

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
   * @param nftContractAddress nft contract address
   * @param tokenId token id of nft
   * @returns nft detail info
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
}
