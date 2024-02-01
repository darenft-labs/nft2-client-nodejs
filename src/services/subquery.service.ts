import {GraphQLClient} from 'graphql-request';
import {ChainConfig} from '../types';

export class SubQueryService {
  clients: {[key: number]: GraphQLClient} = {};

  constructor() {}

  /**
   * @param configs array config of chains
   * @returns void
   */
  configChains(configs: Array<ChainConfig>) {
    configs.forEach(config => {
      this.clients[config.chainId] = new GraphQLClient(config.subQueryEndpoint);
    });
  }

  /**
   * @param query query command by string
   * @param chainId chain id
   * @returns subquery data
   */
  async queryDataOnChain(query: string, chainId: number) {
    let client = this.clients[chainId];
    if (!client) throw new Error(`Chain ${chainId} is not supported!`);

    try {
      const result: any = await client.request(query);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
