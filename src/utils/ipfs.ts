import {IPFS_PUBLIC_GATEWAY} from '../consts';

export const convertIPFSToUri = (url: string) => {
  if (url.includes('/ipfs/') || url.includes('ipfs://')) {
    const cid = url.split('/ipfs/').pop()!.split('ipfs://').pop();
    return `${IPFS_PUBLIC_GATEWAY}/${cid}`;
  } else return url;
};

export const convertUrlToIPFS = (url: string) => {
  if (url.includes('/ipfs/') || url.includes('ipfs://')) {
    const cid = url.split('/ipfs/').pop()!.split('ipfs://').pop();
    return `ipfs://${cid}`;
  } else return url;
};
