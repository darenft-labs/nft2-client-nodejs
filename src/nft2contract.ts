import {ethers} from 'ethers';
import {
  ChainConfig,
  OnchainCollection,
  Pagination,
  OnchainCollectionQuery,
  OnchainNFTQuery,
  OnchainNFT,
  OnchainDappQuery,
  OnchainDapp,
} from './types';
import {gql} from 'graphql-request';
import {getBlockTime, getNFTMetadata} from './utils/blockchain';
import {subqueryService} from './services/subquery.service';
import {
  constructCollectionLiteResponse,
  constructCollectionResponse,
  constructNFTLiteResponse,
  constructNFTResponse,
} from './utils';

export class NFT2Contract {
  chainId: number;
  provider: ethers.providers.JsonRpcProvider;

  constructor(config: ChainConfig, provider: ethers.providers.JsonRpcProvider) {
    this.chainId = config.chainId;
    this.provider = provider;
  }

  /**
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'deployedAt', order: 'ASC' | 'DESC'}
   * @returns Promise<{ collections: Collection[]; total: number; }>
   */
  async getCollections(pagination: Pagination, filter?: string) {
    let orderBy = 'TIMESTAMP_DESC';
    if (pagination.sort?.order == 'ASC') {
      orderBy = 'TIMESTAMP_ASC';
    }
    const query = gql`
      {
        collections(
          filter: {
            chainId: {equalTo: ${this.chainId}}
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
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    if (
      !onchainData.collections.nodes ||
      onchainData.collections.totalCount == 0
    ) {
      return {collections: [], total: 0};
    }

    const collections = await Promise.all(
      onchainData.collections.nodes.map(collection =>
        constructCollectionResponse(this.provider, collection)
      )
    );

    return {collections, total: onchainData.collections.totalCount};
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'deployedAt', order: 'ASC' | 'DESC'}
   * @returns Promise<{ collections: Collection[]; total: number; }>
   */
  async getCollectionsByOwner(ownerAddress: string, pagination: Pagination) {
    const filter = `owner: {equalToInsensitive: "${ownerAddress}"}`;
    return this.getCollections(pagination, filter);
  }

  /**
   * @param collectionAddress collection address
   * @param isFullInfo optional, addition info image, totalNfts, totalOwners
   * @returns Promise<Collection>
   */
  async getCollectionInfo(collectionAddress: string, isFullInfo?: boolean) {
    const address = collectionAddress.toLowerCase();
    const query = gql`
      {
        collection(id: "${address}") {
          ${OnchainCollectionQuery}
        }
      }
    `;
    const onchainData: {
      collection: OnchainCollection;
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    const nftInfo = isFullInfo
      ? await subqueryService.getCollectionNFTsInfo(
          this.provider,
          this.chainId,
          collectionAddress
        )
      : {};

    return constructCollectionResponse(
      this.provider,
      onchainData.collection,
      nftInfo
    );
  }

  /**
   * @param collectionAddress collection address
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'mintedAt' | 'tokenId', order: 'ASC' | 'DESC'}
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByCollection(
    collectionAddress: string,
    pagination: Pagination,
    isLite?: boolean
  ) {
    const address = collectionAddress.toLowerCase();
    let orderBy = 'TOKEN_ID_ASC';
    if (pagination.sort) {
      orderBy = `${
        pagination.sort.field === 'tokenId' ? 'TOKEN_ID' : 'TIMESTAMP'
      }_${pagination.sort.order}`;
    }
    const query = gql`
      {
        collection(id: "${address}") {
          ${OnchainCollectionQuery}
        }
        nFTs(
          filter: {
            chainId: {equalTo: ${this.chainId}}
            collection: {equalTo: "${address}"}
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
      collection: OnchainCollection;
      nFTs: {
        nodes: Array<OnchainNFT>;
        totalCount: number;
      };
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.nFTs.nodes || onchainData.nFTs.totalCount == 0) {
      return {nfts: [], total: 0};
    }

    const collectionInfo = isLite
      ? constructCollectionLiteResponse(onchainData.collection)
      : await constructCollectionResponse(
          this.provider,
          onchainData.collection
        );

    const nfts = await Promise.all(
      onchainData.nFTs.nodes.map(async nft => {
        return isLite
          ? constructNFTLiteResponse(nft, collectionInfo)
          : constructNFTResponse(this.provider, nft, collectionInfo);
      })
    );

    return {nfts, total: onchainData.nFTs.totalCount};
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @param pagination.sort object {field: 'mintedAt' | 'tokenId', order: 'ASC' | 'DESC'}
   * @param pagination.filter object {isDerivative: false | true} // default false
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOwner(
    ownerAddress: string,
    pagination: Pagination,
    isLite?: boolean
  ) {
    let orderBy = 'TIMESTAMP_DESC';
    if (pagination.sort) {
      orderBy = `${
        pagination.sort.field === 'tokenId' ? 'TOKEN_ID' : 'TIMESTAMP'
      }_${pagination.sort.order}`;
    }
    const isDerivative = pagination.filter?.isDerivative ? true : false;

    const query = gql`
      {
        nFTs(
          filter: {
            chainId: {equalTo: ${this.chainId}}
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
    } = await subqueryService.queryDataOnChain(query, this.chainId);

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
          chainId: {equalTo: ${this.chainId}}
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
    } = await subqueryService.queryDataOnChain(collectionQuery, this.chainId);

    const collectionInfos = await Promise.all(
      collectionData.collections.nodes.map(async collection =>
        constructCollectionResponse(this.provider, collection)
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

        return await constructNFTResponse(this.provider, nft, collectionInfo);
      })
    );

    return {nfts, total: onchainData.nFTs.totalCount};
  }

  /**
   * @param originCollectionAddress collection address of original
   * @param originTokenId token id of original
   * @param pagination Pagination {offset, limit, sort}
   * @param pagination.sort object {field: 'mintedAt', order: 'ASC' | 'DESC'}
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOriginal(
    originCollectionAddress: string,
    originTokenId: string,
    pagination: Pagination
  ) {
    const address = originCollectionAddress.toLowerCase();
    const nftKey = `${this.chainId}-${address}-${originTokenId}`;
    let orderBy = 'TIMESTAMP_DESC';
    if (pagination.sort?.order == 'ASC') {
      orderBy = 'TIMESTAMP_ASC';
    }
    const query = gql`
      {
        nFTs(
          filter: {
            chainId: {equalTo: ${this.chainId}}
            underlyingNFTId: {equalTo: "${nftKey}"}
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
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.nFTs.nodes || onchainData.nFTs.totalCount == 0) {
      return {nfts: [], total: 0};
    }

    const dappList = [
      ...new Set(onchainData.nFTs.nodes.map(item => item.collection)),
    ];

    const dappQuery = gql`
      {
        dataRegistries(filter: {
          chainId: {equalTo: ${this.chainId}}
          id: {in: ["${dappList.join('","')}"]}
        }) {
          nodes {
            ${OnchainDappQuery}
          }
        }
      }
    `;
    const dappData: {
      dataRegistries: {nodes: Array<OnchainDapp>};
    } = await subqueryService.queryDataOnChain(dappQuery, this.chainId);

    const originNftMetaData = await getNFTMetadata(
      this.provider,
      address,
      originTokenId
    );

    const nfts = await Promise.all(
      onchainData.nFTs.nodes.map(async nft => {
        const dapp = dappData.dataRegistries.nodes.find(
          item => item.address === nft.collection
        );

        return await constructNFTResponse(
          this.provider,
          nft,
          undefined,
          dapp,
          originNftMetaData
        );
      })
    );

    return {nfts, total: onchainData.nFTs.totalCount};
  }

  /**
   * @param collectionAddress collection address or derived address
   * @param tokenId token id or derived token id
   * @returns Promise<{nft: NFT, derivedAccount: derived account}>
   */
  async getNFTInfo(
    collectionAddress: string,
    tokenId: string,
    isLite?: boolean
  ) {
    const address = collectionAddress.toLowerCase();
    const nftKey = `${this.chainId}-${address}-${tokenId}`;

    const nftQuery = gql`
      {
        nFT(id: "${nftKey}") {
          ${OnchainNFTQuery}
        }
      }
    `;
    const nftOnchainData: {
      nFT: OnchainNFT;
    } = await subqueryService.queryDataOnChain(nftQuery, this.chainId);

    if (!nftOnchainData.nFT) {
      throw new Error('NFT not found');
    }

    if (isLite)
      return {
        nft: constructNFTLiteResponse(nftOnchainData.nFT),
        derivedAccount: null,
      };

    const underlyingNFT = nftOnchainData.nFT.underlyingNFT;
    const underlyingNFTKey = `${this.chainId}-${
      underlyingNFT ? underlyingNFT.collection : address
    }-${underlyingNFT ? underlyingNFT.tokenId : tokenId}`;
    const query = gql`
      {
        collection(id: "${
          underlyingNFT ? underlyingNFT.collection : address
        }") {
          ${OnchainCollectionQuery}
        }
        # derivedAccounts(
        #   first: 1
        #   offset: 0
        #   filter: {
        #     underlyingNFTId: {equalTo: "${underlyingNFTKey}"}
        #   }
        # ) {
        #   nodes {
        #     address
        #   }
        # }
        dataRegistry(id: "${address}") {
          ${OnchainDappQuery}
        }
      }
    `;
    const onchainData: {
      collection: OnchainCollection;
      // derivedAccounts: {
      //   nodes: Array<{
      //     address: string;
      //   }>;
      // };
      dataRegistry: OnchainDapp;
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    const collectionInfo = await constructCollectionResponse(
      this.provider,
      onchainData.collection
    );

    return {
      nft: await constructNFTResponse(
        this.provider,
        nftOnchainData.nFT,
        collectionInfo,
        underlyingNFT ? onchainData.dataRegistry : undefined
      ),
      derivedAccount: null,
      // onchainData.derivedAccounts.nodes?.length > 0
      //   ? onchainData.derivedAccounts.nodes[0].address
      //   : null,
    };
  }

  /**
   * @param collectionAddress collection address
   * @param tokenId token id
   * @returns Promise<[ERC6551 TBA accounts]>
   */
  async getTbaAccounts(collectionAddress: string, tokenId: string) {
    const nftKey = `${
      this.chainId
    }-${collectionAddress.toLowerCase()}-${tokenId}`;
    const query = gql`
      {
        nFT(id: "${nftKey}") {
          tbaAccounts {
            nodes {
              chainId
              timestamp
              account
              implementation
            }
          }
        }
      }
    `;
    const onchainData: {
      nFT: {
        tbaAccounts: {
          nodes: Array<{
            chainId: number;
            timestamp: string;
            account: string;
            implementation: string;
          }>;
        };
      };
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    if (
      !onchainData.nFT ||
      !onchainData.nFT.tbaAccounts ||
      !onchainData.nFT.tbaAccounts.nodes
    ) {
      return [];
    }

    return onchainData.nFT.tbaAccounts.nodes.map(item => ({
      chainId: item.chainId,
      account: item.account,
      implementation: item.implementation,
      createdAt: getBlockTime(item.timestamp),
    }));
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @param pagination.sort object {field: 'mintedAt' | 'tokenId', order: 'ASC' | 'DESC'}
   * @param pagination.filter object {isDerivative: false | true} // default false
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOwnerLite(ownerAddress: string, pagination: Pagination) {
    return this.getNFTsByOwner(ownerAddress, pagination, true);
  }
}
