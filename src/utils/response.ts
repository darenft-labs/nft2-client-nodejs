import {ethers} from 'ethers';
import {
  Collection,
  CollectionAPI,
  DappAPI,
  DataRegistry,
  NFT,
  NFTAPI,
  OnchainCollection,
  OnchainDapp,
  OnchainNFT,
} from '../types';
import {
  getBlockTime,
  getCollectionInfo,
  getDataRegistryMetadata,
  getDerivedInfo,
  getNFTMetadata,
  getNFTStatus,
} from './blockchain';
import {NFTContractType} from '../consts';

export const constructCollectionResponse = async (
  provider: ethers.providers.JsonRpcProvider,
  collection: OnchainCollection,
  nftInfo: any = {}
) => {
  const collectionInfo = await getCollectionInfo(provider, collection.address);

  return {
    name: collectionInfo.name,
    symbol: collectionInfo.symbol,
    imageUrl: nftInfo.firstNft?.image ?? null,
    contractAddress: collection.address,
    ownerAddress: collection.owner,
    creatorAddress: collection.owner,
    chainId: collection.chainId,
    type: NFTContractType.Original, // always original
    deployedAt: getBlockTime(collection.timestamp),
    totalNfts: nftInfo.totalNfts ?? null,
    totalOwners: nftInfo.totalOwners ?? null,
    kind: collection.kind,
    defaultRoyalty: collectionInfo.royaltyInfo.rate,
  } as Collection;
};

export const constructNFTResponse = async (
  provider: ethers.providers.JsonRpcProvider,
  nft: OnchainNFT,
  collection?: Collection,
  dapp?: OnchainDapp,
  originNftMetaData?: any
) => {
  const nftMetaData = originNftMetaData
    ? originNftMetaData
    : await getNFTMetadata(
        provider,
        nft.underlyingNFT ? nft.underlyingNFT.collection : nft.collection,
        nft.underlyingNFT ? nft.underlyingNFT.tokenId : nft.tokenId,
        nft.underlyingNFT ? nft.underlyingNFT.tokenUri : nft.tokenUri
      );

  const dataRegistry = dapp
    ? await constructDappResponse(dapp)
    : {providerAddress: nft.collection};

  const derivedInfo = nft.underlyingNFT
    ? await getDerivedInfo(
        provider,
        nft.collection,
        nft.underlyingNFT.collection,
        nft.underlyingNFT.tokenId
      )
    : null;

  return {
    name: nftMetaData.name,
    description: nftMetaData.description,
    tokenId: nft.tokenId,
    chainId: nft.chainId,
    creatorAddress: collection?.ownerAddress,
    ownerAddress: nft.owner,
    imageUrl: nftMetaData.image ?? null,
    tokenUri: nftMetaData.tokenUri,
    tokenUriGateway: nftMetaData.tokenUriGateway,
    type: nft.underlyingNFT
      ? NFTContractType.Derivative
      : NFTContractType.Original,
    status: getNFTStatus(nft.isBurned, derivedInfo ?? undefined),
    mintedAt: getBlockTime(nft.timestamp),
    attributes: nftMetaData.attributes,
    royalties: collection?.defaultRoyalty,
    collection: collection,
    ...(nft.underlyingNFT
      ? {
          openAt: derivedInfo?.startTime,
          closeAt: derivedInfo?.endTime,
          royalties: derivedInfo?.royaltyInfo.rate,
          original: {
            collectionAddress: nft.underlyingNFT.collection,
            tokenId: nft.underlyingNFT.tokenId,
          },
          dataRegistry: dataRegistry,
        }
      : {}),
  } as NFT;
};

export const constructDappResponse = async (dapp: OnchainDapp) => {
  let providerData = await getDataRegistryMetadata(dapp.uri);

  return {
    ...providerData,
    chainId: dapp.chainId,
    walletAddress: dapp.dapp,
    providerAddress: dapp.address,
    registeredAt: getBlockTime(dapp.timestamp),
  } as DataRegistry;
};

export const constructCollectionLiteResponse = (
  collection: OnchainCollection
) => {
  return {
    contractAddress: collection.address,
    ownerAddress: collection.owner,
    creatorAddress: collection.owner,
    chainId: collection.chainId,
    type: NFTContractType.Original, // always original
    deployedAt: getBlockTime(collection.timestamp),
    kind: collection.kind,
  } as Collection;
};

export const constructNFTLiteResponse = (
  nft: OnchainNFT,
  collection?: Collection
) => {
  return {
    chainId: nft.chainId,
    collection: {
      contractAddress: nft.underlyingNFT
        ? nft.underlyingNFT.collection
        : nft.collection,
      ...(collection ? collection : {}),
    },
    ownerAddress: nft.owner,
    tokenId: nft.tokenId,
    tokenUri: nft.tokenUri,
    type: nft.underlyingNFT
      ? NFTContractType.Derivative
      : NFTContractType.Original,
    status: getNFTStatus(nft.isBurned),
    mintedAt: getBlockTime(nft.timestamp),
    ...(nft.underlyingNFT
      ? {
          original: {
            collectionAddress: nft.underlyingNFT.collection,
            tokenId: nft.underlyingNFT.tokenId,
          },
        }
      : {}),
  } as NFT;
};

export const constructCollectionCachedResponse = (
  collection: CollectionAPI
) => {
  return {
    name: collection.name,
    symbol: collection.symbol,
    imageUrl: collection.imageUrl,
    contractAddress: collection.contractAddress,
    ownerAddress: collection.ownerAddress,
    creatorAddress: collection.creatorAddress,
    chainId: collection.chainId,
    type: collection.type,
    deployedAt: collection.deployedAt,
    totalNfts: collection.totalNfts,
    totalOwners: collection.totalOwners,
    kind: collection.kind,
    defaultRoyalty: collection.defaultRoyalty
      ? parseFloat(collection.defaultRoyalty)
      : 0,
  } as Collection;
};

export const constructNFTCachedResponse = (nft: NFTAPI) => {
  return {
    name: nft.name,
    description: nft.description,
    tokenId: nft.tokenId,
    chainId: nft.chainId,
    creatorAddress: nft.creatorAddress,
    ownerAddress: nft.ownerAddress,
    imageUrl: nft.imageUrl,
    tokenUri: nft.tokenUriIPFS,
    tokenUriGateway: nft.tokenUri,
    type: nft.type,
    status: nft.status,
    mintedAt: nft.mintedAt,
    attributes: nft.attributes,
    collection: constructCollectionCachedResponse(nft.nftContract),
    ...(nft.original
      ? {
          openAt: nft.openAt,
          closeAt: nft.closeAt,
          royalties: nft.royalties ? parseFloat(nft.royalties) : 0,
          original: {
            collectionAddress: nft.original.nftContractAddress,
            tokenId: nft.original.tokenId,
          },
          dataRegistry: {providerAddress: nft.nftContractAddress},
        }
      : {}),
  } as NFT;
};

export const constructDappCachedResponse = (dapp: DappAPI) => {
  return {
    name: dapp.name,
    description: dapp.description,
    url: dapp.url,
    chainId: dapp.chainId,
    providerAddress: dapp.providerAddress,
    walletAddress: dapp.walletAddress,
    registryUrl: dapp.registryUrlIPFS,
    registryUrlGateway: dapp.registryUrl,
    registeredAt: dapp.registeredAt,
    schemas: dapp.schemas,
    collectionSchemas: dapp.collectionSchemas,
  } as DataRegistry;
};
