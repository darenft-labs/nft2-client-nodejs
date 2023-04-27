import {EventEmitter} from 'events';
import {AxiosPromise, AxiosRequestConfig} from 'axios';

import {DefaultTransporter} from '../transporters';
import {Credentials, Headers} from './credentials';
import {ChainType} from './constants';

/**
 * Defines the root interface for all clients that generate credentials
 * for calling NFT2 APIs. All clients should implement this interface.
 */
export interface CredentialsClient {
  /**
   * The expiration threshold in milliseconds before forcing token refresh.
   */
  eagerRefreshThreshold: number;

  /**
   * Whether to force refresh on failure when making an authorization request.
   */
  forceRefreshOnFailure: boolean;

  /**
   * @return A promise that resolves with the current GCP access token
   *   response. If the current credential is expired, a new one is retrieved.
   */
  // getAccessToken(): Promise<{
  //   token?: string | null;
  //   res?: GaxiosResponse | null;
  // }>;

  /**
   * Provides an alternative Gaxios request implementation with auth credentials
   */
  request<T>(opts: AxiosRequestConfig): AxiosPromise<T>;

  /**
   * Subscribes a listener to the tokens event triggered when a token is
   * generated.
   *
   * @param event The tokens event to subscribe to.
   * @param listener The listener that triggers on event trigger.
   * @return The current client instance.
   */
  on(event: 'tokens', listener: (tokens: Credentials) => void): this;
}

export declare interface AuthClient {
  on(event: 'tokens', listener: (tokens: Credentials) => void): this;
}

export interface AuthClientOptions {
  apiKey: string;
  chainType: ChainType;
  eagerRefreshThreshold?: number;
  forceRefreshOnFailure?: boolean;
}

export abstract class AuthClient
  extends EventEmitter
  implements CredentialsClient
{
  transporter = new DefaultTransporter();
  credentials = {} as Credentials;
  eagerRefreshThreshold = 5 * 60;
  forceRefreshOnFailure = false;

  /**
   * Provides an alternative Gaxios request implementation with auth credentials
   */
  abstract request<T>(opts: AxiosRequestConfig): AxiosPromise<T>;

  /**
   * @return A promise that resolves with the current GCP access token
   *   response. If the current credential is expired, a new one is retrieved.
   */
  // abstract getAccessToken(): Promise<{
  //   token?: string | null;
  //   res?: GaxiosResponse | null;
  // }>;

  /**
   * Append additional headers, e.g., shared across the
   * classes inheriting AuthClient. This method should be used by any method
   * that overrides getRequestMetadataAsync(), which is a shared helper for
   * setting request information in both gRPC and HTTP API calls.
   *
   * @param headers object to append additional headers to.
   */
  protected addSharedMetadataHeaders(headers: Headers): Headers {
    return headers;
  }
}
