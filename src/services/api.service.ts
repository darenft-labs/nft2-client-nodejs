import {OAuth2Client} from '../auth/oauth2client';
import {
  ChainConfig,
  ChainConfigResponse,
  ClaimTokenUriInfoResponse,
  CollectionAPI,
  CollectionsAPIResponse,
  DappAPI,
  DappAPIResponse,
  FreemintInfoResponse,
  JsonUriMetadata,
  NFTAPI,
  NFTsAPIResponse,
  Pagination,
  PresignImageData,
  PresignedImageResponse,
  TokenBalancesResponse,
  UploadJsonUriRespone,
} from '../types';

export class APIService {
  apiKey: string;
  apiEndpoint: string;
  authClient: OAuth2Client;

  constructor(apiKey: string, apiEndpoint?: string) {
    this.authClient = new OAuth2Client({
      apiKey,
      apiEndpoint,
    });
  }

  /**
   * @returns all chain config
   */
  async getChainConfigs(): Promise<ChainConfig[]> {
    const result = await this.authClient.request<ChainConfigResponse[]>({
      url: `${this.authClient.url}/configs/internal-config-v2`,
      method: 'GET',
    });

    if (!result.data) return [];

    return result.data.map(item => ({
      chainId: item.chainId,
      providerUrl: item.internalConfig.PROVIDER_URL,
      factoryAddress: item.internalConfig.NFT_FACTORY_ADDRESS,
      subQueryEndpoint: item.internalConfig.SUB_QUERY_ENDPOINT,
    }));
  }

  /**
   * @param chainId id of chain
   * @param contractAddress collection contract address
   * @param campaignId campaign id
   * @param walletAddress user wallet address
   * @returns freemint info
   */
  async getFreeMintInfo(
    chainId: number,
    contractAddress: string,
    campaignId: string,
    walletAddress: string
  ): Promise<FreemintInfoResponse> {
    const result = await this.authClient.request<FreemintInfoResponse>({
      url: `${this.authClient.url}/freemint/get-free-mint-info`,
      method: 'GET',
      params: {
        chain_id: chainId,
        contract_address: contractAddress,
        campaign_id: campaignId,
        wallet_address: walletAddress,
      },
    });

    return result?.data ? result.data : {};
  }

  /**
   * @param chainId id of chain
   * @param contractAddress collection contract address
   * @param tokenId token id
   * @returns nft claim token uri info
   */
  async getClaimTokenUriInfo(
    chainId: number,
    contractAddress: string,
    tokenId: string | number
  ): Promise<ClaimTokenUriInfoResponse> {
    const result = await this.authClient.request<ClaimTokenUriInfoResponse>({
      url: `${this.authClient.url}/nfts/${tokenId}/claim-token-uri-info`,
      method: 'GET',
      params: {
        chain_id: chainId,
        contract_address: contractAddress,
      },
    });

    return result?.data ? result.data : {};
  }

  /**
   * @param data JsonUriMetadata
   * @param data.items array object uri data
   * @returns array uploaded tokenUri
   */
  async uploadJSONUriInfo(
    data: JsonUriMetadata
  ): Promise<UploadJsonUriRespone[]> {
    const result = await this.authClient.request<UploadJsonUriRespone[]>({
      url: `${this.authClient.url}/upload/json-uri`,
      method: 'POST',
      data: data,
    });

    return result?.data ? result.data : [];
  }

  /**
   * @param data PresignImageData
   * @param data.files array presign info (mimeType, fileName)
   * @returns object with array presigned url
   */
  async generatePresignedImage(
    data: PresignImageData
  ): Promise<PresignedImageResponse> {
    const result = await this.authClient.request<PresignedImageResponse>({
      url: `${this.authClient.url}/upload/presigned-image`,
      method: 'POST',
      data: data,
    });

    return result?.data ? result.data : {urls: []};
  }

  /**
   * @param chainId id of chain
   * @param walletAddress wallet address
   * @param currency Supports USD, CAD, EUR, SGD, INR, JPY, VND, CNY, KRW, RUB, TRY, NGN, ARS, AUD, CHF, and GBP. Default USD
   * @returns token balances of a wallet
   */
  async getTokenBalancesOfWallet(
    chainId: number,
    walletAddress: string,
    currency?: string
  ): Promise<TokenBalancesResponse> {
    const result = await this.authClient.request<TokenBalancesResponse>({
      url: `${this.authClient.url}/nfts/royalties/${chainId}/${walletAddress}`,
      method: 'GET',
      params: {
        currency: currency,
      },
    });

    return result?.data ? result.data : {royalties: []};
  }

  /**
   * @param chainIds ids of chain
   * @param pagination Pagination {offset, limit, sort, filter}
   * @returns CollectionAPIResponse
   */
  async getCollections(
    chainIds: number[],
    pagination: Pagination
  ): Promise<CollectionsAPIResponse> {
    const result = await this.authClient.request<CollectionsAPIResponse>({
      url: `${this.authClient.url}/collections`,
      method: 'GET',
      params: {
        chain_ids: chainIds.join(','),
        ...this.convertPaginationParams(pagination),
      },
    });

    return result?.data ? result.data : {items: [], total: 0};
  }

