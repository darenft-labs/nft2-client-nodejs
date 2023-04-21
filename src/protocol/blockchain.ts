import {BigNumber, ethers, utils, Wallet} from 'ethers';

import ManagerFixtureABI from './abis/manager-fixture.abi.json';
import GeneralNFTABI from './abis/general-nft.abi.json';

interface Map {
  [key: number]: any;
}

const PROTOCOL_CONTRACTS = {
  97: {
    keyManagerAddr: '0xcbd0225f225e8b7907a70be88dc34752b47a5b86',
  },
} as Map;

const SHIFT_LEFT = 64;

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

export const getChannel = (
  nftContractAddress: string,
  tokenId: string
): string => {
  const newChannel = BigNumber.from(
    utils.keccak256(
      utils.defaultAbiCoder.encode(
        ['address', 'uint256'],
        [nftContractAddress, tokenId]
      )
    )
  )
    .shr(128)
    .toString();
  return newChannel;
};
