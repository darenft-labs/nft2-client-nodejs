import {MerkleTree} from 'merkletreejs';
import keccak256 from 'keccak256';
import {ethers} from 'ethers';

export const buildWhitelistMerkleTree = (
  datas: {
    address: string;
    tokenIdOrAmount: number;
    tokenUri?: string;
  }[]
) => {
  const leafs: Buffer[] = datas.map(item =>
    keccak256(
      createWhitelistLeaf(
        item.address.toLowerCase(),
        item.tokenIdOrAmount,
        item.tokenUri
      )
    )
  );
  const tree = new MerkleTree(leafs, keccak256, {sortPairs: true});
  const rootHash = `0x${tree.getRoot().toString('hex')}`;

  let proofs: {[key: string]: string[]} = {};
  for (let i = 0; i < datas.length; i++) {
    proofs[`${datas[i].address.toLowerCase()}-${datas[i].tokenIdOrAmount}`] =
      tree.getHexProof(leafs[i]);
  }
  return {rootHash, proofs};
};

export const createWhitelistLeaf = (
  address: string,
  tokenIdOrAmount: number,
  tokenUri?: string
) => {
  if (!tokenUri) {
    return ethers.utils.defaultAbiCoder.encode(
      ['tuple(address,uint256)'],
      [[address, tokenIdOrAmount]]
    );
  } else
    return ethers.utils.defaultAbiCoder.encode(
      ['tuple(address,uint256,string)'],
      [[address, tokenIdOrAmount, tokenUri]]
    );
};

export const buildPreDefineMerkleTree = (
  datas: {
    tokenId: number;
    tokenUri: string;
  }[]
) => {
  const leafs: Buffer[] = datas.map(item =>
    keccak256(createPreDefineLeaf(item.tokenId, item.tokenUri))
  );
  const tree = new MerkleTree(leafs, keccak256, {sortPairs: true});
  const rootHash = `0x${tree.getRoot().toString('hex')}`;

  let proofs: {[key: string]: string[]} = {};
  for (let i = 0; i < datas.length; i++) {
    proofs[`${datas[i].tokenId}-${datas[i].tokenUri}`] = tree.getHexProof(
      leafs[i]
    );
  }
  return {rootHash, proofs};
};

export const createPreDefineLeaf = (tokenId: number, tokenUri: string) => {
  return ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'string'],
    [tokenId, tokenUri]
  );
};

export const generateCampaignId = (
  collection: string,
  kind: number,
  name: string,
  startTime: number,
  endTime: number,
  fee: number
) => {
  const feeValue = ethers.utils.parseEther(fee.toFixed(18));

  const data = keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint8', 'string', 'uint256', 'uint256', 'uint256'],
      [collection, kind, name, startTime, endTime, feeValue]
    )
  );

  return `0x${data.toString('hex')}`;
};

export const generateAddonSettings = (
  name: string,
  startTime: number,
  endTime: number,
  fee: number
) => {
  const feeValue = ethers.utils.parseEther(fee.toFixed(18));

  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(string,uint256,uint256,uint256)'],
    [[name, startTime, endTime, feeValue]]
  );
};
