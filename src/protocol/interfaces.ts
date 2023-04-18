import {AuthClientOptions} from '../auth/authclient';

export interface ProtocolClientOptions {
  opts: AuthClientOptions;
  rpcUrl: string;
  privateKey?: string;
  mnemonic?: string;
  version: string;
}

export interface Provider {
  id: number;
  name: string;
  description: string;
  providerAddress: string;
  providerType: number;
  url: string;
}

export interface ProviderSchemaResponse {
  id: number;
  jsonSchema: object;
  version: number;
  name: string;
  status: number;
  parentId: number;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  providerId: number;
  provider: Provider;
}

export interface NFTMetadataUpdateRequest {
  tokenId: string;
  nftContractAddress: string;
  tokenData: any;
  schema: any;
}

interface Nonce {
  type: 'BigNumber';
  hex: string;
}

interface Call {
  target: string;
  data: string;
}

export interface NFTMetadataUpdateResponse {
  calls: Call[];
  nonces: Nonce[];
  signatures: string[];
  rootSignature: string;
}

interface NFTContract {
  id: string;
  name: string;
  symbol: string;
  description: string;
  contractAddress: string;
  creatorAddress: string;
  ownerAddress: string;
  originalNFTContractAddress: string;
  originalTokenId: string;
  parentNFTContractAddress: string;
  parentTokenId: string;
  chainId: number;
  imageUrl: string;
  type: number;
  royaltyRate: string;
  royalties: string;
  deployedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NFTDetailResponse {
  id: string;
  name: string;
  description: string;
  tokenId: string;
  chainId: number;
  creatorAddress: string;
  ownerAddress: string;
  imageUrl: string;
  type: number;
  royalties: string;
  mintedAt: string;
  closeAt: string;
  openAt: string;
  createdAt: string;
  updatedAt: string;
  nftContractAddress: string;
  nftContract: NFTContract;
}

export interface NFTDetailRequest {
  contractAddress: string;
  tokenId: string;
  chainId: number;
}

export interface NFTProviderRequest {
  tokenId: string;
  contractAddress: string;
  chainId: number;
  limit: number;
  offset: number;
}

export interface NFTProviderResponse {
  items: Provider[];
  total: number;
}

export interface NFTMetadataRequest {
  tokenId: string;
  contractAddress: string;
  chainId: number;
  providerAddress: string;
}

export interface NFTTransactionHistoryRequest {
  filter: {
    tokenId: string;
    contractAddress: string;
    chainId: number;
  };
  limit: number;
  offset: number;
}

export interface NFTTransactionHistory {
  id: number;
  eventType: string;
  tokenId: string;
  chainId: number;
  nftContractAddress: string;
  txHash: string;
  blockNumber: number;
  txIndex: number;
  logIndex: number;
  timestamps: number;
  fromAddress: string;
  toAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface NFTTransactionHistoryResponse {
  items: NFTTransactionHistory[];
  total: number;
}
