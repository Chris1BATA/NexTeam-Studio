export function buildBasicAuthHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export function wordpressJsonHeaders(authHeader, extra = {}) {
  return {
    Accept: "application/json",
    Authorization: authHeader,
    "User-Agent": "NexTeam-Studio/Bragi-WordPress-Automation",
    ...extra,
  };
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${detail}`);
  }

  return data;
}

export async function updateWordPressPost({ siteUrl, authHeader, postId, fields }) {
  const base = siteUrl.replace(/\/$/, "");
  return fetchJson(`${base}/wp-json/wp/v2/posts/${postId}`, {
    method: "POST",
    headers: wordpressJsonHeaders(authHeader, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(fields),
  });
}

export async function createWordPressPost({ siteUrl, authHeader, fields }) {
  const base = siteUrl.replace(/\/$/, "");
  return fetchJson(`${base}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: wordpressJsonHeaders(authHeader, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(fields),
  });
}

export async function uploadWordPressMedia({
  siteUrl,
  authHeader,
  filename,
  mimeType,
  buffer,
  title,
  altText,
  caption,
  description,
}) {
  const base = siteUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: wordpressJsonHeaders(authHeader, {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    }),
    body: buffer,
  });

  const text = await response.text();
  const media = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Media upload failed ${response.status}: ${text}`);
  }

  if (!title && !altText && !caption && !description) {
    return media;
  }

  return fetchJson(`${base}/wp-json/wp/v2/media/${media.id}`, {
    method: "POST",
    headers: wordpressJsonHeaders(authHeader, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      title,
      alt_text: altText,
      caption,
      description,
    }),
  });
}
