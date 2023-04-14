import {ethers, Wallet} from 'ethers';

import ManagerFixtureABI from './abis/manager-fixture.abi.json';
import GeneralNFTABI from './abis/general-nft.abi.json';

interface Map {
  [key: number]: any;
}

const PROTOCOL_CONTRACTS = {
  97: {
    keyManagerAddr: '0xbe5b27b31bf0D341582f7dc0fD39915d0F57f572',
  },
} as Map;

export const getProvider = (rpcUrl: string) => {
  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

export const getSigner = (
  rpcUrl: string,
  opts: {privateKey?: string; mnemonic?: string}
) => {
  let signer: Wallet;

  if (opts?.privateKey?.length) {
    signer = new Wallet(`0x${opts.privateKey}`, getProvider(rpcUrl));
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

  const info = PROTOCOL_CONTRACTS?.[chainId];
  if (!info) {
    throw new Error('Chain id not supported');
  }

  const {keyManagerAddr} = info;

  const managerFixture = new ethers.Contract(
    keyManagerAddr,
    ManagerFixtureABI,
    signer
  );

  const nftContract = new ethers.Contract(
    nftContractAddress,
    GeneralNFTABI,
    signer
  );

  return {
    signer,
    managerFixture,
    nftContract,
  };
};
