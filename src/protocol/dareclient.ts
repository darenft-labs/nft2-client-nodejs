import Container from 'typedi';

import {ProtocolClientOptions} from './interfaces';
import {ProviderService} from './services/provider.service';
import {AuthService} from './services/auth.service';
import {NFTService} from './services/nft.service';

export class DareNFTClient {
  nft: NFTService;
  provider: ProviderService;
  constructor(setting: ProtocolClientOptions) {
    Container.set(AuthService, new AuthService(setting.opts));

    this.nft = Container.get(NFTService);
    this.provider = Container.get(ProviderService);
  }
}
