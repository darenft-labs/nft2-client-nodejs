import {APIService} from './services/api.service';
import {ChainConfig} from './types/chain-config';

export class NFT2Client {
  configs: ChainConfig[];
  apiKey: string;
  apiService: APIService;

  constructor(apiKey: string, apiEndpoint?: string) {
    this.apiKey = apiKey;
    this.apiService = new APIService(apiKey, apiEndpoint);
    this.initializeAllService().then(() => console.log('Client init success'));
  }

  async initializeAllService() {
    const token = await this.apiService.auth.getToken(this.apiKey);
    console.log('token: ', token?.tokens);
    this.configs = await this.apiService.getChainConfigs();
    console.log('configs: ', this.configs);
  }

  updateConfig(configs: ChainConfig[]) {
    configs.forEach(config => {
      const index = this.configs.findIndex(
        item => item.chainId == config.chainId
      );

      if (index > -1) this.configs[index] = config;
      else this.configs.push(config);
    });
  }
}
