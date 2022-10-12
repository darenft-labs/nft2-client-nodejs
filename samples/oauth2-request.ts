import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});
import {OAuth2Client} from '../src/auth/oauth2client';

async function main() {
  const oAuth2Client = await getAuthenticatedClient();

  try {
    const result = await oAuth2Client.request({
      url: 'https://protocol-stg.dareplay.io/nfts/import-nfts',
      method: 'POST',
      body: JSON.stringify({
        tokenAddress: 'string',
        tokens: [
          {
            tokenId: 'string',
            ownerAddress: 'string',
          },
        ],
      }),
      headers: {'Content-Type': 'application/json'},
    });

    console.log('result', result);
  } catch (error: any) {
    console.log(JSON.stringify(error?.response?.data));
  }
}

function getAuthenticatedClient() {
  const oAuth2Client = new OAuth2Client({
    apiKey: process.env.API_KEY || '',
    url: 'https://protocol-stg.dareplay.io',
  });

  return oAuth2Client;
}

main().catch(console.error);
