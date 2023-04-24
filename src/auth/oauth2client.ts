import {
  GaxiosError,
  GaxiosOptions,
  GaxiosPromise,
  GaxiosResponse,
} from 'gaxios';
import * as _ from 'lodash';
import jwt from 'jsonwebtoken';

import {BodyResponseCallback} from '../transporters';
import {AuthClient, AuthClientOptions} from './authclient';
import {
  CredentialRequest,
  Credentials,
  GetTokenResponse,
  GetTokenCallback,
  RefreshAccessTokenResponse,
  RefreshAccessTokenCallback,
  RequestMetadataResponse,
} from './credentials';
import {TokenPayload} from './loginticket';
import {ChainType, HOST_URL} from './constants';

export class OAuth2Client extends AuthClient {
  protected refreshTokenPromises = new Map<string, Promise<GetTokenResponse>>();

  apiKey: string;

  tokenType: string;

  projectId?: string;

  eagerRefreshThreshold: number;

  forceRefreshOnFailure: boolean;

  url: string;

  /**
   * Handles Authentication flow for NFT2 APIs.
   *
   * @param opts The client options.
   * @constructor
   */
  constructor(opts: AuthClientOptions) {
    super();
    this.apiKey = opts.apiKey;
    this.url = HOST_URL[opts.chainType || ChainType.STAGING];
    this.eagerRefreshThreshold = opts.eagerRefreshThreshold || 5 * 60;
    this.forceRefreshOnFailure = opts.forceRefreshOnFailure || true;
    this.tokenType = 'Bearer';
  }

  /**
   * Gets the access token for the given code.
   * @param code The authorization code.
   * @param callback Optional callback fn.
   */
  getToken(
    code: string,
    callback?: GetTokenCallback
  ): Promise<GetTokenResponse> | null {
    if (callback) {
      this.getTokenAsync(code).then(
        r => callback(null, r.tokens, r.res),
        e => callback(e, null, e.response)
      );
      return null;
    } else {
      return this.getTokenAsync(code);
    }
  }

  private async getTokenAsync(apiKey: string): Promise<GetTokenResponse> {
    const url = `${this.url}/auth/api-key/${apiKey}`;
    const res = await this.transporter.request<CredentialRequest>({
      method: 'POST',
      url,
      data: {},
      headers: {'Content-Type': 'application/json'},
    });
    const tokens = res.data as Credentials;

    this.emit('tokens', tokens);
    return {tokens, res};
  }

  /**
   * Refreshes the access token.
   * @param refreshToken Existing refresh token.
   * @private
   */
  async refreshToken(refreshToken?: string | null): Promise<GetTokenResponse> {
    const rfKey = refreshToken || 'NONE_RFTOKEN';

    // If a request to refresh using the same token has started,
    // return the same promise.
    if (this.refreshTokenPromises.has(rfKey)) {
      return this.refreshTokenPromises.get(rfKey)!;
    }

    let p: Promise<GetTokenResponse> | undefined;
    if (!refreshToken) {
      if (!this.apiKey) {
        throw new Error('No API key found');
      }

      p = this.getToken(this.apiKey)?.then(
        r => {
          this.refreshTokenPromises.delete(rfKey);
          return r;
        },
        e => {
          this.refreshTokenPromises.delete(rfKey);
          throw e;
        }
      );
    } else {
      p = this.refreshTokenNoCache(refreshToken).then(
        r => {
          this.refreshTokenPromises.delete(rfKey);
          return r;
        },
        e => {
          this.refreshTokenPromises.delete(rfKey);
          throw e;
        }
      );
    }

    if (!p) {
      throw new Error('No callback from promise');
    }

    this.refreshTokenPromises.set(rfKey, p);
    return p;
  }

  protected async refreshTokenNoCache(
    refreshToken?: string | null
  ): Promise<GetTokenResponse> {
    if (!refreshToken) {
      throw new Error('No refresh token is set.');
    }
    const url = `${this.url}/auth/refresh-token/${refreshToken}`;

    let res: GaxiosResponse<CredentialRequest>;

    try {
      // request for new token
      res = await this.transporter.request<CredentialRequest>({
        method: 'POST',
        url,
        headers: {'Content-Type': 'application/json'},
      });
    } catch (e) {
      if (e instanceof GaxiosError && e.response?.data) {
        e.message = JSON.stringify(e.response.data);
      }
      throw e;
    }

    const tokens = res.data as Credentials;

    this.emit('tokens', tokens);
    return {tokens, res};
  }

  /**
   * Retrieves the access token using refresh token
   *
   * @param callback callback
   */
  refreshAccessToken(): Promise<RefreshAccessTokenResponse>;
  refreshAccessToken(callback: RefreshAccessTokenCallback): void;
  refreshAccessToken(
    callback?: RefreshAccessTokenCallback
  ): Promise<RefreshAccessTokenResponse> | void {
    if (callback) {
      this.refreshAccessTokenAsync().then(
        r => callback(null, r.credentials, r.res),
        callback
      );
    } else {
      return this.refreshAccessTokenAsync();
    }
  }

  private async refreshAccessTokenAsync() {
    const r = await this.refreshToken(this.credentials.refreshToken);
    const tokens = r.tokens as Credentials;
    tokens.refreshToken = this.credentials.refreshToken;
    this.credentials = tokens;
    return {credentials: this.credentials, res: r.res};
  }

