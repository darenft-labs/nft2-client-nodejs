export interface TokenBalancesResponse {
  royalties: Array<{
    contract_decimals: number;
    contract_name: string;
    contract_address: string;
    contract_display_name: string;
    contract_ticker_symbol: string;
    is_native: boolean;
    balance: string;
    quote_rate: number;
    quote: number;
    logo_url: string;
    native_token?: string;
  }>;
}

export interface CollectionsAPIResponse {
  items: CollectionAPI[];
  total: number;
}

export interface CollectionAPI {
  id: number;
  name: string;
  symbol: string;
  description: string;
  contractAddress: string;
  creatorAddress: string;
  ownerAddress: string;
  chainId: number;
  imageUrl: string;
  type: number;
  defaultRoyalty: string;
  deployedAt: Date;
  totalNfts: number;
  totalOwners: number;
  kind: number;
  isFreeMintable: number;
  isSemiTransferable: number;
  isSoulBound: number;
}

export interface NFTsAPIResponse {
  items: NFTAPI[];
  total: number;
}

export interface NFTAPI {
  id: number;
  name: string;
  description: string;
  tokenId: string;
  chainId: number;
  creatorAddress: string;
  ownerAddress: string;
  imageUrl: string;
  tokenUri: string;
  type: number;
  royalties: string;
  status: number;
  mintedAt: Date;
  nftContractAddress: string;
  nftContractId: number;
  attributes: any[];
  nftContract: CollectionAPI;
  tokenUriIPFS: string;
  openAt?: Date;
  closeAt?: Date;
  original?: {
    nftContractAddress: string;
    tokenId: string;
  };
}

export interface DappAPIResponse {
  items: DappAPI[];
  total: number;
}

export interface DappAPI {
  name: string;
  description: string;
  url: string;
  chainId: number;
  providerAddress: string;
  walletAddress: string;
  registryUrl: string;
  registryUrlIPFS: string;
  registeredAt: Date;
  schemas: any;
  collectionSchemas: any[];
}
