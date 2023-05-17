import {ethers} from 'ethers';
import {Service, ServiceOptions} from 'typedi';
import {ProtocolClientOptions} from './interfaces';
import {getSigner} from './blockchain';

@Service({
  global: true,
} as ServiceOptions)
export class BlockChainService {
  rpcUrl: string;
  signer: ethers.Wallet;

  constructor(setting: ProtocolClientOptions) {
    this.rpcUrl = setting.rpcUrl;
    this.signer = getSigner(this.rpcUrl, {
      privateKey: setting?.privateKey,
      mnemonic: setting?.mnemonic,
    });
  }
}
