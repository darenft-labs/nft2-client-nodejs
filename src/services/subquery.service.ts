import {GraphQLClient, gql} from 'graphql-request';
import {ChainConfig} from '../types';
import {getNetworkKey} from '../consts';
import {ethers} from 'ethers';
import {getNFTMetadata} from '../utils';

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
   * @param chainIdOrNetworkType chain id or network type (mainnet|testnet)
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

  async getCollectionNFTsInfo(
    provider: ethers.providers.JsonRpcProvider,
    chainId: number,
    collectionAddress: string
  ) {
    const address = collectionAddress.toLowerCase();
    const query = gql`
      {
        nFTs(
          filter: {
            chainId: {equalTo: ${chainId}}
            collection: {equalTo: "${address}"}
          }
          first: 1
          orderBy: TOKEN_ID_ASC
        ) {
          groupedAggregates(groupBy: OWNER) {
            keys
          }
          totalCount
          nodes {
            tokenId
            tokenUri
          }
        }
      }
    `;
    const onchainData: {
      nFTs: {
        groupedAggregates: Array<any>;
        totalCount: number;
        nodes: Array<{
          tokenId: string;
          tokenUri: string;
        }>;
      };
    } = await subqueryService.queryDataOnChain(query, chainId);

    const firstNft =
      onchainData.nFTs.nodes.length > 0 ? onchainData.nFTs.nodes[0] : null;
    const firstNftData = firstNft
      ? await getNFTMetadata(
          provider,
          address,
          firstNft.tokenId,
          firstNft.tokenUri
        )
      : null;

    return {
      collectionAddress: address,
      totalNfts: onchainData.nFTs.totalCount,
      totalOwners: onchainData.nFTs.groupedAggregates.length,
      firstNft: firstNftData,
    };
  }
}

export const subqueryService = new SubQueryService();
