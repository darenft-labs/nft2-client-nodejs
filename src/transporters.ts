import {
  GaxiosError,
  GaxiosOptions,
  GaxiosPromise,
  GaxiosResponse,
  request,
} from 'gaxios';
import {validate} from './options';

const PRODUCT_NAME = 'nft2-nodejs-client';
const version = '1.0.3';

export interface Transporter {
  request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
  request<T>(opts: GaxiosOptions, callback?: BodyResponseCallback<T>): void;
  request<T>(
    opts: GaxiosOptions,
    callback?: BodyResponseCallback<T>
  ): GaxiosPromise | void;
}

export interface BodyResponseCallback<T> {
  // The `body` object is a truly dynamic type.  It must be `any`.
  (err: Error | null, res?: GaxiosResponse<T> | null): void;
}

export interface RequestError extends GaxiosError {
  errors: Error[];
}

export class DefaultTransporter {
  /**
   * Default user agent.
   */
  static readonly USER_AGENT = `${PRODUCT_NAME}/${version}`;

  /**
   * Configures request options before making a request.
   * @param opts GaxiosOptions options.
   * @return Configured options.
   */
  configure(opts: GaxiosOptions = {}): GaxiosOptions {
    opts.headers = opts.headers || {};
    if (typeof window === 'undefined') {
      // set transporter user agent if not in browser
      const uaValue: string = opts.headers['User-Agent'];
      if (!uaValue) {
        opts.headers['User-Agent'] = DefaultTransporter.USER_AGENT;
      } else if (!uaValue.includes(`${PRODUCT_NAME}/`)) {
        opts.headers[
          'User-Agent'
        ] = `${uaValue} ${DefaultTransporter.USER_AGENT}`;
      }
    }
    return opts;
  }

  /**
   * Makes a request using Gaxios with given options.
   * @param opts GaxiosOptions options.
   * @param callback optional callback that contains GaxiosResponse object.
   * @return GaxiosPromise, assuming no callback is passed.
   */
  request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
  request<T>(opts: GaxiosOptions, callback?: BodyResponseCallback<T>): void;
  request<T>(
    opts: GaxiosOptions,
    callback?: BodyResponseCallback<T>
  ): GaxiosPromise | void {
    // ensure the user isn't passing in request-style options
    opts = this.configure(opts);
    try {
      validate(opts);
    } catch (e) {
      if (callback) {
        return callback(e as Error);
      } else {
        throw e;
      }
    }

    if (callback) {
      request<T>(opts).then(
        r => {
          callback(null, r);
        },
        e => {
          callback(this.processError(e));
        }
      );
    } else {
      return request<T>(opts).catch(e => {
        throw this.processError(e);
      });
    }
  }

  /**
   * Changes the error to include details from the body.
   */
  private processError(e: GaxiosError): RequestError {
    const res = e.response;
    const err = e as RequestError;
    const body = res ? res.data : null;
    if (res && body && body.error && res.status !== 200) {
      if (typeof body.error === 'string') {
        err.message = body.error;
        err.code = res.status.toString();
      } else if (Array.isArray(body.error.errors)) {
        err.message = body.error.errors
          .map((err2: Error) => err2.message)
          .join('\n');
        err.code = body.error.code;
        err.errors = body.error.errors;
      } else {
        err.message = body.error.message;
        err.code = body.error.code || res.status;
      }
    } else if (res && res.status >= 400) {
      // Consider all 4xx and 5xx responses errors.
      err.message = body;
      err.code = res.status.toString();
    }
    return err;
  }
}