  protected async getRequestMetadataAsync(): Promise<RequestMetadataResponse> {
    const thisCreds = this.credentials;
    if (!thisCreds.accessToken && !thisCreds.refreshToken && !this.apiKey) {
      throw new Error(
        'No access, refresh token, API key or refresh handler callback is set.'
      );
    }

    if (thisCreds.accessToken && !this.isTokenExpiring()) {
      const headers = {
        Authorization: this.tokenType + ' ' + thisCreds.accessToken,
      };
      return {headers: this.addSharedMetadataHeaders(headers)};
    }

    if (!this.apiKey) {
      throw new Error('No API key found');
    }

    let r: GetTokenResponse | null = null;
    let tokens: Credentials | null = null;
    try {
      r = await this.refreshToken(thisCreds.refreshToken);
      tokens = r.tokens;
    } catch (err) {
      const e = err as GaxiosError;
      if (
        e.response &&
        (e.response.status === 403 || e.response.status === 404)
      ) {
        e.message = `Could not refresh access token: ${e.message}`;
      }
      throw e;
    }

    const credentials = this.credentials;
    tokens.refreshToken = tokens?.refreshToken || credentials.refreshToken;
    tokens.expiresIn = this.getCurrentTime() + tokens.expiresIn;
    this.credentials = tokens;
    const headers: {[index: string]: string} = {
      Authorization: this.tokenType + ' ' + tokens.accessToken,
    };
    return {headers: this.addSharedMetadataHeaders(headers), res: r.res};
  }

  /**
   * Provides a request implementation with OAuth 2.0 flow. If credentials have
   * a refreshToken, in cases of HTTP 401 and 403 responses, it automatically
   * asks for a new access token and replays the unsuccessful request.
   * @param opts Request options.
   * @param callback callback.
   * @return Request object
   */
  request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
  request<T>(opts: GaxiosOptions, callback: BodyResponseCallback<T>): void;
  request<T>(
    opts: GaxiosOptions,
    callback?: BodyResponseCallback<T>
  ): GaxiosPromise<T> | void {
    if (callback) {
      this.requestAsync<T>(opts).then(
        r => callback(null, r),
        e => {
          return callback(e, e.response);
        }
      );
    } else {
      return this.requestAsync<T>(opts);
    }
  }

  protected async requestAsync<T>(
    opts: GaxiosOptions,
    retry = false
  ): Promise<GaxiosResponse<T>> {
    let r2: GaxiosResponse;
    try {
      const r = await this.getRequestMetadataAsync();

      opts.headers = opts.headers || {};

      if (r.headers && r.headers.Authorization) {
        opts.headers.Authorization = r.headers.Authorization;
      }

      if (r.headers && !r.headers?.['Content-Type']) {
        opts.headers['Content-Type'] = 'application/json';
      }

      r2 = await this.transporter.request<T>(opts);
    } catch (e) {
      const res = (e as GaxiosError).response;
      if (res) {
        const statusCode = res.status;
        // Retry the request for metadata if the following criteria are true:
        // - We haven't already retried.  It only makes sense to retry once.
        // - The response was a 401 or a 403
        // - An accessToken and refreshToken were available, but either no
        //   expiresIn was available or the forceRefreshOnFailure flag is set.
        //   The absent expiresIn case can happen when developers stash the
        //   accessToken and refreshToken for later use, but the accessToken
        //   fails on the first try because it's expired. Some developers may
        //   choose to enable forceRefreshOnFailure to mitigate time-related
        //   errors.
        // Or the following criteria are true:
        // - We haven't already retried.  It only makes sense to retry once.
        // - The response was a 401 or a 403
        // - No refreshToken was available
        // - An accessToken, but
        //   either no expiresIn was available or the forceRefreshOnFailure
        //   flag is set. The accessToken fails on the first try because it's
        //   expired. Some developers may choose to enable forceRefreshOnFailure
        //   to mitigate time-related errors.

        const mayRequireRefresh =
          this.credentials &&
          this.credentials.accessToken &&
          this.credentials.refreshToken &&
          this.forceRefreshOnFailure;

        const isAuthErr = statusCode === 401;

        if (!retry && isAuthErr && mayRequireRefresh) {
          await this.refreshAccessTokenAsync();

          return this.requestAsync<T>(opts, true);
        }
      }
      throw e;
    }
    return r2;
  }

  /**
   * Get current time by seconds
   * @returns seconds
   */
  protected getCurrentTime(): number {
    return new Date().getTime() / 1000;
  }

  /**
   * Returns true if a token is expired or will expire within
   * eagerRefreshThreshold seconds.
   * If there is no expiry time, assumes the token is not expired or expiring.
   */
  protected isTokenExpiring(): boolean {
    const expiryDate = this.credentials.expiresIn;

    const timeout = this.getCurrentTime() + this.eagerRefreshThreshold;

    return expiryDate ? expiryDate <= timeout : false;
  }

  getAccount(): TokenPayload {
    if (!this.credentials?.accessToken) {
      throw new Error('Access token not found');
    }
    const decodedToken = jwt.decode(
      this.credentials?.accessToken
    ) as jwt.JwtPayload;
    return decodedToken as TokenPayload;
  }
}
