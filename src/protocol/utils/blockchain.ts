import {ethers, Wallet} from 'ethers';

export enum Chain {
  BSC = 56,
  BSC_TESTNET = 97,
}

export const getProvider = (rpcUrl: string) => {
  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

export const getSigner = (opts: {privateKey?: string; mnemonic?: string}) => {
  let signer: Wallet;

  if (opts?.privateKey?.length) {
    signer = new Wallet(
      opts.privateKey.includes('0x') ? opts.privateKey : `0x${opts.privateKey}`
    );
  } else {
    signer = Wallet.fromMnemonic(opts?.mnemonic || '');
  }

  return signer;
};
