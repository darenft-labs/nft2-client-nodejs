import {ethers} from 'ethers';
import {ChainConfig, DataRegistry, Pagination} from './types';
import {gql} from 'graphql-request';
import {
  checkIsDerivable,
  getBlockTime,
  getDataRegistryMetadata,
  getNFTMetadata,
} from './utils/blockchain';
import {
  decodeDataFromString,
  encodeKeyByHash,
  getSchemaByHash,
  separateJsonSchema,
} from './utils/encoding-schema';
import {DYNAMIC_URI} from './consts';
import {subqueryService} from './services/subquery.service';

export class NFT2DataRegistry {
  chainId: number;
  provider: ethers.providers.JsonRpcProvider;

  constructor(config: ChainConfig, provider: ethers.providers.JsonRpcProvider) {
    this.chainId = config.chainId;
    this.provider = provider;
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
          filter: {chainId: {equalTo: ${this.chainId}}}
          first: ${pagination.limit}
          offset: ${pagination.offset}
          orderBy: ${orderBy}
        ) {
          nodes {
            address
            timestamp
            dapp
            uri
          }
          totalCount
        }
      }
    `;
    const onchainData: {
      dataRegistries: {
        nodes: Array<{
          address: string;
          timestamp: string;
          dapp: string;
          uri: string;
        }>;
        totalCount: number;
      };
    } = await subqueryService.queryDataOnChain(query, this.chainId);

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
            registeredAt: getBlockTime(item.timestamp),
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
        filter: {
          chainId: {equalTo: ${this.chainId}}
          dapp: {equalTo: "${address}"}
        }
        first: 1
      ) {
        nodes {
          address
          timestamp
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
          timestamp: string;
          dapp: string;
          uri: string;
        }>;
      };
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    if (
      !onchainData.dataRegistries.nodes ||
      onchainData.dataRegistries.nodes.length == 0
    ) {
      throw new Error('Data registry not found');
    }

    const dataRegistry = onchainData.dataRegistries.nodes[0];
    let providerData = await getDataRegistryMetadata(dataRegistry.uri);

    return {
      ...providerData,
      walletAddress: dataRegistry.dapp,
      providerAddress: dataRegistry.address,
      registeredAt: getBlockTime(dataRegistry.timestamp),
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
          timestamp
          dapp
          uri
        }
      }
    `;
    const onchainData: {
      dataRegistry: {
        address: string;
        timestamp: string;
        dapp: string;
        uri: string;
      };
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.dataRegistry) {
      throw new Error('Data registry not found');
    }

    let providerData = await getDataRegistryMetadata(
      onchainData.dataRegistry.uri
    );

    return {
      ...providerData,
      walletAddress: onchainData.dataRegistry.dapp,
      providerAddress: onchainData.dataRegistry.address,
      registeredAt: getBlockTime(onchainData.dataRegistry.timestamp),
    } as DataRegistry;
  }

  /**
   * @param collectionAddress collection address
   * @param tokenId token id
   * @returns Promise<Array NFT metadatas on dapp>
   */
  async getNFTMetaData(collectionAddress: string, tokenId: string) {
    const {isDerivative, originCollection, originTokenId} =
      await this.getOriginIfIsDerived(collectionAddress, tokenId);

    const query = gql`
      {
        dataRegistryNFTData(
          orderBy: BLOCK_HEIGHT_DESC
          filter: {
            chainId: {equalTo: ${this.chainId}}
            collection: {equalTo: "${originCollection}"}
            tokenId: {equalTo: "${originTokenId}"}
            ${
              isDerivative
                ? `dataRegistryId: {equalTo: "${collectionAddress.toLowerCase()}"}`
                : ''
            }
          }
        ) {
          nodes {
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
    } = await subqueryService.queryDataOnChain(query, this.chainId);

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

        const defaultSchema = providerData.schemas as any;
        const collectionSchemas = (providerData as any).collectionSchemas || [];
        let dappMetadataSchema = collectionSchemas.find(
          (schema: any) => schema.name === originCollection
        );
        if (!dappMetadataSchema) dappMetadataSchema = defaultSchema;

        if (!dappMetadataSchema || !dappMetadataSchema.jsonSchema) {
          throw new Error(`Schema of dapp ${dapp.id} not found`);
        }

        const schemas = separateJsonSchema(
          dappMetadataSchema.jsonSchema
        ) as any[];

        const decodeDatas = dapp.metadatas.map(item => {
          const schema = getSchemaByHash(schemas, item.key);
          if (!schema) {
            console.error(`Schema for key ${item.key} not found`);
            return {};
          }

          const decodedValue = decodeDataFromString(schema, item.value);
          return decodedValue;
        });

        const metadatas = schemas
          .map(schema => decodeDatas.find(item => schema.key in item))
          .filter(item => !!item);

        return {
          ...providerData,
          providerAddress: dapp.id,
          metadatas,
        };
      })
    );

    return nftMetaDatas;
  }

  /**
   * @param collectionAddress collection address
   * @param tokenId token id
   * @param providerAddress data registry address
   * @returns Promise<protocol metadatas>
   */
  async getNFTProtocolMetaData(
    collectionAddress: string,
    tokenId: string,
    providerAddress: string
  ) {
    const {originCollection, originTokenId} = await this.getOriginIfIsDerived(
      collectionAddress,
      tokenId
    );

    // specific keys for NFT2 Protocol
    const protocolKeys = [encodeKeyByHash(DYNAMIC_URI.key)];
    const query = gql`
      {
        dataRegistryNFTData(
          orderBy: BLOCK_HEIGHT_DESC
          filter: {
            chainId: {equalTo: ${this.chainId}}
            collection: {equalTo: "${originCollection}"}
            tokenId: {equalTo: "${originTokenId}"}
            dataRegistryId: {equalTo: "${providerAddress.toLowerCase()}"}
            key: {in: ["${protocolKeys.join('","')}"]}
          }
        ) {
          nodes {
            key
            value
          }
        }
      }
    `;
    const onchainData: {
      dataRegistryNFTData: {
        nodes: Array<{
          key: string;
          value: string;
        }>;
      };
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    const metadatas = onchainData.dataRegistryNFTData.nodes.map(item => {
      let decodedValue: any = null;
      const schemas = [DYNAMIC_URI];

      const schema = getSchemaByHash(schemas, item.key);
      if (!schema) {
        console.error(`Schema for key ${item.key} not found`);
      } else {
        decodedValue = decodeDataFromString(schema, item.value);
      }

      const key = decodedValue ? Object.keys(decodedValue)[0] : null;
      const value = key ? decodedValue[key] : null;
      return {key, value};
    });

    const dynamicUri = metadatas.find(
      item => item.key === DYNAMIC_URI.key
    )?.value;
    const dynamicDatas = dynamicUri
      ? await getNFTMetadata(this.provider, '', tokenId, dynamicUri)
      : null;

    return {
      metadatas,
      dynamicDatas,
    };
  }

  async getOriginIfIsDerived(collectionAddress: string, tokenId: string) {
    const address = collectionAddress.toLowerCase();
    const queryNFT = gql`
      {
        nFT(id: "${this.chainId}-${address}-${tokenId}") {
          underlyingNFT {
            collection
            tokenId
          }
        }
      }
    `;
    const nftData: {
      nFT: {
        underlyingNFT?: {
          collection: string;
          tokenId: string;
        };
      };
    } = await subqueryService.queryDataOnChain(queryNFT, this.chainId);

    const isDerivative = nftData.nFT?.underlyingNFT;
    const originCollection = isDerivative
      ? nftData.nFT.underlyingNFT!.collection
      : address;
    const originTokenId = isDerivative
      ? nftData.nFT.underlyingNFT!.tokenId
      : tokenId;

    return {
      isDerivative,
      originCollection,
      originTokenId,
    };
  }
}
