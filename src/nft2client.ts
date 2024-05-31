import {NFT2DataRegistry} from './nft2dataregistry';
import {NFT2Contract} from './nft2contract';
import {APIService} from './services/api.service';
import {subqueryService} from './services/subquery.service';
import {ChainConfig} from './types';
import {ethers} from 'ethers';
import {pick} from './utils';
import {MAINNET, TESTNET} from './consts';
import {NFT2ContractMultichain} from './nft2contract-multichain';
import {NFT2DataRegistryMultichain} from './nft2dataregistry-multichain';

export class NFT2Client {
  apiKey: string;
  apiService: APIService;
  configs: ChainConfig[] = [];
  rpcProviders: {[key: number]: ethers.providers.JsonRpcProvider} = {};
  contractClients: {[key: number]: NFT2Contract} = {};
  registryClients: {[key: number]: NFT2DataRegistry} = {};
  contractMultichains: {
    [key: string]: NFT2ContractMultichain;
  } = {};
  dataRegistryMultichains: {
    [key: string]: NFT2DataRegistryMultichain;
  } = {};

  constructor(apiKey: string, apiEndpoint?: string) {
    this.apiKey = apiKey;
    this.apiService = new APIService(apiKey, apiEndpoint);
  }

  /**
   * Get configs from API then initialize all service
   */
  async initialize() {
    const configs = await this.apiService.getChainConfigs();
    this.updateConfig(configs);
  }

  /**
   * Update new configs and re-initialize service
   */
  updateConfig(configs: ChainConfig[]) {
    configs.forEach(config => {
      const index = this.configs.findIndex(
        item => item.chainId == config.chainId
      );
      index > -1 ? (this.configs[index] = config) : this.configs.push(config);

      this.initChainConfig(config);
    });

    subqueryService.configChains(this.configs);

    this.initServiceMultichain();
  }

  /**
   * Init service for a config
   */
  initChainConfig(config: ChainConfig) {
    const provider = new ethers.providers.JsonRpcProvider(config.providerUrl);
    this.contractClients[config.chainId] = new NFT2Contract(config, provider);
    this.registryClients[config.chainId] = new NFT2DataRegistry(
      config,
      provider
    );
    this.rpcProviders[config.chainId] = provider;
  }

  /**
   * Init service for a config
   */
  initServiceMultichain() {
    [
      {key: 'mainnet', network: MAINNET},
      {key: 'testnet', network: TESTNET},
    ].forEach(item => {
      this.contractMultichains[item.key] = new NFT2ContractMultichain(
        item as any,
        pick(this.rpcProviders, Object.keys(item.network)),
        pick(this.contractClients, Object.keys(item.network))
      );

      this.dataRegistryMultichains[item.key] = new NFT2DataRegistryMultichain(
        item as any,
        pick(this.rpcProviders, Object.keys(item.network)),
        pick(this.registryClients, Object.keys(item.network))
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

  /**
   * @returns NFT2 Protocol API instance
   */
  getAPIService(): APIService {
    return this.apiService;
  }

  /**
   * @returns NFT2ContractMultichain instance
   */
  getNFT2ContractMultichain(
    type?: 'mainnet' | 'testnet'
  ): NFT2ContractMultichain {
    return this.contractMultichains[type ?? 'mainnet'];
  }

  /**
   * @returns NFT2DataRegistryMultichain instance
   */
  getNFT2DataRegistryMultichain(
    type?: 'mainnet' | 'testnet'
  ): NFT2DataRegistryMultichain {
    return this.dataRegistryMultichains[type ?? 'mainnet'];
  }
}
