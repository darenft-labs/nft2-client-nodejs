import {Service} from 'typedi';
import {AuthService} from './auth.service';
import {
  NFTDetailResponse,
  NFTDetailRequest,
  NFTProviderRequest,
  NFTProviderResponse,
  NFTMetadataRequest,
  NFTTransactionHistoryRequest,
  NFTTransactionHistoryResponse,
  NFTRequest,
  NFTsResponse,
  BasicNFTsResponse,
  NFTTokenURIResponse,
} from '../types/interfaces';
import {buildURLQuery} from '../utils';

@Service()
export class NFTService {
  constructor(private authService: AuthService) {}

  /**
   * @param nftContractAddress nft contract address
   * @param tokenId token id of nft
   * @returns nft detail info
   */
  async getNFTDetail(query: NFTDetailRequest): Promise<NFTDetailResponse> {
    const params = buildURLQuery({
      contract_address: query.contractAddress,
      chain_id: query.chainId,
    });

    const result = await this.authService.auth.request<NFTDetailResponse>({
      url: `${this.authService.getHostPath()}/client/nfts/${
        query.tokenId
      }${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTProviders(
    query: NFTProviderRequest
  ): Promise<NFTProviderResponse> {
    const params = buildURLQuery({
      contract_address: query.contractAddress,
      chain_id: query.chainId,
      limit: query.limit,
      offset: query.offset,
    });

    const result = await this.authService.auth.request<NFTProviderResponse>({
      url: `${this.authService.getHostPath()}/client/nfts/${
        query.tokenId
      }/providers${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTMetadatas(query: NFTMetadataRequest): Promise<any> {
    const params = buildURLQuery({
      contract_address: query.contractAddress,
      chain_id: query.chainId,
      provider_address: query.providerAddress,
    });

    const result = await this.authService.auth.request({
      url: `${this.authService.getHostPath()}/client/nfts/${
        query.tokenId
      }/metadatas${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTTransactionHistory(
    query: NFTTransactionHistoryRequest
  ): Promise<NFTTransactionHistoryResponse> {
    const params = buildURLQuery({
      filter: query.filter,
      limit: query.limit,
      offset: query.offset,
    });

    const result =
      await this.authService.auth.request<NFTTransactionHistoryResponse>({
        url: `${this.authService.getHostPath()}/client/transactions${params}`,
        method: 'GET',
      });

    return result?.data;
  }

  async getNFTDetails(query: NFTDetailRequest[]): Promise<NFTsResponse> {
    const result = await this.authService.auth.request<NFTsResponse>({
      url: `${this.authService.getHostPath()}/client/nfts/get-nft-details`,
      method: 'POST',
      data: {
        queryParams: query,
      },
    });

    return result?.data;
  }

  async getNFTs(query: NFTRequest): Promise<BasicNFTsResponse> {
    const params = buildURLQuery({
      filter: query.filter,
      limit: query.limit,
      offset: query.offset,
    });

    const result = await this.authService.auth.request<BasicNFTsResponse>({
      url: `${this.authService.getHostPath()}/client/nfts${params}`,
      method: 'GET',
    });

    return result?.data;
  }

  async getNFTTokenURIs(
    query: NFTDetailRequest[]
  ): Promise<NFTTokenURIResponse> {
    const result = await this.authService.auth.request<NFTTokenURIResponse>({
      url: `${this.authService.getHostPath()}/client/nft-token-uris/get-nft-token-uris`,
      method: 'POST',
      data: {
        queryParams: query,
      },
    });

    return result?.data;
  }
}
