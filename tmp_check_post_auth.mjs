import { buildBasicAuthHeader, fetchJson, wordpressJsonHeaders } from './src/features/missioncontrol/services/wordpressApi.js';
const auth = buildBasicAuthHeader('aquatrace-bragi', 'dVQj lLyc 95Au v7vF 1xXD B6b6');
const post = await fetchJson('https://aquatraceleak.com/wp-json/wp/v2/posts/3273?context=edit', { headers: wordpressJsonHeaders(auth) });
console.log(JSON.stringify({featured_media: post.featured_media, contentLen: post.content?.raw?.length, excerptLen: post.excerpt?.raw?.length}, null, 2));
