export const MAINNET: {[key: number]: string} = {
  43114: 'AVAX',
  56: 'BNB',
};

export const TESTNET: {[key: number]: string} = {
  43113: 'AVAX',
  97: 'BNB',
};

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
