import {Service, ServiceOptions} from 'typedi';

import {OAuth2Client} from '../../auth/oauth2client';
import {AuthClientOptions} from '../../auth/authclient';
const pack = require('../../../package.json');

@Service({
  global: true,
} as ServiceOptions)
export class AuthService {
  auth: OAuth2Client;
  version: string;

  constructor(opts: AuthClientOptions) {
    this.auth = new OAuth2Client(opts);
    this.version = `v${pack.version.split('.')[0]}`;
  }

  getHostPath(): string {
    return `${this.auth.url}/${this.version}`;
  }
}
