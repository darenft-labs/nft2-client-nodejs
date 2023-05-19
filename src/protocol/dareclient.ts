import Container from 'typedi';

import {ProtocolClientOptions} from './types/interfaces';
import {ProviderService} from './services/provider.service';
import {AuthService} from './services/auth.service';
import {NFTService} from './services/nft.service';
import {NFTMetadataService} from './services/nft-metadata.service';
import {BlockChainService} from './services/blockchain.service';

export class DareNFTClient {
  nft: NFTService;
  provider: ProviderService;
  nftMetadata: NFTMetadataService;
  blockchain: BlockChainService;

  constructor(setting: ProtocolClientOptions) {
    const key = `${setting?.mnemonic || setting?.privateKey}-${
      setting.chainId
    }-${setting.opts.apiKey}`;

    Container.of(key).set(AuthService, new AuthService(setting.opts));
    Container.of(key).set(BlockChainService, new BlockChainService(setting));
    this.blockchain = Container.of(key).get(BlockChainService);

    this.nft = Container.of(key).get(NFTService);
    this.provider = Container.of(key).get(ProviderService);
    this.nftMetadata = Container.of(key).get(NFTMetadataService);
  }
}
