import {ethers} from 'ethers';
import {SubQueryService} from './services/subquery.service';
import {ChainConfig, Collection, DataRegistry, NFT, Pagination} from './types';
import {gql} from 'graphql-request';
import {
  getBlockTime,
  getCollectionInfo,
  getDataRegistryMetadata,
  getDerivedInfo,
  getNFTMetadata,
  getNFTStatus,
} from './utils/blockchain';
import {NFTContractType} from './consts';

export class NFT2Contract {
  chainId: number;
  provider: ethers.providers.JsonRpcProvider;
  subqueryService: SubQueryService;

  constructor(config: ChainConfig, subquery: SubQueryService) {
    this.chainId = config.chainId;
    this.provider = new ethers.providers.JsonRpcProvider(config.providerUrl);
    this.subqueryService = subquery;
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
          ${filter ?? ''}
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            id
            address
            owner
          }
          pageInfo {
            hasNextPage
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      collections: {
        nodes: Array<{
          id: string;
          address: string;
          owner: string;
        }>;
        pageInfo: {
          hasNextPage: boolean;
        };
        totalCount: number;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    if (
      !onchainData.collections.nodes ||
      onchainData.collections.totalCount == 0
    ) {
      return {collections: [], total: 0};
    }

    const collections = await Promise.all(
      onchainData.collections.nodes.map(collection =>
        this.getCollectionInfo(collection.address)
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
    const filter = `filter: {owner: {equalToInsensitive: "${ownerAddress}"}}`;

    return this.getCollections(pagination, filter);
  }

  /**
   * @param collectionAddress collection address
   * @returns Promise<Collection>
   */
  async getCollectionInfo(collectionAddress: string) {
    const address = collectionAddress.toLowerCase();
    const query = gql`
      {
        collection(id: "${address}") {
          address
          blockHeight
          id
          owner
          kind
        }
        nFTs(
          filter: {collection: {equalToInsensitive: "${address}"}}
          distinct: OWNER
        ) {
          nodes {
            owner
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      collection: {
        address: string;
        blockHeight: string;
        id: string;
        owner: string;
        kind: number;
      };
      nFTs: {
        nodes: Array<{
          owner: string;
        }>;
        totalCount: number;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    const collection = onchainData.collection;

    const firstNftData =
      onchainData.nFTs.totalCount > 0
        ? await getNFTMetadata(this.provider, collection.address, '0')
        : null;

    const nftInfo = {
      address: collection.address,
      totalNfts: onchainData.nFTs.totalCount,
      totalOwners: onchainData.nFTs.nodes.length,
      firstNft: firstNftData,
    };

    const collectionInfo = await getCollectionInfo(
      this.provider,
      collection.address
    );

    const blockTime = await getBlockTime(this.provider, collection.blockHeight);

    return {
      name: collectionInfo.name,
      symbol: collectionInfo.symbol,
      imageUrl: nftInfo.firstNft?.image ?? null,
      contractAddress: collection.address,
      ownerAddress: collection.owner,
      creatorAddress: collection.owner,
      chainId: this.chainId,
      type: NFTContractType.Original, // always original
      deployedAt: blockTime,
      totalNfts: nftInfo.totalNfts,
      totalOwners: nftInfo.totalOwners,
      kind: collection.kind,
      defaultRoyalty: collectionInfo.royaltyInfo.rate,
    } as Collection;
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
          owner
          kind
        }
        nFTs(
          filter: { collection: {equalTo: "${address}"} }
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            id
            collection
            blockHeight
            isBurned
            isDerived
            owner
            tokenId
          }
          pageInfo {
            hasNextPage
          }
          totalCount
        }
      }
    `;

    const onchainData: {
      collection: {
        owner: string;
        kind: number;
      };
      nFTs: {
        nodes: Array<{
          id: string;
          collection: string;
          blockHeight: string;
          isBurned: string;
          isDerived: string;
          owner: string;
          tokenId: string;
        }>;
        pageInfo: {
          hasNextPage: boolean;
        };
        totalCount: number;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.nFTs.nodes || onchainData.nFTs.totalCount == 0) {
      return {nfts: [], total: 0};
    }

    const collectionInfo = await getCollectionInfo(this.provider, address);

    const nfts = await Promise.all(
      onchainData.nFTs.nodes.map(async nft => {
        const nftMetaData = await getNFTMetadata(
          this.provider,
          address,
          nft.tokenId
        );
        const blockTime = await getBlockTime(this.provider, nft.blockHeight);

        return {
          name: nftMetaData?.name,
          description: nftMetaData?.description,
          tokenId: nft.tokenId,
          chainId: this.chainId,
          // creatorAddress: nft.owner,
          ownerAddress: nft.owner,
          imageUrl: nftMetaData.image ?? null,
          tokenUri: nftMetaData.tokenUri,
          type: NFTContractType.Original,
          status: getNFTStatus(nft.isBurned),
          mintedAt: blockTime,
          collection: {
            name: collectionInfo.name,
            symbol: collectionInfo.symbol,
            contractAddress: address,
            ownerAddress: onchainData.collection.owner,
            creatorAddress: onchainData.collection.owner,
            chainId: this.chainId,
            kind: onchainData.collection.kind,
          },
        } as NFT;
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
            owner: {equalToInsensitive: "${ownerAddress}"}
            isDerived: ${isDerivative ? '{equalTo: true}' : '{isNull: true}'}
          }
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            id
            collection
            blockHeight
            isBurned
            isDerived
            owner
            tokenId
            underlyingNFT {
              collection
              tokenId
            }
          }
          pageInfo {
            hasNextPage
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      nFTs: {
        nodes: Array<{
          id: string;
          collection: string;
          blockHeight: string;
          isBurned: string;
          isDerived: string;
          owner: string;
          tokenId: string;
          underlyingNFT: {
            collection: string;
            tokenId: string;
          };
        }>;
        pageInfo: {
          hasNextPage: boolean;
        };
        totalCount: number;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.nFTs.nodes || onchainData.nFTs.totalCount == 0) {
      return {nfts: [], total: 0};
    }

    const collectionList = [
      ...new Set(
        onchainData.nFTs.nodes.map(item =>
          isDerivative ? item.underlyingNFT.collection : item.collection
        )
      ),
    ];

    const collectionQuery = gql`
      {
        collections(filter: {id: {in: ["${collectionList.join('","')}"]}}) {
          nodes {
            address
            owner
            kind
          }
        }
      }
    `;
    const collectionData: {
      collections: {
        nodes: Array<{
          address: string;
          owner: string;
          kind: number;
        }>;
      };
    } = await this.subqueryService.queryDataOnChain(
      collectionQuery,
      this.chainId
    );

    const collectionInfos = await Promise.all(
      collectionData.collections.nodes.map(async collection => {
        const collectionInfo = await getCollectionInfo(
          this.provider,
          collection.address
        );

        return {
          name: collectionInfo.name,
          symbol: collectionInfo.symbol,
          contractAddress: collection.address,
          ownerAddress: collection.owner,
          creatorAddress: collection.owner,
          chainId: this.chainId,
          kind: collection.kind,
        } as Collection;
      })
    );

    const nfts = await Promise.all(
      onchainData.nFTs.nodes.map(async item => {
        const metaData = await getNFTMetadata(
          this.provider,
          isDerivative ? item.underlyingNFT.collection : item.collection,
          isDerivative ? item.underlyingNFT.tokenId : item.tokenId
        );

        const blockTime = await getBlockTime(this.provider, item.blockHeight);

        const collectionInfo = collectionInfos.find(collection => {
          const address = isDerivative
            ? item.underlyingNFT.collection
            : item.collection;
          return collection.contractAddress == address;
        });

        return {
          name: metaData.name,
          description: metaData.description,
          tokenId: item.tokenId,
          chainId: this.chainId,
          // creatorAddress: item.owner,
          ownerAddress: item.owner,
          imageUrl: metaData.image ?? null,
          tokenUri: metaData.tokenUri,
          type: isDerivative
            ? NFTContractType.Derivative
            : NFTContractType.Original,
          status: getNFTStatus(item.isBurned),
          mintedAt: blockTime,
          collection: collectionInfo,
          ...(isDerivative
            ? {
                original: {
                  collectionAddress: item.underlyingNFT.collection,
                  tokenId: item.underlyingNFT.tokenId,
                },
                dataRegistry: {providerAddress: item.collection},
              }
            : {}),
        } as NFT;
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
    const nftKey = `${address}-${originTokenId}`;
    let orderBy = 'BLOCK_HEIGHT_DESC';
    if (pagination.sort?.order == 'ASC') {
      orderBy = 'BLOCK_HEIGHT_ASC';
    }
    const query = gql`
      {
        nFTs(
          filter: {
            underlyingNFTId: {
              equalTo: "${nftKey}"
            }
          }
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            id
            collection
            blockHeight
            isBurned
            isDerived
            owner
            tokenId
          }
          pageInfo {
            hasNextPage
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      nFTs: {
        nodes: Array<{
          id: string;
          collection: string;
          blockHeight: string;
          isBurned: string;
          isDerived: string;
          owner: string;
          tokenId: string;
        }>;
        pageInfo: {
          hasNextPage: boolean;
        };
        totalCount: number;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.nFTs.nodes || onchainData.nFTs.totalCount == 0) {
      return {nfts: [], total: 0};
    }

    const dappList = [
      ...new Set(onchainData.nFTs.nodes.map(item => item.collection)),
    ];

    const dappQuery = gql`
      {
        dataRegistries(filter: {id: {in: ["${dappList.join('","')}"]}}) {
          nodes {
            address
            uri
          }
        }
      }
    `;
    const dappData: {
      dataRegistries: {nodes: Array<{address: string; uri: string}>};
    } = await this.subqueryService.queryDataOnChain(dappQuery, this.chainId);

    const nftMetaData = await getNFTMetadata(
      this.provider,
      address,
      originTokenId
    );

    const nfts = await Promise.all(
      onchainData.nFTs.nodes.map(async nft => {
        const dapp = dappData.dataRegistries.nodes.find(
          item => item.address === nft.collection
        );
        const dappMetadata = await getDataRegistryMetadata(dapp?.uri || '');

        const blockTime = await getBlockTime(this.provider, nft.blockHeight);

        const derivedInfo = await getDerivedInfo(
          this.provider,
          nft.collection,
          address,
          originTokenId
        );

        return {
          name: nftMetaData.name,
          description: nftMetaData.description,
          tokenId: nft.tokenId,
          chainId: this.chainId,
          // creatorAddress: nft.owner,
          ownerAddress: nft.owner,
          imageUrl: nftMetaData.image ?? null,
          tokenUri: nftMetaData.tokenUri,
          type: NFTContractType.Derivative,
          status: getNFTStatus(nft.isBurned, derivedInfo),
          mintedAt: blockTime,
          openAt: derivedInfo.startTime,
          closeAt: derivedInfo.endTime,
          royalties: derivedInfo.royaltyInfo.rate,
          original: {
            collectionAddress: originCollectionAddress,
            tokenId: originTokenId,
          },
          dataRegistry: {...dappMetadata, providerAddress: nft.collection},
        } as NFT;
      })
    );

    return {nfts, total: onchainData.nFTs.totalCount};
  }

  /**
   * @param collectionAddress collection address
   * @param tokenId token id
   * @param providerAddress data registry which derived nft
   * @param derivativeTokenId derived token id
   * @returns Promise<{nft: NFT, derivedAccount: derived account}>
   */
  async getNFTInfo(
    collectionAddress: string,
    tokenId: string,
    providerAddress?: string,
    derivativeTokenId?: string
  ) {
    const isDerivative = !!providerAddress && !!derivativeTokenId;
    const address = collectionAddress.toLowerCase();
    const nftKey = isDerivative
      ? `${providerAddress.toLowerCase()}-${derivativeTokenId}`
      : `${address}-${tokenId}`;

    const query = gql`
      {
        nFT(id: "${nftKey}") {
          id
          blockHeight
          collection
          isBurned
          isDerived
          owner
          tokenId
        }
        collection(id: "${address}") {
          owner
          kind
        }
        derivedAccounts(
          first: 1
          offset: 0
          filter: {
            underlyingCollection: {equalTo: "${address}"}
            underlyingTokenId: {equalTo: "${tokenId}"}
          }
        ) {
          nodes {
            address
          }
        }
      }
    `;
    const onchainData: {
      nFT: {
        id: string;
        blockHeight: string;
        collection: string;
        isBurned: string;
        isDerived: string;
        owner: string;
        tokenId: string;
      };
      collection: {
        owner: string;
        kind: number;
      };
      derivedAccounts: {
        nodes: Array<{
          address: string;
        }>;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.nFT) {
      throw new Error('NFT not found');
    }

    const collectionInfo = await getCollectionInfo(this.provider, address);

    const nftMetaData = await getNFTMetadata(this.provider, address, tokenId);

    const blockTime = await getBlockTime(
      this.provider,
      onchainData.nFT.blockHeight
    );

    const derivedInfo = isDerivative
      ? await getDerivedInfo(this.provider, providerAddress, address, tokenId)
      : null;

    let dataRegistry: DataRegistry | null = null;
    if (isDerivative) {
      const dappQuery = gql`
        {
          dataRegistry(id: "${providerAddress}") {
            address
            uri
          }
        }
      `;
      const dappData: {
        dataRegistry: {address: string; uri: string};
      } = await this.subqueryService.queryDataOnChain(dappQuery, this.chainId);

      const dappMetadata = await getDataRegistryMetadata(
        dappData.dataRegistry.uri
      );

      dataRegistry = {...dappMetadata, providerAddress: providerAddress};
    }

    return {
      nft: {
        name: nftMetaData.name,
        description: nftMetaData?.description,
        tokenId: tokenId,
        chainId: this.chainId,
        // creatorAddress: onchainData.nFT.owner,
        ownerAddress: onchainData.nFT.owner,
        imageUrl: nftMetaData.image ?? null,
        tokenUri: nftMetaData.tokenUri,
        type: isDerivative
          ? NFTContractType.Derivative
          : NFTContractType.Original,
        status: getNFTStatus(
          onchainData.nFT.isBurned,
          derivedInfo ?? undefined
        ),
        mintedAt: blockTime,
        collection: {
          name: collectionInfo.name,
          symbol: collectionInfo.symbol,
          contractAddress: address,
          ownerAddress: onchainData.collection.owner,
          creatorAddress: onchainData.collection.owner,
          chainId: this.chainId,
          kind: onchainData.collection.kind,
        },
        royalties: collectionInfo.royaltyInfo.rate,
        ...(isDerivative && derivedInfo
          ? {
              tokenId: derivativeTokenId,
              openAt: derivedInfo.startTime,
              closeAt: derivedInfo.endTime,
              royalties: derivedInfo.royaltyInfo.rate,
              original: {
                collectionAddress: address,
                tokenId: tokenId,
              },
              dataRegistry: dataRegistry,
            }
          : {}),
      } as NFT,
      derivedAccount:
        onchainData.derivedAccounts.nodes?.length > 0
          ? onchainData.derivedAccounts.nodes[0].address
          : null,
    };
  }
}
