export const OnchainCollectionQuery = `
  timestamp
  chainId
  address
  owner
  kind`;

export type OnchainCollection = {
  timestamp: string;
  chainId: number;
  address: string;
  owner: string;
  kind: number;
};

export const OnchainNFTQuery = `
  chainId
  timestamp
  isBurned
  isDerived
  owner
  collection
  tokenId
  tokenUri
  underlyingNFT {
    collection
    tokenId
    tokenUri
  }`;

export type OnchainNFT = {
  chainId: number;
  timestamp: string;
  isBurned: string;
  isDerived: string;
  owner: string;
  collection: string;
  tokenId: string;
  tokenUri: string;
  underlyingNFT?: {
    collection: string;
    tokenId: string;
    tokenUri: string;
  };
};

export const OnchainDappQuery = `
  chainId
  address
  timestamp
  dapp
  uri`;

export type OnchainDapp = {
  chainId: number;
  address: string;
  timestamp: string;
  dapp: string;
  uri: string;
};
