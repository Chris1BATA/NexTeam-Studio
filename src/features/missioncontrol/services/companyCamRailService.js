import {
  getCompanyCamPhoto,
  hasCompanyCamToken,
  listCompanyCamPhotos,
} from "./companyCamReadOnlyService.js";

function normalizeCompanyCamToken(token) {
  const value = String(token || process.env.COMPANYCAM_API_TOKEN || "").trim();
  if (!value) {
    throw new Error("COMPANYCAM_API_TOKEN is not configured.");
  }

  return value;
}

function toPhotoCollection(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.photos)) {
    return response.photos;
  }

  return [];
}

function normalizeCompanyCamPhoto(photo = {}) {
  return {
    id: photo.id || null,
    project_id: photo.project_id || null,
    company_id: photo.company_id || null,
    creator_id: photo.creator_id || null,
    creator_name: photo.creator_name || null,
    creator_type: photo.creator_type || null,
    status: photo.status || null,
    processing_status: photo.processing_status || null,
    internal: photo.internal ?? null,
    captured_at: photo.captured_at || null,
    created_at: photo.created_at || null,
    updated_at: photo.updated_at || null,
    description: photo.description ?? null,
    coordinates: photo.coordinates || null,
    photo_url: photo.photo_url || null,
    uris: Array.isArray(photo.uris) ? photo.uris : [],
  };
}

export async function listAllPhotos({ token = process.env.COMPANYCAM_API_TOKEN, perPage = 100, query, modifiedSince } = {}) {
  const response = await listCompanyCamPhotos({
    token: normalizeCompanyCamToken(token),
    perPage,
    query,
    modifiedSince,
  });

  return toPhotoCollection(response).map((photo) => normalizeCompanyCamPhoto(photo));
}

export async function getPhoto(photoId, { token = process.env.COMPANYCAM_API_TOKEN } = {}) {
  const normalizedPhotoId = String(photoId || "").trim();
  if (!normalizedPhotoId) {
    throw new Error("A CompanyCam photo ID is required.");
  }

  const response = await getCompanyCamPhoto({
    token: normalizeCompanyCamToken(token),
    photoId: normalizedPhotoId,
  });

  return normalizeCompanyCamPhoto(response);
}

export function createCompanyCamRail({ token = process.env.COMPANYCAM_API_TOKEN } = {}) {
  const railToken = normalizeCompanyCamToken(token);

  return {
    hasToken: () => hasCompanyCamToken(railToken),
    listAllPhotos: (options = {}) => listAllPhotos({ ...options, token: railToken }),
    getPhoto: (photoId, options = {}) => getPhoto(photoId, { ...options, token: railToken }),
  };
}
