import {ethers} from 'ethers';
import {NFT2DataRegistry} from './nft2dataregistry';
import {OnchainDapp, OnchainDappQuery, Pagination} from './types';
import {gql} from 'graphql-request';
import {subqueryService} from './services/subquery.service';
import {
  checkIsDerivable,
  constructDappCachedResponse,
  constructDappResponse,
} from './utils';
import {APIService} from './services/api.service';

export class NFT2DataRegistryMultichain {
  networkType: 'mainnet' | 'testnet';
  networkChains: {[key: number]: string};
  providers: {[key: number]: ethers.providers.JsonRpcProvider};
  dataRegistryClients: {[key: number]: NFT2DataRegistry};
  apiService: APIService;

  constructor(
    networkConfig: {
      key: 'mainnet' | 'testnet';
      network: {[key: number]: string};
    },
    providers: {[key: number]: ethers.providers.JsonRpcProvider},
    dataRegistryClients: {[key: number]: NFT2DataRegistry},
    apiService: APIService
  ) {
    this.networkType = networkConfig.key;
    this.networkChains = networkConfig.network;
    this.providers = providers;
    this.dataRegistryClients = dataRegistryClients;
    this.apiService = apiService;
  }

  getProviderForChain(chainId: number) {
    if (!this.providers[chainId])
      throw new Error(
        `Chain ${chainId} is not supported on ${this.networkType}`
      );
    return this.providers[chainId];
  }

  getClientForChain(chainId: number) {
    if (!this.dataRegistryClients[chainId])
      throw new Error(
        `Chain ${chainId} is not supported on ${this.networkType}`
      );
    return this.dataRegistryClients[chainId];
  }

  /**
   * @param pagination Pagination data
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ datas: DataRegistry[]; total: number; }>
   */
  async getDataRegistries(pagination: Pagination, chainIds?: number[]) {
    let orderBy = 'TIMESTAMP_DESC';
    if (pagination.sort?.order == 'ASC') {
      orderBy = 'TIMESTAMP_ASC';
    }

    const chainList = chainIds ? chainIds : Object.keys(this.networkChains);
    const query = gql`
      {
        dataRegistries(
          filter: {chainId: {in: [${chainList.join(',')}]}}
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            ${OnchainDappQuery}
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      dataRegistries: {
        nodes: Array<OnchainDapp>;
        totalCount: number;
      };
    } = await subqueryService.queryDataOnChain(query, this.networkType);

    if (
      !onchainData.dataRegistries.nodes ||
      onchainData.dataRegistries.totalCount == 0
    ) {
      return {datas: [], total: 0};
    }

    const needFilter =
      pagination.filter &&
      pagination.filter.collection &&
      pagination.filter.tokenId;

    const dataFromRegistry = await Promise.all(
      onchainData.dataRegistries.nodes.map(async item => {
        const isOk = needFilter
          ? await checkIsDerivable(
              this.getProviderForChain(item.chainId),
              item.address,
              pagination.filter!.collection,
              pagination.filter!.tokenId
            )
          : true;

        return {
          data: await constructDappResponse(item),
          isOk,
        };
      })
    );

    const datas = dataFromRegistry
      .filter(item => item.isOk)
      .map(item => item.data);

    return {datas, total: onchainData.dataRegistries.totalCount};
  }

  /**
   * @param chainId chain id
   * @param ownerAddress owner wallet address
   * @returns Promise<DataRegistry>
   */
  async getDataRegistryByOwner(chainId: number, ownerAddress: string) {
    return await this.getClientForChain(chainId).getDataRegistryByOwner(
      ownerAddress
    );
  }

  /**
   * @param chainId chain id
   * @param registryAddress data registry address
   * @returns Promise<DataRegistry>
   */
  async getDataRegistryInfo(chainId: number, registryAddress: string) {
    return await this.getClientForChain(chainId).getDataRegistryInfo(
      registryAddress
    );
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param tokenId token id
   * @returns Promise<Array NFT metadatas on dapp>
   */
  async getNFTMetaData(
    chainId: number,
    collectionAddress: string,
    tokenId: string
  ) {
    return await this.getClientForChain(chainId).getNFTMetaData(
      collectionAddress,
      tokenId
    );
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param tokenId token id
   * @param providerAddress data registry address
   * @returns Promise<protocol metadatas>
   */
  async getNFTProtocolMetaData(
    chainId: number,
    collectionAddress: string,
    tokenId: string,
    providerAddress: string
  ) {
    return await this.getClientForChain(chainId).getNFTProtocolMetaData(
      collectionAddress,
      tokenId,
      providerAddress
    );
  }

  /*----------------- Cached API ------------------- */

  /**
   * @param pagination Pagination data
   * @param pagination.sort object {field: 'registeredAt', order: 'ASC' | 'DESC'}
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ datas: DataRegistry[]; total: number; }>
   */
  async getDataRegistriesFromCached(
    pagination: Pagination,
    chainIds?: number[]
  ) {
    const {items, total} = await this.apiService.getDataRegistries(
      chainIds ?? Object.keys(this.networkChains).map(item => parseInt(item)),
      pagination
    );
    return {datas: items.map(constructDappCachedResponse), total};
  }

  /**
   * @param chainId chain id
   * @param registryAddress data registry address
   * @returns Promise<DataRegistry>
   */
  async getDataRegistryInfoFromCached(
    chainId: number,
    registryAddress: string
  ) {
    const data = await this.apiService.getDataRegistryInfo(
      chainId,
      registryAddress
    );
    return data ? constructDappCachedResponse(data) : null;
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param tokenId token id
   * @returns Promise<Array NFT metadatas on dapp>
   */
  async getNFTMetaDataFromCached(
    chainId: number,
    collectionAddress: string,
    tokenId: string
  ) {
    return await this.apiService.getNFTDappMetadata(
      chainId,
      collectionAddress,
      tokenId
    );
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param tokenId token id
   * @param providerAddress data registry address
   * @returns Promise<protocol metadatas>
   */
  async getNFTProtocolMetaDataFromCached(
    chainId: number,
    collectionAddress: string,
    tokenId: string,
    providerAddress: string
  ) {
    return await this.apiService.getNFTDynamicData(
      chainId,
      collectionAddress,
      tokenId,
      providerAddress
    );
  }
}