  /**
   * @param chainIds ids of chain
   * @param ownerAddress owner wallet address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @returns CollectionAPIResponse
   */
  async getCollectionsByOwner(
    chainIds: number[],
    ownerAddress: string,
    pagination: Pagination
  ): Promise<CollectionsAPIResponse> {
    const result = await this.authClient.request<CollectionsAPIResponse>({
      url: `${this.authClient.url}/asset/collections`,
      method: 'GET',
      params: {
        chain_ids: chainIds.join(','),
        wallet_address: ownerAddress,
        ...this.convertPaginationParams(pagination),
      },
    });

    return result?.data ? result.data : {items: [], total: 0};
  }

  /**
   * @param chainId id of chain
   * @param collectionAddress owner wallet address
   * @returns CollectionAPI
   */
  async getCollectionDetail(
    chainId: number,
    collectionAddress: string
  ): Promise<CollectionAPI | null> {
    const result = await this.authClient.request<CollectionAPI>({
      url: `${this.authClient.url}/collections/${collectionAddress}`,
      method: 'GET',
      params: {
        chain_id: chainId,
      },
    });

    return result?.data ? result.data : null;
  }

  /**
   * @param chainId id of chain
   * @param collectionAddress collection address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @returns NFTsAPIResponse
   */
  async getNFTsByCollection(
    chainId: number,
    collectionAddress: string,
    pagination: Pagination
  ): Promise<NFTsAPIResponse> {
    const result = await this.authClient.request<NFTsAPIResponse>({
      url: `${this.authClient.url}/nfts`,
      method: 'GET',
      params: {
        chain_id: chainId,
        contract_address: collectionAddress,
        ...this.convertPaginationParams(pagination),
      },
    });

    return result?.data ? result.data : {items: [], total: 0};
  }

  /**
   * @param chainIds ids of chain
   * @param ownerAddress owner address
   * @param pagination Pagination {offset, limit, sort, filter}
   * @returns NFTsAPIResponse
   */
  async getNFTsByOwner(
    chainIds: number[],
    ownerAddress: string,
    pagination: Pagination
  ): Promise<NFTsAPIResponse> {
    const result = await this.authClient.request<NFTsAPIResponse>({
      url: `${this.authClient.url}/asset/nfts`,
      method: 'GET',
      params: {
        chain_ids: chainIds.join(','),
        wallet_address: ownerAddress,
        ...this.convertPaginationParams(pagination),
      },
    });

    return result?.data ? result.data : {items: [], total: 0};
  }

  /**
   * @param chainId id of chain
   * @param originCollectionAddress collection address
   * @param originTokenId token id
   * @param pagination Pagination {offset, limit, sort, filter}
   * @returns NFTsAPIResponse
   */
  async getNFTsByOriginal(
    chainId: number,
    originCollectionAddress: string,
    originTokenId: string,
    pagination: Pagination
  ): Promise<NFTsAPIResponse> {
    const result = await this.authClient.request<NFTsAPIResponse>({
      url: `${this.authClient.url}/nfts/${originTokenId}/derivative`,
      method: 'GET',
      params: {
        chain_id: chainId,
        contract_address: originCollectionAddress,
        ...this.convertPaginationParams(pagination),
      },
    });

    return result?.data ? result.data : {items: [], total: 0};
  }

  /**
   * @param chainId id of chain
   * @param collectionAddress collection address
   * @param tokenId token id
   * @param providerAddress data registry address
   * @param derivedTokenId derived token id
   * @returns NFTAPI
   */
  async getNFTDetail(
    chainId: number,
    collectionAddress: string,
    tokenId: string,
    providerAddress?: string,
    derivedTokenId?: string
  ): Promise<NFTAPI | null> {
    const result = await this.authClient.request<NFTAPI>({
      url: `${this.authClient.url}/nfts/${tokenId}`,
      method: 'GET',
      params: {
        chain_id: chainId,
        contract_address: collectionAddress,
        ...(providerAddress && derivedTokenId
          ? {
              provider_address: providerAddress,
              derivative_token_id: derivedTokenId,
            }
          : {}),
      },
    });

    return result?.data ? result.data : null;
  }

  /**
   * @param chainIds ids of chain
   * @param pagination Pagination {offset, limit, sort, filter}
   * @returns DappAPIResponse
   */
  async getDataRegistries(
    chainIds: number[],
    pagination: Pagination
  ): Promise<DappAPIResponse> {
    const result = await this.authClient.request<DappAPIResponse>({
      url: `${this.authClient.url}/data-registries`,
      method: 'GET',
      params: {
        chain_ids: chainIds.join(','),
        ...this.convertPaginationParams(pagination),
      },
    });

    return result?.data ? result.data : {items: [], total: 0};
  }

  /**
   * @param chainId id of chain
   * @param registryAddress provider address
   * @returns DappAPI
   */
  async getDataRegistryInfo(
    chainId: number,
    registryAddress: string
  ): Promise<DappAPI | null> {
    const result = await this.authClient.request<DappAPI>({
      url: `${this.authClient.url}/data-registries/address/${registryAddress}`,
      method: 'GET',
      params: {
        chain_id: chainId,
      },
    });

    return result?.data ? result.data : null;
  }

  convertPaginationParams(pagination: Pagination) {
    return {
      size: pagination.limit,
      offset: pagination.offset,
      ...(pagination.sort
        ? {
            sort: `{"${pagination.sort.field}":"${pagination.sort.order}"}`,
          }
        : {}),
      ...(pagination.filter ? {filter: JSON.stringify(pagination.filter)} : {}),
    };
  }
}
