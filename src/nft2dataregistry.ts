import {ethers} from 'ethers';
import {
  ChainConfig,
  DataRegistry,
  OnchainDapp,
  OnchainDappQuery,
  Pagination,
} from './types';
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
import {constructDappResponse} from './utils';

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
        const isOk = needFilter
          ? await checkIsDerivable(
              this.provider,
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
          ${OnchainDappQuery}
        }
      }
    }
    `;
    const onchainData: {
      dataRegistries: {
        nodes: Array<OnchainDapp>;
      };
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    if (
      !onchainData.dataRegistries.nodes ||
      onchainData.dataRegistries.nodes.length == 0
    ) {
      throw new Error('Data registry not found');
    }

    return await constructDappResponse(onchainData.dataRegistries.nodes[0]);
  }

  /**
   * @param registryAddress data registry address
   * @returns Promise<DataRegistry>
   */
  async getDataRegistryInfo(registryAddress: string) {
    const query = gql`
      {
        dataRegistry(id: "${registryAddress.toLowerCase()}") {
          ${OnchainDappQuery}
        }
      }
    `;
    const onchainData: {
      dataRegistry: OnchainDapp;
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    if (!onchainData.dataRegistry) {
      throw new Error('Data registry not found');
    }

    return await constructDappResponse(onchainData.dataRegistry);
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
              ${OnchainDappQuery}
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
          dataRegistry: OnchainDapp;
        }>;
        totalCount: number;
      };
    } = await subqueryService.queryDataOnChain(query, this.chainId);

    let dappDatas: Array<{
      dapp: OnchainDapp;
      metadatas: Array<{key: string; value: string}>;
    }> = [];
    onchainData.dataRegistryNFTData.nodes.forEach(dapp => {
      let available = dappDatas.find(
        item => item.dapp.address === dapp.dataRegistry.address
      );
      if (available) {
        available.metadatas.push({key: dapp.key, value: dapp.value});
      } else {
        dappDatas.push({
          dapp: dapp.dataRegistry,
          metadatas: [{key: dapp.key, value: dapp.value}],
        });
      }
    });

    const nftMetaDatas = await Promise.all(
      dappDatas.map(async dappData => {
        const providerData = await constructDappResponse(dappData.dapp);

        const defaultSchema = providerData.schemas as any;
        const collectionSchemas = (providerData as any).collectionSchemas || [];
        let dappMetadataSchema = collectionSchemas.find(
          (schema: any) => schema.name === originCollection
        );
        if (!dappMetadataSchema) dappMetadataSchema = defaultSchema;

        if (!dappMetadataSchema || !dappMetadataSchema.jsonSchema) {
          throw new Error(
            `Schema of dapp ${providerData.providerAddress} not found`
          );
        }

        const schemas = separateJsonSchema(
          dappMetadataSchema.jsonSchema
        ) as any[];

        const decodeDatas = dappData.metadatas.map(item => {
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
