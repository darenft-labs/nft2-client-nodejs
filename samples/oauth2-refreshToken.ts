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
    const oAuth2Client = new OAuth2Client({
      apiKey: process.env.API_KEY || '',
      url: 'https://protocol-stg.dareplay.io',
    });

    const r = await oAuth2Client.refreshToken(
      'MJVIYMUXYTCTM2U1YY01MDAWLTK2NDMTMGE3OTQWNDZKODK2'
    );

    resolve(true);
  });
}

main().catch(console.error);
