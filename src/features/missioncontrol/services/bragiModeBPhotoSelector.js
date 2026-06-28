function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function haversineMiles(a, b) {
  if (!a?.lat || !a?.lon || !b?.lat || !b?.lon) {
    return Number.POSITIVE_INFINITY;
  }
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const value = (Math.sin(dLat / 2) ** 2)
    + Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLon / 2) ** 2);
  const distance = 2 * earthRadiusMiles * Math.asin(Math.sqrt(value));
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY;
}

function tokenize(value) {
  return [...new Set(
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2)
  )];
}

export function selectBestCompanyCamPhoto({ photos, topic, articlePackage, location }) {
  const keywords = tokenize([topic, articlePackage?.title, articlePackage?.focusKeyword].join(" "));
  const ranked = (Array.isArray(photos) ? photos : []).map((photo) => {
    const description = String(photo?.description || "");
    const combinedText = `${description} ${photo?.creator_name || ""}`.toLowerCase();
    let score = 0;

    if (photo?.status === "active") score += 10;
    if (photo?.processing_status === "processed") score += 10;

    let keywordHits = 0;
    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        keywordHits += 1;
      }
    }
    score += keywordHits * 8;

    const distanceMiles = haversineMiles(location.coordinates, photo?.coordinates);
    if (Number.isFinite(distanceMiles)) {
      score += Math.max(0, 45 - (distanceMiles / 8));
    }

    const recencyDays = photo?.captured_at
      ? (Date.now() - (Number(photo.captured_at) * 1000)) / (1000 * 60 * 60 * 24)
      : 3650;
    score += Math.max(0, 12 - (recencyDays / 30));

    return {
      photo,
      score: Number(score.toFixed(2)),
      keywordHits,
      distanceMiles: Number.isFinite(distanceMiles) ? Number(distanceMiles.toFixed(1)) : null,
      recencyDays: Number.isFinite(recencyDays) ? Number(recencyDays.toFixed(1)) : null,
    };
  }).sort((left, right) => right.score - left.score);

  return {
    selected: ranked[0] || null,
    topCandidates: ranked.slice(0, 5),
  };
}

export function chooseBestPhotoAssetUrl(photo) {
  const uris = Array.isArray(photo?.uris) ? photo.uris : [];
  const preferredOrder = ["original", "original_annotation", "web", "web_annotation", "thumbnail"];

  for (const type of preferredOrder) {
    const hit = uris.find((entry) => entry?.type === type && entry?.url);
    if (hit?.url) {
      return hit.url;
    }
  }

  return photo?.photo_url || "";
}

export async function downloadCompanyCamPhotoAsset(url) {
  if (!url) {
    throw new Error("CompanyCam photo asset URL is missing.");
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    throw new Error(`Photo download failed with status ${response.status}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType.split(";")[0].trim() || "image/jpeg",
  };
}
