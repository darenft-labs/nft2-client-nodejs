import assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import {AxiosError} from 'axios';
import nock from 'nock';
import * as sinon from 'sinon';

import {DEFAULT_HOST_URL, OAuth2Client} from '../src';

nock.disableNetConnect();

const getExpireTime = (expiresIn: number) => {
  return new Date().getTime() / 1000 + expiresIn;
};

describe('oauth2', () => {
  const CODE = 'SOME_CODE';
  const baseUrl = DEFAULT_HOST_URL;

  describe(__filename, () => {
    let client: OAuth2Client;
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      client = new OAuth2Client({
        apiKey: CODE,
      });
    });

    afterEach(async () => {
      nock.cleanAll();
      sandbox.restore();
    });

    function mockExample() {
      return [
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 1}),
        nock('http://example.com').get('/').reply(200),
      ];
    }

    it('should get token if no credentials', done => {
      const scopes = mockExample();

      const accessToken = 'abc123';
      let raisedEvent = false;

      // ensure the tokens event is raised
      client.on('tokens', tokens => {
        assert.strictEqual(tokens.accessToken, accessToken);
        raisedEvent = true;
      });

      client.request({url: 'http://example.com'}, (error, result) => {
        scopes.forEach(s => {
          s.done();
        });

        assert(raisedEvent);
        assert.strictEqual(accessToken, client.credentials.accessToken);
        done();
      });
    });

    it('should unify the promise when refreshing the token after 1 request', done => {
      const scopes = [
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {
            accessToken: 'abc123',
            expiresIn: getExpireTime(7200),
          }),
      ];

      const accessToken = 'abc123';

      // Dont remove this line, dont know why
      const client1 = client;

      client.request({url: 'http://example.com'}, async () => {
        scopes.forEach(s => {
          s.done();
        });

        assert.strictEqual(accessToken, client1.credentials.accessToken);

        // Mock a single call to the token server, and 3 calls to the example
        // endpoint. This makes sure that refreshToken is called only once.
        const scopes1 = [
          nock('http://example.com').persist().get('/').reply(200),
        ];

        await Promise.all([
          client1.request({url: 'http://example.com'}),
          client1.request({url: 'http://example.com'}),
          client1.request({url: 'http://example.com'}),
        ]);
        scopes1.forEach(s => s.done());

        assert.strictEqual('abc123', client1.credentials.accessToken);

        done();
      });
    });

    it('should unify the promise when refreshing the token with multiple requests', async () => {
      // Mock a single call to the token server, and 3 calls to the example
      // endpoint. This makes sure that refreshToken is called only once.
      const scopes = [
        nock(baseUrl).post(`/auth/api-key/${CODE}`, undefined).reply(200, {
          accessToken: 'abc123',
          expiresIn: 7200,
        }),
        nock('http://example.com').persist().get('/').reply(200),
      ];

      await Promise.all([
        client.request({url: 'http://example.com'}),
        client.request({url: 'http://example.com'}),
        client.request({url: 'http://example.com'}),
      ]);
      scopes.forEach(s => s.done());
      assert.strictEqual('abc123', client.credentials.accessToken);
    });

    it('should get current account info', async () => {
      const scopes = [
        nock(baseUrl).post(`/auth/api-key/${CODE}`, undefined).reply(200, {
          accessToken:
            'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkZjViNzVjZi1jM2VjLTRmMjgtYTk0MC01ZTgxNWRhM2IwN2UiLCJleHAiOjE2NjU3Mzc3NDksInN1YiI6IjE1NTE4NTk4MzE4NTY0MzUyMDAifQ.v-JMsoCUVEF5iAflxJKyjYmfacWzsJzoBdDlZA5BLi-lv6bUskcZYWYH4toAfXcCFn6C9znLeMo0Sgddmk8ReA',
          expiresIn: 7200,
        }),
        nock('http://example.com').persist().get('/').reply(200),
      ];

      await Promise.all([client.request({url: 'http://example.com'})]);
      scopes.forEach(s => s.done());

      const account = client.getAccount();

      assert.strictEqual('df5b75cf-c3ec-4f28-a940-5e815da3b07e', account.aud);
      assert.strictEqual(1665737749, account.exp);
      assert.strictEqual('1551859831856435200', account.sub);
    });

    it('should clear the cached refresh token promise after completion', async () => {
      // Mock 2 calls to the token server and 2 calls to the example endpoint.
      // This makes sure that the token endpoint is invoked twice, preventing
      // the promise from getting cached for too long.
      const scopes = [
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 100000}),
        nock('http://example.com').persist().get('/').reply(200),
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 100000}),
      ];
      await client.request({url: 'http://example.com'});
      client.credentials.expiresIn = 1;
      await client.request({url: 'http://example.com'});
      scopes.forEach(s => s.done());
      assert.strictEqual('abc123', client.credentials.accessToken);
    });

    it('should clear the cached refresh token promise after throw', async () => {
      // Mock a failed call to the refreshToken endpoint. This should trigger
      // a second call to refreshToken, which should use a different promise.
      const scopes = [
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(500)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(200, {accessToken: 'abc123', expiresIn: 100000}),
        nock('http://example.com').get('/').reply(200),
      ];
      try {
        await client.request({url: 'http://example.com'});
        // eslint-disable-next-line no-empty
      } catch (e) {}
      await client.request({url: 'http://example.com'});
      scopes.forEach(s => s.done());
      assert.strictEqual('abc123', client.credentials.accessToken);
    });

    it('should have a custom ReAuth error message', async () => {
      // We have custom handling for make it easier for customers to resolve ReAuth errors
      const reAuthErrorBody = {
        error: 'invalid_grant',
        error_description: 'a ReAuth error',
        custom: 'property',
      };

      const scopes = [
        nock(baseUrl)
          .post(`/auth/api-key/${CODE}`, undefined)
          .reply(500, reAuthErrorBody),
      ];

      try {
        await client.request({url: 'http://example.com'});
      } catch (e) {
        assert(e instanceof AxiosError);
        assert.deepEqual(e.response?.data, reAuthErrorBody);

        return;
      } finally {
        scopes.forEach(s => s.done());
      }

      throw new Error("expected an error, but didn't get one");
    });

    it('should refresh if access token is expired', async () => {
      const rfToken = 'refresh-token-placeholder';
      client.credentials = {
        accessToken: 'initial-access-token',
        refreshToken: rfToken,
        expiresIn: getExpireTime(-1000),
      };
      const scopes = [
        nock(baseUrl)
          .persist()
          .post(`/auth/refresh-token/${rfToken}`, undefined)
          .reply(200, {
            accessToken: 'abc123',
            expiresIn: 100000,
            refreshToken: rfToken,
          }),
        nock('http://example.com').persist().get('/').reply(200),
      ];
      await client.request({url: 'http://example.com'});
      assert.strictEqual('abc123', client.credentials.accessToken);
      scopes.forEach(s => s.done());
    });

    it('should refresh if access token will expired soon and time to refresh before expiration is set', async () => {
      const client = new OAuth2Client({
        apiKey: CODE,
        eagerRefreshThreshold: 5,
      });

      const rfToken = 'refresh-token-placeholder';
      client.credentials = {
        accessToken: 'initial-access-token',
        refreshToken: rfToken,
        expiresIn: getExpireTime(3),
      };
      const scopes = [
        nock(baseUrl)
          .persist()
          .post(`/auth/refresh-token/${rfToken}`, undefined)
          .reply(200, {
            accessToken: 'abc123',
            expiresIn: 100000,
            refreshToken: rfToken,
          }),
        nock('http://example.com').persist().get('/').reply(200),
      ];
      await client.request({url: 'http://example.com'});
      assert.strictEqual('abc123', client.credentials.accessToken);
      scopes.forEach(s => s.done());
    });

    it('should not refresh if access token will not expire soon and time to refresh before expiration is set', async () => {
      const client = new OAuth2Client({
        apiKey: CODE,
        eagerRefreshThreshold: 5,
      });
      client.credentials = {
        accessToken: 'initial-access-token',
        refreshToken: 'refresh-token-placeholder',
        expiresIn: getExpireTime(10),
      };
      const scopes = mockExample();
      await client.request({url: 'http://example.com'});
      assert.strictEqual(
        'initial-access-token',
        client.credentials.accessToken
      );
      assert.strictEqual(false as boolean, scopes[0].isDone());
      scopes[1].done();
    });

    it('should not refresh if not expired', done => {
      client.credentials = {
        accessToken: 'initial-access-token',
        refreshToken: 'refresh-token-placeholder',
        expiresIn: getExpireTime(2000),
      };
      const scopes = mockExample();
      client.request({url: 'http://example.com'}, () => {
        assert.strictEqual(
          'initial-access-token',
          client.credentials.accessToken
        );
        assert.strictEqual(false as boolean, scopes[0].isDone());
        scopes[1].done();
        done();
      });
    });

    it('should assume access token is not expired', done => {
      client.credentials = {
        accessToken: 'initial-access-token',
        refreshToken: 'refresh-token-placeholder',
        expiresIn: getExpireTime(2000),
      };
      const scopes = mockExample();
      client.request({url: 'http://example.com'}, () => {
        assert.strictEqual(
          'initial-access-token',
          client.credentials.accessToken
        );
        assert.strictEqual(false as boolean, scopes[0].isDone());
        scopes[1].done();
        done();
      });
    });

    [401].forEach(code => {
      it(`should refresh token if the server returns ${code}`, async () => {
        const scopes = [
          nock('http://example.com')
            .get('/access')
            .reply(code, {
              error: {code, message: 'Invalid Credentials'},
            })
            .get('/access', undefined, {
              reqheaders: {Authorization: 'Bearer abc123'},
            })
            .reply(200),
          nock(baseUrl)
            .persist()
            .post(
              `/auth/refresh-token/${'refresh-token-placeholder'}`,
              undefined
            )
            .reply(200, {
              accessToken: 'abc123',
              refreshToken: 'refresh-token-placeholder-2',
              expiresIn: getExpireTime(2000),
            }),
        ];

        client.credentials = {
          accessToken: 'initial-access-token',
          refreshToken: 'refresh-token-placeholder',
          expiresIn: getExpireTime(2000),
        };

        await client.request({url: 'http://example.com/access'});

        scopes.forEach(scope => scope.done());
        assert.strictEqual('abc123', client.credentials.accessToken);
      });

      it(`should re-call api key if even refresh token is expired and the server returns ${code}`, async () => {
        const scopes = [
          nock('http://example.com')
            .get('/access')
            .reply(code, {
              error: {code, message: 'Invalid Credentials'},
            })
            .get('/access', undefined, {
              reqheaders: {Authorization: 'Bearer abc123'},
            })
            .reply(200),
          nock(baseUrl)
            .persist()
            .post(
              `/auth/refresh-token/${'refresh-token-placeholder'}`,
              undefined
            )
            .reply(code, {
              error: {code, message: 'Invalid Refresh Token'},
            }),
          nock(baseUrl)
            .post(`/auth/api-key/${CODE}`, undefined)
            .reply(200, {
              accessToken: 'abc123',
              refreshToken: 'refresh-token-placeholder-2',
              expiresIn: getExpireTime(2000),
            }),
        ];

        client.credentials = {
          accessToken: 'initial-access-token',
          refreshToken: 'refresh-token-placeholder',
          expiresIn: getExpireTime(2000),
        };

        await client.request({url: 'http://example.com/access'});

        scopes.forEach(scope => scope.done());
        assert.strictEqual('abc123', client.credentials.accessToken);
        assert.strictEqual(
          'refresh-token-placeholder-2',
          client.credentials.refreshToken
        );
      });

      it('should throw error when the server returns other exception code', async () => {
        const weirdCode = 404;
        const scopes = [
          nock('http://example.com')
            .get('/access')
            .reply(code, {
              error: {code, message: 'Invalid Credentials'},
            }),
          nock(baseUrl)
            .persist()
            .post(
              `/auth/refresh-token/${'refresh-token-placeholder'}`,
              undefined
            )
            .reply(weirdCode, {
              error: {code: weirdCode, message: 'Invalid refresh token'},
            }),
        ];

        client.credentials = {
          accessToken: 'initial-access-token',
          refreshToken: 'refresh-token-placeholder',
          expiresIn: getExpireTime(2000),
        };

        try {
          await client.request({url: 'http://example.com/access'});
        } catch (e) {
          assert(e instanceof AxiosError);
          assert.strictEqual(e.response?.status, weirdCode);

          return;
        } finally {
          scopes.forEach(s => s.done());
        }
      });

      it(`should re-call api key if both access token is expired locally and refresh token is expired from the server, which returns ${code}`, async () => {
        const scopes = [
          nock('http://example.com')
            .get('/access', undefined, {
              reqheaders: {Authorization: 'Bearer abc123'},
            })
            .reply(200),
          nock(baseUrl)
            .persist()
            .post(
              `/auth/refresh-token/${'refresh-token-placeholder'}`,
              undefined
            )
            .reply(code, {
              error: {code, message: 'Invalid Refresh Token'},
            }),
          nock(baseUrl)
            .post(`/auth/api-key/${CODE}`, undefined)
            .reply(200, {
              accessToken: 'abc123',
              refreshToken: 'refresh-token-placeholder-2',
              expiresIn: getExpireTime(2000),
            }),
        ];

        client.credentials = {
          accessToken: 'initial-access-token',
          refreshToken: 'refresh-token-placeholder',
          expiresIn: getExpireTime(-1000),
        };

        await client.request({url: 'http://example.com/access'});

        scopes.forEach(scope => scope.done());
        assert.strictEqual('abc123', client.credentials.accessToken);
        assert.strictEqual(
          'refresh-token-placeholder-2',
          client.credentials.refreshToken
        );
      });

      it(`should refresh token if the server returns ${code} with no forceRefreshOnFailure`, async () => {
        const client = new OAuth2Client({
          apiKey: CODE,
          forceRefreshOnFailure: false,
        });
        const scopes = [
          nock('http://example.com')
            .get('/access')
            .reply(code, {
              error: {code, message: 'Invalid Credentials'},
            })
            .get('/access', undefined, {
              reqheaders: {Authorization: 'Bearer abc123'},
            })
            .reply(code),
          nock(baseUrl)
            .persist()
            .post(
              `/auth/refresh-token/${'refresh-token-placeholder'}`,
              undefined
            )
            .reply(200, {
              accessToken: 'abc123',
              refreshToken: 'refresh-token-placeholder-2',
              expiresIn: getExpireTime(1000),
            }),
        ];

        client.credentials = {
          accessToken: 'initial-access-token',
          refreshToken: 'refresh-token-placeholder',
          expiresIn: getExpireTime(2000),
        };

        try {
          await client.request({url: 'http://example.com/access'});
        } catch (e) {
          assert(e instanceof AxiosError);
          assert.strictEqual(e.response?.status, code);

          return;
        } finally {
          scopes.forEach(s => s.done());
        }
      });
    });
  });
});
