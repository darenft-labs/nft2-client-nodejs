import {ethers} from 'ethers';
import {NFT2Contract} from './nft2contract';
import {subqueryService} from './services/subquery.service';
import {
  OnchainCollection,
  OnchainCollectionQuery,
  OnchainNFT,
  OnchainNFTQuery,
  Pagination,
} from './types';
import {gql} from 'graphql-request';
import {
  constructCollectionCachedResponse,
  constructCollectionLiteResponse,
  constructCollectionResponse,
  constructNFTCachedResponse,
  constructNFTLiteResponse,
  constructNFTResponse,
} from './utils';
import {APIService} from './services/api.service';

export class NFT2ContractMultichain {
  networkType: 'mainnet' | 'testnet';
  networkChains: {[key: number]: string};
  providers: {[key: number]: ethers.providers.JsonRpcProvider};
  contractClients: {[key: number]: NFT2Contract};
  apiService: APIService;

  constructor(
    networkConfig: {
      key: 'mainnet' | 'testnet';
      network: {[key: number]: string};
    },
    providers: {[key: number]: ethers.providers.JsonRpcProvider},
    contractClients: {[key: number]: NFT2Contract},
    apiService: APIService
  ) {
    this.networkType = networkConfig.key;
    this.networkChains = networkConfig.network;
    this.providers = providers;
    this.contractClients = contractClients;
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
    if (!this.contractClients[chainId])
      throw new Error(
        `Chain ${chainId} is not supported on ${this.networkType}`
      );
    return this.contractClients[chainId];
  }

