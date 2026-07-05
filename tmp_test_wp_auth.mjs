import { buildBasicAuthHeader, fetchJson, wordpressJsonHeaders } from './src/features/missioncontrol/services/wordpressApi.js';
const authHeader = buildBasicAuthHeader('aquatrace-bragi', 'dVQj lLyc 95Au v7vF 1xXD B6b6');
const data = await fetchJson('https://aquatraceleak.com/wp-json/wp/v2/users/me?context=edit', { headers: wordpressJsonHeaders(authHeader) });
console.log(JSON.stringify(data, null, 2));
