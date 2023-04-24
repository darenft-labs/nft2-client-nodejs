import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});
import {OAuth2Client} from '../src/auth/oauth2client';

async function main() {
  const oAuth2Client = await getAuthenticatedClient();
}

/**
 * Create a new OAuth2Client, and go through the OAuth2 content
 * workflow.  Return the full client to the callback.
 */
function getAuthenticatedClient() {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const code = process.env.API_KEY || '';
    const oAuth2Client = new OAuth2Client({
      apiKey: code,
      chainType: parseInt(process.env.CHAIN || '1'),
    });

    const r = await oAuth2Client.getToken(code);

    resolve(true);
  });
}

main().catch(console.error);
