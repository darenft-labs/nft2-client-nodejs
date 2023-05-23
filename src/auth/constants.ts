export enum ChainType {
  STAGING = 1,
  TEST_NET = 2,
  PRE_TEST_NET = 3,
  MAIN_NET = 4,
}

export const HOST_URL = {
  [ChainType.STAGING]: 'https://protocol-stg.dareplay.io',
  [ChainType.PRE_TEST_NET]: 'https://protocol-api-pretest.dareplay.io',
  [ChainType.TEST_NET]: 'https://protocol-api-testnet.dareplay.io',
  [ChainType.MAIN_NET]: '',
};

export const ERROR_CODE = {
  UNAUTHORIZED: 401,
};

export const AUTHENTICATION = {
  API_KEY_PATH: '/auth/api-key',
  REFRESH_TOKEN_PATH: '/auth/refresh-token',
};
