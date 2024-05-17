import {DataRegistry} from './data-registry';

export interface Collection {
  name: string;
  symbol: string;
  imageUrl: string;
  contractAddress: string;
  ownerAddress: string;
  creatorAddress: string;
  chainId: number;
  type: number;
  deployedAt: Date;
  totalNfts: number;
  totalOwners: number;
  kind: number;
  defaultRoyalty: number;
}

export interface NFT {
  name: string;
  description: string;
  tokenId: string;
  chainId: number;
  creatorAddress: string;
  ownerAddress: string;
  imageUrl: string;
  tokenUri: string;
  type: number;
  status: number;
  mintedAt: Date;
  attributes: any[];
  openAt?: Date;
  closeAt?: Date;
  royalties?: number;
  collection: Collection;
  original?: {
    collectionAddress: string;
    tokenId: string;
  };
  dataRegistry?: DataRegistry;
}
