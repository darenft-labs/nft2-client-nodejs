import {ethers} from 'ethers';
import {
  Collection,
  DataRegistry,
  NFT,
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
      contractAddress: nft.collection,
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
  } as NFT;
};
