import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  AxiosPromise,
  AxiosRequestConfig,
} from 'axios';

const pack = require('../package.json');

const PRODUCT_NAME = 'nft2-nodejs-client';
const version = pack.version;

export interface Transporter {
  request<T>(opts: AxiosRequestConfig): AxiosPromise<T>;
  request<T>(
    opts: AxiosRequestConfig,
    callback?: BodyResponseCallback<T>
  ): void;
  request<T>(
    opts: AxiosRequestConfig,
    callback?: BodyResponseCallback<T>
  ): AxiosPromise | void;
}

export interface BodyResponseCallback<T> {
  // The `body` object is a truly dynamic type.  It must be `any`.
  (err: Error | null, res?: AxiosResponse<T> | null): void;
}

export class DefaultTransporter {
  /**
   * Default user agent.
   */
  static readonly USER_AGENT = `${PRODUCT_NAME}/${version}`;

  transporterInstance: AxiosInstance;

  constructor() {
    this.transporterInstance = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Configures request options before making a request.
   * @param opts AxiosRequestConfig options.
   * @return Configured options.
   */
  configure(opts: AxiosRequestConfig = {}): AxiosRequestConfig {
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
   * Makes a request using Axios with given options.
   * @param opts AxiosRequestConfig options.
   * @param callback optional callback that contains AxiosResponse object.
   * @return AxiosPromise, assuming no callback is passed.
   */
  request<T>(opts: AxiosRequestConfig): AxiosPromise<T>;
  request<T>(
    opts: AxiosRequestConfig,
    callback?: BodyResponseCallback<T>
  ): void;
  request<T>(
    opts: AxiosRequestConfig,
    callback?: BodyResponseCallback<T>
  ): AxiosPromise | void {
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
      this.transporterInstance.request<T>(opts).then(
        r => {
          callback(null, r);
        },
        e => {
          callback(this.processError(e));
        }
      );
    } else {
      return this.transporterInstance.request<T>(opts).catch(e => {
        throw this.processError(e);
      });
    }
  }

  /**
   * Changes the error to include details from the body.
   */
  private processError(e: AxiosError) {
    const res = e?.response || {
      status: 400,
      statusText: 'Bad Request',
      data: null,
    };

    const err = e;
    const body: any = res ? res.data : null;

    if (res && res.status >= 400) {
      err.message = body?.message;
      err.name = res.statusText;
      err.code = res.status.toString();
    }
    return err;
  }
}

function validate(options: any) {
  const vpairs = [
    {invalid: 'uri', expected: 'url'},
    {invalid: 'json', expected: 'data'},
    {invalid: 'qs', expected: 'params'},
  ];
  for (const pair of vpairs) {
    if (options[pair.invalid]) {
      const e = `'${pair.invalid}' is not a valid configuration option. Please use '${pair.expected}' instead. This library is using Axios for requests. Please see https://github.com/axios/axios to learn more about the valid request options.`;
      throw new Error(e);
    }
  }
}