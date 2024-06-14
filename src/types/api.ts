export interface TokenBalancesResponse {
  royalties: Array<{
    contract_decimals: number;
    contract_name: string;
    contract_address: string;
    contract_display_name: string;
    contract_ticker_symbol: string;
    is_native: boolean;
    balance: string;
    quote_rate: number;
    quote: number;
    logo_url: string;
    native_token?: string;
  }>;
}
