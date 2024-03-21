import {ethers} from 'ethers';
import {SubQueryService} from './services/subquery.service';
import {ChainConfig, DataRegistry, Pagination} from './types';
import {gql} from 'graphql-request';
import {
  checkIsDerivable,
  getBlockTime,
  getDataRegistryMetadata,
} from './utils/blockchain';
import {
  convertDecodedArrayToJson,
  convertToNFTSchema,
  decodeDataFromString,
  getSchemaByHash,
  separateJsonSchema,
} from './utils/encoding-schema';

export class NFT2DataRegistry {
  chainId: number;
  provider: ethers.providers.JsonRpcProvider;
  subqueryService: SubQueryService;

  constructor(config: ChainConfig, subquery: SubQueryService) {
    this.chainId = config.chainId;
    this.provider = new ethers.providers.JsonRpcProvider(config.providerUrl);
    this.subqueryService = subquery;
  }

  /**
   * @param pagination Pagination data
   * @returns Promise<{ datas: DataRegistry[]; total: number; }>
   */
  async getDataRegistries(pagination: Pagination) {
    let orderBy = 'BLOCK_HEIGHT_DESC';
    if (pagination.sort?.order == 'ASC') {
      orderBy = 'BLOCK_HEIGHT_ASC';
    }
    const query = gql`
      {
        dataRegistries(
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            address
            blockHeight
            dapp
            id
            uri
          }
          pageInfo {
            hasNextPage
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      dataRegistries: {
        nodes: Array<{
          address: string;
          blockHeight: string;
          dapp: string;
          id: string;
          uri: string;
        }>;
        pageInfo: {
          hasNextPage: boolean;
        };
        totalCount: number;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

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
        const providerData = await getDataRegistryMetadata(item.uri);

        const blockTime = await getBlockTime(this.provider, item.blockHeight);

        const isOk = needFilter
          ? await checkIsDerivable(
              this.provider,
              item.address,
              pagination.filter!.collection,
              pagination.filter!.tokenId
            )
          : true;

        return {
          data: {
            ...providerData,
            walletAddress: item.dapp,
            providerAddress: item.address,
            registeredAt: blockTime,
          } as DataRegistry,
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
   * @param ownerAddress owner wallet address
   * @returns Promise<DataRegistry>
   */
  async getDataRegistryByOwner(ownerAddress: string) {
    const address = ownerAddress.toLowerCase();
    const query = gql`
    {
      dataRegistries(
        filter: {dapp: {equalTo: "${address}"}}
        first: 1
      ) {
        nodes {
          address
          blockHeight
          dapp
          uri
        }
      }
    }
    `;
    const onchainData: {
      dataRegistries: {
        nodes: Array<{
          address: string;
          blockHeight: string;
          dapp: string;
          uri: string;
        }>;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    if (
      !onchainData.dataRegistries.nodes ||
      onchainData.dataRegistries.nodes.length == 0
    ) {
      throw new Error('Data registry not found');
    }

    const dataRegistry = onchainData.dataRegistries.nodes[0];

    let providerData = await getDataRegistryMetadata(dataRegistry.uri);

    const blockTime = await getBlockTime(
      this.provider,
      dataRegistry.blockHeight
    );

    return {
      ...providerData,
      walletAddress: dataRegistry.dapp,
      providerAddress: dataRegistry.address,
      registeredAt: blockTime,
    } as DataRegistry;
  }

  /**
   * @param registryAddress data registry address
   * @returns Promise<DataRegistry>
   */
  async getDataRegistryInfo(registryAddress: string) {
    const query = gql`
      {
        dataRegistry(id: "${registryAddress.toLowerCase()}") {
          address
          blockHeight
          dapp
          uri
        }
      }
    `;
    const onchainData: {
      dataRegistry: {
        address: string;
        blockHeight: string;
        dapp: string;
        uri: string;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.dataRegistry) {
      throw new Error('Data registry not found');
    }

    let providerData = await getDataRegistryMetadata(
      onchainData.dataRegistry.uri
    );

    const blockTime = await getBlockTime(
      this.provider,
      onchainData.dataRegistry.blockHeight
    );

    return {
      ...providerData,
      walletAddress: onchainData.dataRegistry.dapp,
      providerAddress: onchainData.dataRegistry.address,
      registeredAt: blockTime,
    } as DataRegistry;
  }

  /**
   * @param collectionAddress collection address
   * @param tokenId token id
   * @returns Promise<Array NFT metadatas on dapp>
   */
  async getNFTMetaData(collectionAddress: string, tokenId: string) {
    const address = collectionAddress.toLowerCase();
    const queryNFT = gql`
      {
        nFT(id: "${address}-${tokenId}") {
          collection
          tokenId
          underlyingNFT {
            collection
            tokenId
          }
        }
      }
    `;
    const nftData: {
      nFT: {
        collection: string;
        tokenId: string;
        underlyingNFT?: {
          collection: string;
          tokenId: string;
        };
      };
    } = await this.subqueryService.queryDataOnChain(queryNFT, this.chainId);

    const isDerivative = nftData.nFT?.underlyingNFT;

    const originCollection = isDerivative
      ? nftData.nFT.underlyingNFT!.collection
      : address;
    const originTokenId = isDerivative
      ? nftData.nFT.underlyingNFT!.tokenId
      : tokenId;

    const query = gql`
      {
        dataRegistryNFTData(
          orderBy: BLOCK_HEIGHT_DESC
          filter: {
            collection: {
              equalTo: "${originCollection}"
            }
            tokenId: { equalTo: "${originTokenId}" }
            ${isDerivative ? `dataRegistryId: { equalTo: "${address}" }` : ''}
          }
        ) {
          nodes {
            id
            collection
            tokenId
            key
            value
            dataRegistry {
              id
              uri
            }
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      dataRegistryNFTData: {
        nodes: Array<{
          id: string;
          collection: string;
          tokenId: string;
          key: string;
          value: string;
          dataRegistry: {
            id: string;
            uri: string;
          };
        }>;
        totalCount: number;
      };
    } = await this.subqueryService.queryDataOnChain(query, this.chainId);

    let dappDatas: Array<{
      id: string;
      uri: string;
      metadatas: Array<{key: string; value: string}>;
    }> = [];
    onchainData.dataRegistryNFTData.nodes.forEach(dapp => {
      let available = dappDatas.find(item => item.id === dapp.dataRegistry.id);
      if (available) {
        available.metadatas.push({key: dapp.key, value: dapp.value});
      } else {
        dappDatas.push({
          ...dapp.dataRegistry,
          metadatas: [{key: dapp.key, value: dapp.value}],
        });
      }
    });

    const nftMetaDatas = await Promise.all(
      dappDatas.map(async dapp => {
        const providerData: DataRegistry = await getDataRegistryMetadata(
          dapp.uri
        );

        const dappMetadataSchema = providerData.schemas;
        if (!dappMetadataSchema || !dappMetadataSchema.jsonSchema) {
          throw new Error(`Schema of dapp ${dapp.id} not found`);
        }

        const jsonSchema = convertToNFTSchema(dappMetadataSchema.jsonSchema);
        const schemas = separateJsonSchema(jsonSchema) as any[];

        const metadatas = dapp.metadatas.map(item => {
          const schema = getSchemaByHash(schemas, item.key);
          if (!schema) {
            console.error(`Schema for key ${item.key} not found`);
            return {};
          }

          const decodedValue = decodeDataFromString(schema, item.value);
          return decodedValue;
        });

        return {
          ...providerData,
          providerAddress: dapp.id,
          schemas,
          metadatas,
        };
      })
    );

    return nftMetaDatas;
  }
}
