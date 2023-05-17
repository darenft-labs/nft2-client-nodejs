import {Service} from 'typedi';
import {AuthService} from './auth.service';
import {NFTDetailRequest, NFTDetailResponse} from './interfaces';
import {buildURLQuery} from './utils';

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
}
