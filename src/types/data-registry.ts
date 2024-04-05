export interface DataRegistry {
  name: string;
  description: string;
  url: string;
  chainId: number;
  providerAddress: string;
  walletAddress: string;
  registryUrl: string | null;
  registeredAt: Date | null;
  schemas: {
    name: string;
    jsonSchema: object;
  };
  collectionSchemas: {
    name: string;
    jsonSchema: object;
  }[];
}
