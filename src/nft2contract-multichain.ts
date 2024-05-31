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
import {constructCollectionResponse, constructNFTResponse} from './utils';

export class NFT2ContractMultichain {
  networkType: 'mainnet' | 'testnet';
  networkChains: {[key: number]: string};
  providers: {[key: number]: ethers.providers.JsonRpcProvider};
  contractClients: {[key: number]: NFT2Contract};

  constructor(
    networkConfig: {
      key: 'mainnet' | 'testnet';
      network: {[key: number]: string};
    },
    providers: {[key: number]: ethers.providers.JsonRpcProvider},
    contractClients: {[key: number]: NFT2Contract}
  ) {
    this.networkType = networkConfig.key;
    this.networkChains = networkConfig.network;
    this.providers = providers;
    this.contractClients = contractClients;
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
    filter?: string
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
      onchainData.collections.nodes.map(collection =>
        constructCollectionResponse(
          this.getProviderForChain(collection.chainId),
          collection
        )
      )
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
    chainIds?: number[]
  ) {
    const filter = `owner: {equalToInsensitive: "${ownerAddress}"}`;
    return this.getCollections(pagination, chainIds, filter);
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
    pagination: Pagination
  ) {
    return await this.getClientForChain(chainId).getNFTsByCollection(
      collectionAddress,
      pagination
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
    chainIds?: number[]
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
    tokenId: string
  ) {
    return await this.getClientForChain(chainId).getNFTInfo(
      collectionAddress,
      tokenId
    );
  }
}
