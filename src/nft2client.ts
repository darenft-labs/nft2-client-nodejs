import {NFT2DataRegistry} from './nft2dataregistry';
import {NFT2Contract} from './nft2contract';
import {APIService} from './services/api.service';
import {SubQueryService} from './services/subquery.service';
import {ChainConfig} from './types';

export class NFT2Client {
  apiKey: string;
  apiService: APIService;
  subquery: SubQueryService;
  configs: ChainConfig[];
  contractClients: {[key: number]: NFT2Contract} = {};
  registryClients: {[key: number]: NFT2DataRegistry} = {};

  constructor(apiKey: string, apiEndpoint?: string) {
    this.apiKey = apiKey;
    this.apiService = new APIService(apiKey, apiEndpoint);
    this.subquery = new SubQueryService();
  }

  /**
   * Get configs from API then inittialze all service
   */
  async initialize() {
    this.configs = await this.apiService.getChainConfigs();

    this.subquery.configChains(this.configs);

    this.configs.forEach(config => {
      this.contractClients[config.chainId] = new NFT2Contract(
        config,
        this.subquery
      );

      this.registryClients[config.chainId] = new NFT2DataRegistry(
        config,
        this.subquery
      );
    });
  }

  /**
   * Update new configs and re-initialize service
   */
  updateConfig(configs: ChainConfig[]) {
    this.subquery.configChains(this.configs);

    configs.forEach(config => {
      const index = this.configs.findIndex(
        item => item.chainId == config.chainId
      );
      index > -1 ? (this.configs[index] = config) : this.configs.push(config);

      this.contractClients[config.chainId] = new NFT2Contract(
        config,
        this.subquery
      );

      this.registryClients[config.chainId] = new NFT2DataRegistry(
        config,
        this.subquery
      );
    });
  }

  /**
   * @returns NFT2Contract instance of specific chain
   */
  getNFT2Contract(chainId: number): NFT2Contract {
    return this.contractClients[chainId];
  }

  /**
   * @returns NFT2DataRegistry instance of specific chain
   */
  getNFT2DataRegistry(chainId: number): NFT2DataRegistry {
    return this.registryClients[chainId];
  }
}
