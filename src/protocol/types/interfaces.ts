import {AuthClientOptions} from '../../auth/authclient';
import {Chain} from '../utils';

export interface ProtocolClientOptions {
  opts: AuthClientOptions;
  chainId: Chain;
  privateKey?: string;
  mnemonic?: string;
}

export interface Provider {
  id: number;
  name: string;
  description: string;
  providerAddress: string;
  providerType: number;
  url: string;
  registryUrl: string;
  registeredAt: Date;
}

export interface ProviderSchemaResponse {
  id: number;
  jsonSchema: object;
  version: number;
  name: string;
  status: number;
  parentId: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  providerId: number;
  provider: Provider;
}

export interface ProviderVault {
  contractAddress: string;
  ownerAddress: string;
  chainId: number;
  type: number;
}

export interface ProviderVaultsResponse {
  items: ProviderVault[];
  total: number;
}

export interface NFTNonceResponse {
  nonce: string;
}

export interface NFTMetadataUpdateRequest {
  tokenId: string;
  nftContractAddress: string;
  tokenData: any;
  schema: any;
}

export interface NFTMetadataUpdateResponse {
  tokenId: string;
  dataKeys: string[];
  dataValues: string[];
  nonce: string;
  provider: string;
  providerSignature: string;
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

export interface NFTExtraData {
  providers: Provider;
}

export interface BasicNFTResponse {
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

export interface NFTDetailResponse extends BasicNFTResponse, NFTExtraData {}

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

export interface NFTRequest {
  filter: {
    ownerAddress?: string;
    contractAddress?: string;
    chainId?: number;
    includeLockingVault?: boolean;
  };
  size: number;
  offset: number;
}

export interface NFTsResponse {
  items: NFTDetailResponse[];
  total: number;
}

export interface BasicNFTsResponse {
  items: BasicNFTResponse[];
  total: number;
}

export interface NFTTokenURI {
  tokenId: string;
  contractAddress: string;
  chainId: number;
  uri: string;
}

export interface NFTTokenURIResponse {
  items: NFTTokenURI[];
  total: number;
}
