import {ethers} from 'ethers';
import {Service, ServiceOptions} from 'typedi';
import {ProtocolClientOptions} from '../types/interfaces';
import {getSigner} from '../utils';

@Service()
export class BlockChainService {
  signer: ethers.Wallet;
  chainId: number;

  constructor(setting: ProtocolClientOptions) {
    this.chainId = setting.chainId;
    this.signer = getSigner({
      privateKey: setting?.privateKey,
      mnemonic: setting?.mnemonic,
    });
  }
}
