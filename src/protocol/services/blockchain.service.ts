import {ethers} from 'ethers';
import {Service, ServiceOptions} from 'typedi';
import {ProtocolClientOptions} from '../types/interfaces';
import {getSigner} from '../utils';

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
