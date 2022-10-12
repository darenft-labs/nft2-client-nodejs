import {GaxiosError, GaxiosResponse} from 'gaxios';

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
  accessToken: string;
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
    err: GaxiosError | null,
    token?: Credentials | null,
    res?: GaxiosResponse | null
  ): void;
}

export interface GetTokenResponse {
  tokens: Credentials;
  res: GaxiosResponse | null;
}

export interface RefreshAccessTokenCallback {
  (
    err: GaxiosError | null,
    credentials?: Credentials | null,
    res?: GaxiosResponse | null
  ): void;
}

export interface RefreshAccessTokenResponse {
  credentials: Credentials;
  res: GaxiosResponse | null;
}

export interface RequestMetadataResponse {
  headers: Headers;
  res?: GaxiosResponse<void> | null;
}
