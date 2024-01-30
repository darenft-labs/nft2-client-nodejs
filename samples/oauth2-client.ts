import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});
import {OAuth2Client} from '../src/auth/oauth2client';

async function main() {
  const oAuth2Client = await getAuthenticatedClient();
  const token = await oAuth2Client.getToken(oAuth2Client.apiKey);
  console.log('token: ', token?.tokens);

  const refreshToken = await oAuth2Client.refreshAccessToken();
  console.log('refreshToken: ', refreshToken?.credentials);
}

/**
 * Create a new OAuth2Client, and go through the OAuth2 content
 * workflow.  Return the full client to the callback.
 */
const getAuthenticatedClient = async () => {
  const code = process.env.API_KEY || '';
  const oAuth2Client = new OAuth2Client({apiKey: code});
  return oAuth2Client;
};

main().catch(console.error);
