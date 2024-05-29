import {GraphQLClient} from 'graphql-request';
import {ChainConfig} from '../types';
import {getNetworkKey} from '../consts';

export class SubQueryService {
  clients: {[key: string]: GraphQLClient} = {};

  constructor() {}

  /**
   * @param configs array config of chains
   * @returns void
   */
  configChains(configs: Array<ChainConfig>) {
    configs.forEach(config => {
      const key = getNetworkKey(config.chainId);
      if (!this.clients[key])
        this.clients[key] = new GraphQLClient(config.subQueryEndpoint);
    });
  }

  /**
   * @param query query command by string
   * @param chainIdOrNetworkType chain id or network type (mainet|testnet)
   * @returns subquery data
   */
  async queryDataOnChain(query: string, chainIdOrNetworkType: number | string) {
    let client = this.clients[getNetworkKey(chainIdOrNetworkType)];
    try {
      const result: any = await client.request(query);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

export const subqueryService = new SubQueryService();
