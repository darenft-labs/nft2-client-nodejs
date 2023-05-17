import {ethers, Wallet} from 'ethers';

import GeneralNFTABI from './abis/general-nft.abi.json';

export const getProvider = (rpcUrl: string) => {
  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

export const getSigner = (
  rpcUrl: string,
  opts: {privateKey?: string; mnemonic?: string}
) => {
  let signer: Wallet;

  if (opts?.privateKey?.length) {
    signer = new Wallet(
      opts.privateKey.includes('0x') ? opts.privateKey : `0x${opts.privateKey}`,
      getProvider(rpcUrl)
    );
  } else {
    signer = Wallet.fromMnemonic(opts?.mnemonic || '').connect(
      getProvider(rpcUrl)
    );
  }

  return signer;
};

export const getInfos = async (
  signer: ethers.Wallet,
  nftContractAddress: string
) => {
  const {chainId} = await signer.provider.getNetwork();

  const nftContract = new ethers.Contract(
    nftContractAddress,
    GeneralNFTABI,
    signer
  );

  return {
    signer,
    nftContract,
    chainId,
  };
};
