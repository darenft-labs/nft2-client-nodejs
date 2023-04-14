import {AuthClientOptions} from '../auth/authclient';

export interface ProtocolClientOptions {
  opts: AuthClientOptions;
  rpcUrl: string;
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

interface NFTDetail {
  id: number;
  contractAddress: string;
  tokenId: string;
  ownerAddress: string;
}

interface NFTMetadata {
  providerAddress: string;
  data: any;
}

export interface NFTDetailResponse {
  nft: NFTDetail;
  metadatas: NFTMetadata[];
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
