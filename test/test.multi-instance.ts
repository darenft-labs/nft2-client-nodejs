import assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import nock from 'nock';
import {MockProvider} from 'ethereum-waffle';
import * as sinon from 'sinon';

import {Chain, ChainType, DareNFTClient, HOST_URL} from '../src';

describe('DareNFTClient multiple instances', () => {
  const CODE = 'API_2';
  const chainType = ChainType.STAGING;

  let sandbox: sinon.SinonSandbox;

  before(async () => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    nock.cleanAll();
    sandbox.restore();
  });

  it('should get multiple instances', done => {
    const provider = new MockProvider();
    const wallets = provider.getWallets().slice(0, 3);

    const clients = [] as DareNFTClient[];

    wallets.forEach((wallet, i) => {
      const client = new DareNFTClient({
        opts: {
          apiKey: CODE,
          chainType,
        },
        chainId: Chain.BSC_TESTNET,
        privateKey: wallet.privateKey,
      });

      clients.push(client);
    });

    done();
  });
});
