import {AxiosError, AxiosResponse} from 'axios';

export interface Credentials {
  /**
   * This field is only present if the access_type parameter was set to offline in the authentication request. For details, see Refresh tokens.
   */
  refreshToken: string;
  /**
   * The time in ms at which this token is thought to expire.
   */
  expiresIn: number;
  /**
   * A token that can be sent to a NFT2 API.
   */
  accessToken?: string;
}

export interface CredentialRequest {
  /**
   * This field is only present if the access_type parameter was set to offline in the authentication request. For details, see Refresh tokens.
   */
  refreshToken?: string | null;
  /**
   * The time in ms at which this token is thought to expire.
   */
  expiresIn?: number | null;
  /**
   * A token that can be sent to a NFT2 API.
   */
  accessToken?: string | null;
}

export interface Headers {
  [index: string]: string;
}
export interface GetTokenCallback {
  (
    err: AxiosError | null,
    token?: Credentials | null,
    res?: AxiosResponse | null
  ): void;
}

export interface GetTokenResponse {
  tokens: Credentials;
  res: AxiosResponse | null;
}

export interface RefreshAccessTokenCallback {
  (
    err: AxiosError | null,
    credentials?: Credentials | null,
    res?: AxiosResponse | null
  ): void;
}

export interface RefreshAccessTokenResponse {
  credentials: Credentials;
  res: AxiosResponse | null;
}

export interface RequestMetadataResponse {
  headers: Headers;
  res?: AxiosResponse<void> | null;
}