  /**
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'deployedAt', order: 'ASC' | 'DESC'}
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ collections: Collection[]; total: number; }>
   */
  async getCollections(
    pagination: Pagination,
    chainIds?: number[],
    filter?: string,
    isLite?: boolean
  ) {
    let orderBy = 'TIMESTAMP_DESC';
    if (pagination.sort?.order == 'ASC') {
      orderBy = 'TIMESTAMP_ASC';
    }

    const chainList = chainIds ? chainIds : Object.keys(this.networkChains);
    const query = gql`
      {
        collections(
          filter: {
            chainId: {in: [${chainList.join(',')}]}
            ${filter ? ', ' + filter : ''}
          }
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            ${OnchainCollectionQuery}
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      collections: {
        nodes: Array<OnchainCollection>;
        totalCount: number;
      };
    } = await subqueryService.queryDataOnChain(query, this.networkType);

    if (
      !onchainData.collections.nodes ||
      onchainData.collections.totalCount == 0
    ) {
      return {collections: [], total: 0};
    }

    const collections = await Promise.all(
      onchainData.collections.nodes.map(collection => {
        return isLite
          ? constructCollectionLiteResponse(collection)
          : constructCollectionResponse(
              this.getProviderForChain(collection.chainId),
              collection
            );
      })
    );

    return {collections, total: onchainData.collections.totalCount};
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'deployedAt', order: 'ASC' | 'DESC'}
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ collections: Collection[]; total: number; }>
   */
  async getCollectionsByOwner(
    ownerAddress: string,
    pagination: Pagination,
    chainIds?: number[],
    isLite?: boolean
  ) {
    const filter = `owner: {equalToInsensitive: "${ownerAddress}"}`;
    return this.getCollections(pagination, chainIds, filter, isLite);
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param isFullInfo optional, addition info image, totalNfts, totalOwners
   * @returns Promise<Collection>
   */
  async getCollectionInfo(
    chainId: number,
    collectionAddress: string,
    isFullInfo?: boolean
  ) {
    return await this.getClientForChain(chainId).getCollectionInfo(
      collectionAddress,
      isFullInfo
    );
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'mintedAt' | 'tokenId', order: 'ASC' | 'DESC'}
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByCollection(
    chainId: number,
    collectionAddress: string,
    pagination: Pagination,
    isLite?: boolean
  ) {
    return await this.getClientForChain(chainId).getNFTsByCollection(
      collectionAddress,
      pagination,
      isLite
    );
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @param pagination.sort object {field: 'mintedAt' | 'tokenId', order: 'ASC' | 'DESC'}
   * @param pagination.filter object {isDerivative: false | true} // default false
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOwner(
    ownerAddress: string,
    pagination: Pagination,
    chainIds?: number[],
    isLite?: boolean
  ) {
    let orderBy = 'TIMESTAMP_DESC';
    if (pagination.sort) {
      orderBy = `${
        pagination.sort.field === 'tokenId' ? 'TOKEN_ID' : 'TIMESTAMP'
      }_${pagination.sort.order}`;
    }

    const isDerivative = pagination.filter?.isDerivative ? true : false;
    const chainList = chainIds ? chainIds : Object.keys(this.networkChains);
    const query = gql`
      {
        nFTs(
          filter: {
            chainId: {in: [${chainList.join(',')}]}
            owner: {equalToInsensitive: "${ownerAddress}"}
            isDerived: ${isDerivative ? '{equalTo: true}' : '{isNull: true}'}
          }
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            ${OnchainNFTQuery}
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      nFTs: {
        nodes: Array<OnchainNFT>;
        totalCount: number;
      };
    } = await subqueryService.queryDataOnChain(query, this.networkType);

    if (!onchainData.nFTs.nodes || onchainData.nFTs.totalCount == 0) {
      return {nfts: [], total: 0};
    }

    if (isLite) {
      return {
        nfts: onchainData.nFTs.nodes.map(nft => constructNFTLiteResponse(nft)),
        total: onchainData.nFTs.totalCount,
      };
    }

    const collectionList = [
      ...new Set(
        onchainData.nFTs.nodes.map(item =>
          item.underlyingNFT ? item.underlyingNFT.collection : item.collection
        )
      ),
    ];
    const collectionQuery = gql`
      {
        collections(filter: {
          id: {in: ["${collectionList.join('","')}"]}
        }) {
          nodes {
            ${OnchainCollectionQuery}
          }
        }
      }
    `;
    const collectionData: {
      collections: {
        nodes: Array<OnchainCollection>;
      };
    } = await subqueryService.queryDataOnChain(
      collectionQuery,
      this.networkType
    );

    const collectionInfos = await Promise.all(
      collectionData.collections.nodes.map(async collection =>
        constructCollectionResponse(
          this.getProviderForChain(collection.chainId),
          collection
        )
      )
    );

    const nfts = await Promise.all(
      onchainData.nFTs.nodes.map(async nft => {
        const address = nft.underlyingNFT
          ? nft.underlyingNFT.collection
          : nft.collection;

        const collectionInfo = collectionInfos.find(
          collection => collection.contractAddress == address
        );

        return await constructNFTResponse(
          this.getProviderForChain(nft.chainId),
          nft,
          collectionInfo
        );
      })
    );

    return {nfts, total: onchainData.nFTs.totalCount};
  }

  /**
   * @param chainId chain id
   * @param originCollectionAddress collection address of original
   * @param originTokenId token id of original
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'mintedAt', order: 'ASC' | 'DESC'}
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOriginal(
    chainId: number,
    originCollectionAddress: string,
    originTokenId: string,
    pagination: Pagination
  ) {
    return await this.getClientForChain(chainId).getNFTsByOriginal(
      originCollectionAddress,
      originTokenId,
      pagination
    );
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address or derived address
   * @param tokenId token id or derived token id
   * @returns Promise<{nft: NFT, derivedAccount: derived account}>
   */
  async getNFTInfo(
    chainId: number,
    collectionAddress: string,
    tokenId: string,
    isLite?: boolean
  ) {
    return await this.getClientForChain(chainId).getNFTInfo(
      collectionAddress,
      tokenId,
      isLite
    );
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param tokenId token id
   * @returns Promise<[ERC6551 TBA accounts]>
   */
  async getTbaAccounts(
    chainId: number,
    collectionAddress: string,
    tokenId: string
  ) {
    return await this.getClientForChain(chainId).getTbaAccounts(
      collectionAddress,
      tokenId
    );
  }

  /*----------------- Lite API ------------------- */

  /**
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'deployedAt', order: 'ASC' | 'DESC'}
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ collections: Collection[]; total: number; }>
   */
  async getCollectionsLite(pagination: Pagination, chainIds?: number[]) {
    return this.getCollections(pagination, chainIds, undefined, true);
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'deployedAt', order: 'ASC' | 'DESC'}
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ collections: Collection[]; total: number; }>
   */
  async getCollectionsByOwnerLite(
    ownerAddress: string,
    pagination: Pagination,
    chainIds?: number[]
  ) {
    return this.getCollectionsByOwner(ownerAddress, pagination, chainIds, true);
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'mintedAt' | 'tokenId', order: 'ASC' | 'DESC'}
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByCollectionLite(
    chainId: number,
    collectionAddress: string,
    pagination: Pagination
  ) {
    return this.getNFTsByCollection(
      chainId,
      collectionAddress,
      pagination,
      true
    );
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @param pagination.sort object {field: 'mintedAt' | 'tokenId', order: 'ASC' | 'DESC'}
   * @param pagination.filter object {isDerivative: false | true} // default false
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOwnerLite(
    ownerAddress: string,
    pagination: Pagination,
    chainIds?: number[]
  ) {
    return this.getNFTsByOwner(ownerAddress, pagination, chainIds, true);
  }

  /*----------------- Cached API ------------------- */

  /**
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'deployedAt', order: 'ASC' | 'DESC'}
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ collections: Collection[]; total: number; }>
   */
  async getCollectionsFromCached(pagination: Pagination, chainIds?: number[]) {
    const {items, total} = await this.apiService.getCollections(
      chainIds ?? Object.keys(this.networkChains).map(item => parseInt(item)),
      pagination
    );
    return {collections: items.map(constructCollectionCachedResponse), total};
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'createdAt', order: 'ASC' | 'DESC'}
   * @param chainIds List chain id (get all if undefined)
   * @returns Promise<{ collections: Collection[]; total: number; }>
   */
  async getCollectionsByOwnerFromCached(
    ownerAddress: string,
    pagination: Pagination,
    chainIds?: number[]
  ) {
    const {items, total} = await this.apiService.getCollectionsByOwner(
      chainIds ?? Object.keys(this.networkChains).map(item => parseInt(item)),
      ownerAddress,
      pagination
    );
    return {collections: items.map(constructCollectionCachedResponse), total};
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @returns Promise<Collection>
   */
  async getCollectionInfoFromCached(
    chainId: number,
    collectionAddress: string
  ) {
    const collection = await this.apiService.getCollectionDetail(
      chainId,
      collectionAddress
    );
    return collection ? constructCollectionCachedResponse(collection) : null;
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'mintedAt', order: 'ASC' | 'DESC'}
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByCollectionFromCached(
    chainId: number,
    collectionAddress: string,
    pagination: Pagination
  ) {
    const {items, total} = await this.apiService.getNFTsByCollection(
      chainId,
      collectionAddress,
      pagination
    );
    return {nfts: items.map(constructNFTCachedResponse), total};
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @param pagination.sort object {field: 'mintedAt', order: 'ASC' | 'DESC'}
   * @param pagination.filter object {isDerivative: false | true} // default false
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOwnerFromCached(
    ownerAddress: string,
    pagination: Pagination,
    chainIds?: number[]
  ) {
    const {items, total} = await this.apiService.getNFTsByOwner(
      chainIds ?? Object.keys(this.networkChains).map(item => parseInt(item)),
      ownerAddress,
      pagination
    );
    return {nfts: items.map(constructNFTCachedResponse), total};
  }

  /**
   * @param chainId chain id
   * @param originCollectionAddress collection address of original
   * @param originTokenId token id of original
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'mintedAt', order: 'ASC' | 'DESC'}
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOriginalFromCached(
    chainId: number,
    originCollectionAddress: string,
    originTokenId: string,
    pagination: Pagination
  ) {
    const {items, total} = await this.apiService.getNFTsByOriginal(
      chainId,
      originCollectionAddress,
      originTokenId,
      pagination
    );
    return {nfts: items.map(constructNFTCachedResponse), total};
  }

  /**
   * @param chainId chain id
   * @param collectionAddress collection address or derived address
   * @param tokenId token id or derived token id
   * @returns Promise<{nft: NFT, derivedAccount: derived account}>
   */
  async getNFTInfoFromCached(
    chainId: number,
    collectionAddress: string,
    tokenId: string
  ) {
    const {nft} = await this.getNFTInfo(
      chainId,
      collectionAddress,
      tokenId,
      true
    );
    const nftDetail = await this.apiService.getNFTDetail(
      chainId,
      nft.original ? nft.original.collectionAddress : collectionAddress,
      nft.original ? nft.original.tokenId : tokenId,
      nft.original ? collectionAddress : undefined,
      nft.original ? tokenId : undefined
    );
    return nftDetail ? constructNFTCachedResponse(nftDetail) : null;
  }
}
