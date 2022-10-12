import {ethers, Wallet} from 'ethers';

import ManagerFixtureABI from './abis/manager-fixture.abi.json';
import MetadataFactoryABI from './abis//metadata-factory.abi.json';
import MetadataTemplateABI from './abis/metadata-template.abi.json';
import MetadataFactoryHelperABI from './abis/metadata-factory-helper.json';

interface Map {
  [key: number]: any;
}

const PROTOCOL_CONTRACTS = {
  97: {
    managerFixtureAddr: '0x4265c3fC37973ee042F3A9849d99B32C71964CBC',
    templateFixtureAddr: '0x2e031Cc5a1E684C9Cd1B8c6A5c34c2B698F0D2F6',
    factoryFixtureAddr: '0xBEe93f0411dcCF50047E44698486DA43d94174Be',
    helperAddr: '0xc93C78d31A6C4D76590346634CDc63e61E92be4b',
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

export const getInfos = async (signer: ethers.Wallet) => {
  const {chainId} = await signer.provider.getNetwork();

  const info = PROTOCOL_CONTRACTS?.[chainId];
  if (!info) {
    throw new Error('Chain id not supported');
  }

  const {
    managerFixtureAddr,
    templateFixtureAddr,
    factoryFixtureAddr,
    helperAddr,
  } = info;

  const managerFixture = new ethers.Contract(
    managerFixtureAddr,
    ManagerFixtureABI,
    signer
  );

  const factoryFixture = new ethers.Contract(
    factoryFixtureAddr,
    MetadataFactoryABI,
    signer
  );

  const templateFixture = new ethers.Contract(
    templateFixtureAddr,
    MetadataTemplateABI,
    signer
  );

  const helper = new ethers.Contract(
    helperAddr,
    MetadataFactoryHelperABI,
    signer
  );

  return {
    signer,
    managerFixture,
    templateFixture,
    factoryFixture,
    helper,
  };
};
