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
    Container.set(AuthService, new AuthService(setting.opts));
    Container.set(BlockChainService, new BlockChainService(setting));

    this.nft = Container.get(NFTService);
    this.provider = Container.get(ProviderService);
    this.nftMetadata = Container.get(NFTMetadataService);
    this.blockchain = Container.get(BlockChainService);
  }
}
