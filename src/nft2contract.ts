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
          filter: {
            chainId: {equalTo: ${this.chainId}}
            ${filter ? ', ' + filter : ''}
          }
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            address
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      collections: {
        nodes: Array<{address: string}>;
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
          address
          timestamp
          id
          owner
          kind
        }
      }
    `;
    const onchainData: {
      collection: {
        address: string;
        timestamp: string;
        id: string;
        owner: string;
        kind: number;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    const collection = onchainData.collection;

    const collectionInfo = await getCollectionInfo(
      this.provider,
      collection.address
    );

    const nftInfo = isFullInfo
      ? await this.getCollectionNFTsInfo(collectionAddress)
      : ({} as any);

    return {
      name: collectionInfo.name,
      symbol: collectionInfo.symbol,
      imageUrl: nftInfo.firstNft?.image ?? null,
      contractAddress: collection.address,
      ownerAddress: collection.owner,
      creatorAddress: collection.owner,
      chainId: this.chainId,
      type: NFTContractType.Original, // always original
      deployedAt: getBlockTime(collection.timestamp),
      totalNfts: nftInfo.totalNfts ?? null,
      totalOwners: nftInfo.totalOwners ?? null,
      kind: collection.kind,
      defaultRoyalty: collectionInfo.royaltyInfo.rate,
    } as Collection;
  }

  /**
   * @param collectionAddress collection address
   * @returns Promise<{
      collectionAddress: string,
      totalNfts: number,
      totalOwners: number,
      firstNft: nftMetaData | null ,
    }>
   */
  async getCollectionNFTsInfo(collectionAddress: string) {
    const address = collectionAddress.toLowerCase();
    const query = gql`
      {
        nFTs(
          filter: {
            chainId: {equalTo: ${this.chainId}}
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
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    const firstNft =
      onchainData.nFTs.nodes.length > 0 ? onchainData.nFTs.nodes[0] : null;
    const firstNftData = firstNft
      ? await getNFTMetadata(
          this.provider,
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
          timestamp
          owner
          kind
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
            collection
            timestamp
            isBurned
            isDerived
            owner
            tokenId
          }
          totalCount
        }
      }
    `;

    const onchainData: {
      collection: {
        timestamp: string;
        owner: string;
        kind: number;
      };
      nFTs: {
        nodes: Array<{
          collection: string;
          timestamp: string;
          isBurned: string;
          isDerived: string;
          owner: string;
          tokenId: string;
        }>;
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

        return {
          name: nftMetaData?.name,
          description: nftMetaData?.description,
          tokenId: nft.tokenId,
          chainId: this.chainId,
          creatorAddress: onchainData.collection.owner,
          ownerAddress: nft.owner,
          imageUrl: nftMetaData.image ?? null,
          tokenUri: nftMetaData.tokenUri,
          type: NFTContractType.Original,
          status: getNFTStatus(nft.isBurned),
          mintedAt: getBlockTime(nft.timestamp),
          royalties: collectionInfo.royaltyInfo.rate,
          collection: {
            name: collectionInfo.name,
            symbol: collectionInfo.symbol,
            contractAddress: address,
            ownerAddress: onchainData.collection.owner,
            creatorAddress: onchainData.collection.owner,
            chainId: this.chainId,
            kind: onchainData.collection.kind,
            defaultRoyalty: collectionInfo.royaltyInfo.rate,
            deployedAt: getBlockTime(onchainData.collection.timestamp),
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
            chainId: {equalTo: ${this.chainId}}
            owner: {equalToInsensitive: "${ownerAddress}"}
            isDerived: ${isDerivative ? '{equalTo: true}' : '{isNull: true}'}
          }
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            collection
            timestamp
            isBurned
            isDerived
            owner
            tokenId
            underlyingNFT {
              collection
              tokenId
            }
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      nFTs: {
        nodes: Array<{
          collection: string;
          timestamp: string;
          isBurned: string;
          isDerived: string;
          owner: string;
          tokenId: string;
          underlyingNFT: {
            collection: string;
            tokenId: string;
          };
        }>;
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
        collections(filter: {
          chainId: {equalTo: ${this.chainId}}
          id: {in: ["${collectionList.join('","')}"]}
        }) {
          nodes {
            address
            owner
            kind
            timestamp
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
          timestamp: string;
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
          defaultRoyalty: collectionInfo.royaltyInfo.rate,
          deployedAt: getBlockTime(collection.timestamp),
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

        const derivedInfo = isDerivative
          ? await getDerivedInfo(
              this.provider,
              item.collection,
              item.underlyingNFT.collection,
              item.underlyingNFT.tokenId
            )
          : null;

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
          creatorAddress: collectionInfo?.ownerAddress,
          ownerAddress: item.owner,
          imageUrl: metaData.image ?? null,
          tokenUri: metaData.tokenUri,
          type: isDerivative
            ? NFTContractType.Derivative
            : NFTContractType.Original,
          status: getNFTStatus(item.isBurned, derivedInfo ?? undefined),
          mintedAt: getBlockTime(item.timestamp),
          collection: collectionInfo,
          royalties: collectionInfo?.defaultRoyalty,
          ...(isDerivative
            ? {
                openAt: derivedInfo?.startTime,
                closeAt: derivedInfo?.endTime,
                royalties: derivedInfo?.royaltyInfo.rate,
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
            collection
            timestamp
            isBurned
            isDerived
            owner
            tokenId
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      nFTs: {
        nodes: Array<{
          collection: string;
          timestamp: string;
          isBurned: string;
          isDerived: string;
          owner: string;
          tokenId: string;
        }>;
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
        dataRegistries(filter: {
          chainId: {equalTo: ${this.chainId}}
          id: {in: ["${dappList.join('","')}"]}
        }) {
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
          mintedAt: getBlockTime(nft.timestamp),
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
          timestamp
          collection
          isBurned
          isDerived
          owner
          tokenId
          underlyingNFT {
            collection
            tokenId
          }
        }
      }
    `;
    const nftOnchainData: {
      nFT: {
        timestamp: string;
        collection: string;
        isBurned: string;
        isDerived: string;
        owner: string;
        tokenId: string;
        underlyingNFT: {
          collection: string;
          tokenId: string;
        };
      };
    } = await this.subqueryService.queryDataOnChain(nftQuery, this.chainId);

    if (!nftOnchainData.nFT) {
      throw new Error('NFT not found');
    }

    const isDerivative =
      nftOnchainData.nFT.isDerived && !!nftOnchainData.nFT.underlyingNFT;
    const underlyingNFT = nftOnchainData.nFT.underlyingNFT;

    const query = gql`
      {
        collection(id: "${isDerivative ? underlyingNFT.collection : address}") {
          owner
          kind
          timestamp
        }
        derivedAccounts(
          first: 1
          offset: 0
          filter: {
            underlyingCollection: {equalTo: "${
              isDerivative ? underlyingNFT.collection : address
            }"}
            underlyingTokenId: {equalTo: "${
              isDerivative ? underlyingNFT.tokenId : tokenId
            }"}
          }
        ) {
          nodes {
            address
          }
        }
        dataRegistry(id: "${address}") {
          address
          uri
        }
      }
    `;
    const onchainData: {
      collection: {
        owner: string;
        kind: number;
        timestamp: string;
      };
      derivedAccounts: {
        nodes: Array<{
          address: string;
        }>;
      };
      dataRegistry: {address: string; uri: string};
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    const collectionInfo = await getCollectionInfo(
      this.provider,
      isDerivative ? underlyingNFT.collection : address
    );

    const nftMetaData = await getNFTMetadata(
      this.provider,
      isDerivative ? underlyingNFT.collection : address,
      isDerivative ? underlyingNFT.tokenId : tokenId
    );

    const derivedInfo = isDerivative
      ? await getDerivedInfo(
          this.provider,
          address,
          underlyingNFT.collection,
          underlyingNFT.tokenId
        )
      : null;

    let dataRegistry: DataRegistry | null = null;
    if (isDerivative && onchainData.dataRegistry) {
      const dappMetadata = await getDataRegistryMetadata(
        onchainData.dataRegistry.uri
      );

      dataRegistry = {
        ...dappMetadata,
        providerAddress: onchainData.dataRegistry.address,
      };
    }

    return {
      nft: {
        name: nftMetaData.name,
        description: nftMetaData?.description,
        tokenId: tokenId,
        chainId: this.chainId,
        creatorAddress: onchainData.collection.owner,
        ownerAddress: nftOnchainData.nFT.owner,
        imageUrl: nftMetaData.image ?? null,
        tokenUri: nftMetaData.tokenUri,
        type: isDerivative
          ? NFTContractType.Derivative
          : NFTContractType.Original,
        status: getNFTStatus(
          nftOnchainData.nFT.isBurned,
          derivedInfo ?? undefined
        ),
        mintedAt: getBlockTime(nftOnchainData.nFT.timestamp),
        attributes: nftMetaData.attributes,
        collection: {
          name: collectionInfo.name,
          symbol: collectionInfo.symbol,
          contractAddress: isDerivative ? underlyingNFT.collection : address,
          ownerAddress: onchainData.collection.owner,
          creatorAddress: onchainData.collection.owner,
          chainId: this.chainId,
          kind: onchainData.collection.kind,
          defaultRoyalty: collectionInfo.royaltyInfo.rate,
          deployedAt: getBlockTime(onchainData.collection.timestamp),
        },
        royalties: collectionInfo.royaltyInfo.rate,
        ...(isDerivative && derivedInfo
          ? {
              tokenId: nftOnchainData.nFT.tokenId,
              openAt: derivedInfo.startTime,
              closeAt: derivedInfo.endTime,
              royalties: derivedInfo.royaltyInfo.rate,
              original: {
                collectionAddress: underlyingNFT.collection,
                tokenId: underlyingNFT.tokenId,
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
