export interface FreemintInfoResponse {
  walletAddress?: string;
  amount?: string;
  tokenId?: string;
  tokenUri?: string;
  tokenUriIPFS?: string;
  leaf?: string;
  proof?: Array<string>;
}

export interface ClaimTokenUriInfoResponse {
  tokenId?: string;
  tokenUri?: string;
  tokenUriIPFS?: string;
  leaf?: string;
  proof?: Array<string>;
}
