export enum ChainType {
  STAGING = 1,
  TEST_NET = 2,
  MAIN_NET = 3,
}

export const HOST_URL = {
  [ChainType.STAGING]: 'https://protocol-stg.dareplay.io',
  [ChainType.TEST_NET]: 'https://protocol-api-testnet.dareplay.io',
  [ChainType.MAIN_NET]: '',
};
