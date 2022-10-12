import {AuthClientOptions} from '../auth/authclient';

export interface ProtocolClientOptions {
  opts: AuthClientOptions;
  rpcUrl: string;
  privateKey?: string;
  mnemonic?: string;
}

export interface NFTMetadataConfig {
  id: number;
  tokenContractAddress: string;
  ownerAddress: string;
  schema?: any;
  webhook?: any;
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
