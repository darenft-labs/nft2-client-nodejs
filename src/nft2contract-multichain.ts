import {ethers} from 'ethers';
import {NFT2Contract} from './nft2contract';

export class NFT2ContractMultichain {
  network: 'mainet' | 'testnet';
  providers: {[key: number]: ethers.providers.JsonRpcProvider};
  contractClients: {[key: number]: NFT2Contract};

  constructor(
    network: 'mainet' | 'testnet',
    providers: {[key: number]: ethers.providers.JsonRpcProvider},
    contractClients: {[key: number]: NFT2Contract}
  ) {
    this.network = network;
    this.providers = providers;
    this.contractClients = contractClients;
  }
}
