import {ethers} from 'ethers';
import {SubQueryService} from './services/subquery.service';
import {ChainConfig} from './types';

export class NFT2DataRegistry {
  chainId: number;
  provider: ethers.providers.JsonRpcProvider;
  subqueryService: SubQueryService;

  constructor(config: ChainConfig, subquery: SubQueryService) {
    this.chainId = config.chainId;
    this.provider = new ethers.providers.JsonRpcProvider(config.providerUrl);
    this.subqueryService = subquery;
  }
}
