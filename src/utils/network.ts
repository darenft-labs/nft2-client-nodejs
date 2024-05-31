import {MAINNET, TESTNET} from '../consts';

export const checkNetworkIsMainnet = (chainId: number) => {
  if (MAINNET[chainId]) return true;
  else if (TESTNET[chainId]) return false;
  else throw new Error(`Chain ${chainId} is not supported!`);
};

export const getNetworkKey = (chainIdOrNetworkType: number | string) => {
  if (chainIdOrNetworkType === 'mainnet' || chainIdOrNetworkType === 'testnet')
    return chainIdOrNetworkType;
  return checkNetworkIsMainnet(chainIdOrNetworkType as number)
    ? 'mainnet'
    : 'testnet';
};
