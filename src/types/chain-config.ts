export interface ChainConfigResponse {
  chainId: number;
  internalConfig: {
    PROVIDER_URL: string;
    NFT_FACTORY_ADDRESS: string;
    SUB_QUERY_ENDPOINT: string;
  };
}

export interface ChainConfig {
  chainId: number;
  providerUrl: string;
  factoryAddress: string;
  subQueryEndpoint: string;
}
