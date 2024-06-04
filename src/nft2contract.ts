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
  NFT,
} from './types';
import {gql} from 'graphql-request';
import {getBlockTime, getNFTMetadata, getNFTStatus} from './utils/blockchain';
import {subqueryService} from './services/subquery.service';
import {
  constructCollectionResponse,
  constructDappResponse,
  constructDerivativeNFTResponse,
  constructNFTResponse,
} from './utils';
import {NFTContractType} from './consts';

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
    let orderBy = 'BLOCK_HEIGHT_DESC';
    if (pagination.sort?.order == 'ASC') {
      orderBy = 'BLOCK_HEIGHT_ASC';
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
  async getNFTsByCollection(collectionAddress: string, pagination: Pagination) {
    const address = collectionAddress.toLowerCase();
    let orderBy = 'TOKEN_ID_ASC';
    if (pagination.sort) {
      orderBy = `${
        pagination.sort.field === 'tokenId' ? 'TOKEN_ID' : 'BLOCK_HEIGHT'
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

    const collectionInfo = await constructCollectionResponse(
      this.provider,
      onchainData.collection
    );

    const nfts = await Promise.all(
      onchainData.nFTs.nodes.map(async nft =>
        constructNFTResponse(this.provider, nft, collectionInfo)
      )
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
  async getNFTsByOwner(ownerAddress: string, pagination: Pagination) {
    let orderBy = 'TOKEN_ID_ASC';
    if (pagination.sort) {
      orderBy = `${
        pagination.sort.field === 'tokenId' ? 'TOKEN_ID' : 'BLOCK_HEIGHT'
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
    let orderBy = 'BLOCK_HEIGHT_DESC';
    if (pagination.sort?.order == 'ASC') {
      orderBy = 'BLOCK_HEIGHT_ASC';
    }
    const query = gql`
      {
        nFTs(
          filter: {
            chainId: {equalTo: ${this.chainId}}
            underlyingNFTId: {
              equalTo: "${nftKey}"
            }
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

        return await constructDerivativeNFTResponse(
          this.provider,
          nft,
          originNftMetaData,
          dapp
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
  async getNFTInfo(collectionAddress: string, tokenId: string) {
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

    const underlyingNFT = nftOnchainData.nFT.underlyingNFT;
    const query = gql`
      {
        collection(id: "${
          underlyingNFT ? underlyingNFT.collection : address
        }") {
          ${OnchainCollectionQuery}
        }
        derivedAccounts(
          first: 1
          offset: 0
          filter: {
            underlyingCollection: {equalTo: "${
              underlyingNFT ? underlyingNFT.collection : address
            }"}
            underlyingTokenId: {equalTo: "${
              underlyingNFT ? underlyingNFT.tokenId : tokenId
            }"}
          }
        ) {
          nodes {
            address
          }
        }
        dataRegistry(id: "${address}") {
          ${OnchainDappQuery}
        }
      }
    `;
    const onchainData: {
      collection: OnchainCollection;
      derivedAccounts: {
        nodes: Array<{
          address: string;
        }>;
      };
      dataRegistry: OnchainDapp;
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    const collectionInfo = await constructCollectionResponse(
      this.provider,
      onchainData.collection
    );

    let dataRegistry = underlyingNFT
      ? await constructDappResponse(onchainData.dataRegistry)
      : undefined;

    return {
      nft: await constructNFTResponse(
        this.provider,
        nftOnchainData.nFT,
        collectionInfo,
        dataRegistry
      ),
      derivedAccount:
        onchainData.derivedAccounts.nodes?.length > 0
          ? onchainData.derivedAccounts.nodes[0].address
          : null,
    };
  }

  /**
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @param pagination.sort object {field: 'mintedAt' | 'tokenId', order: 'ASC' | 'DESC'}
   * @param pagination.filter object {isDerivative: false | true} // default false
   * @returns Promise<{ nfts: NFT[]; total: number; }>
   */
  async getNFTsByOwnerLite(ownerAddress: string, pagination: Pagination) {
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

    const nfts = onchainData.nFTs.nodes.map(
      nft =>
        ({
          chainId: nft.chainId,
          collection: {
            contractAddress: nft.collection,
          },
          ownerAddress: nft.owner,
          tokenId: nft.tokenId,
          tokenUri: nft.tokenUri,
          type: nft.underlyingNFT
            ? NFTContractType.Derivative
            : NFTContractType.Original,
          status: getNFTStatus(nft.isBurned),
          mintedAt: getBlockTime(nft.timestamp),
        } as NFT)
    );

    return {nfts, total: onchainData.nFTs.totalCount};
  }
}
