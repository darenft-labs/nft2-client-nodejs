import axios from 'axios';
import {ethers} from 'ethers';
import {convertIPFSToUri, convertUrlToIPFS} from './ipfs';
import CONTRACT_ABI from '../abis/contract-v2.abi.json';
import REGISTRY_ABI from '../abis/registry-v2.abi.json';
import {LongevityStatus} from '../consts';

export const getTokenURI = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
  tokenId: string
) => {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABI,
      provider
    );
    const uri = await contract.tokenURI(tokenId);
    return uri;
  } catch (err) {
    return '';
  }
};

export const getCollectionInfo = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string
) => {
  const myContract = new ethers.Contract(
    contractAddress,
    CONTRACT_ABI,
    provider
  );

  const name = await myContract.name();
  const symbol = await myContract.symbol();
  const royaltyInfo = await myContract.royaltyInfo(0, 10000);

  return {
    name,
    symbol,
    contract: myContract,
    royaltyInfo: {
      receiver: royaltyInfo.receiver,
      rate: royaltyInfo.royaltyAmount.toString(),
    },
  };
};

export const getBlockTime = async (
  provider: ethers.providers.JsonRpcProvider,
  blockNumber: number | string
) => {
  if (!blockNumber) return null;
  const blockInfo = await provider.getBlock(parseInt(blockNumber.toString()));
  const blockTime = new Date(blockInfo.timestamp * 1000);
  return blockTime;
};

export const checkIsDerivable = async (
  provider: ethers.providers.JsonRpcProvider,
  registryAddress: string,
  collection: string,
  tokenId: string
) => {
  const registryContract = new ethers.Contract(
    registryAddress,
    REGISTRY_ABI,
    provider
  );

  const isDerivable: boolean = await registryContract.isDerivable(
    collection,
    tokenId
  );

  return isDerivable;
};

export const getDerivedInfo = async (
  provider: ethers.providers.JsonRpcProvider,
  registryAddress: string,
  underlyingCollection: string,
  underlyingtokenId: string
) => {
  const registryContract = new ethers.Contract(
    registryAddress,
    REGISTRY_ABI,
    provider
  );

  const derivedInfo = await registryContract.derivedOf(
    underlyingCollection,
    underlyingtokenId
  );

  const royaltyInfo = await registryContract.royaltyInfo(
    derivedInfo.tokenId.toString(),
    10000
  );

  return {
    collection: derivedInfo.collection,
    tokenId: derivedInfo.tokenId.toString(),
    startTime: new Date(parseInt(derivedInfo.startTime.toString() + '000')),
    endTime: new Date(parseInt(derivedInfo.endTime.toString() + '000')),
    royaltyInfo: {
      receiver: royaltyInfo.receiver,
      rate: royaltyInfo.royaltyAmount.toString(),
    },
  };
};

export const getNFTStatus = (
  isBurned: string,
  derivedInfo?: {
    startTime: Date;
    endTime: Date;
  }
) => {
  let nftStatus = 0;
  if (isBurned) nftStatus = -1;
  else if (derivedInfo) {
    const now = new Date();
    if (now < derivedInfo.startTime) {
      nftStatus = LongevityStatus.Minted;
    } else if (now <= derivedInfo.endTime) {
      nftStatus = LongevityStatus.Activated;
    } else {
      nftStatus = LongevityStatus.Expired;
    }
  }
  return nftStatus;
};

export const getNFTMetadata = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
  tokenId: string
) => {
  try {
    const tokenURI = await getTokenURI(provider, contractAddress, tokenId);
    const metaData = tokenURI
      ? (await axios.get(convertIPFSToUri(tokenURI)))?.data
      : {};

    return {...metaData, tokenUri: convertUrlToIPFS(tokenURI), tokenId};
  } catch (error) {
    return {};
  }
};

export const getDataRegistryMetadata = async (dappUri: string) => {
  try {
    const providerData = dappUri
      ? (await axios.get(convertIPFSToUri(dappUri)))?.data
      : {};

    return {...providerData, registryUrl: convertUrlToIPFS(dappUri)};
  } catch (error) {
    return {registryUrl: convertUrlToIPFS(dappUri)};
  }
};
