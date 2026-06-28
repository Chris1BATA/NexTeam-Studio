import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import {
  buildBragiModeBLinkPlan,
  getBragiModeBClientConfig,
  getBragiModeBTopicProfile,
  normalizeBragiModeBLocation,
} from "./bragiModeBClientConfig.js";
import { generateBragiModeBArticle } from "./bragiModeBArticleGenerator.js";
import { sendBragiModeBReviewEmail, buildBragiModeBReviewEmail } from "./bragiModeBEmailService.js";
import { selectBestCompanyCamPhoto, chooseBestPhotoAssetUrl, downloadCompanyCamPhotoAsset } from "./bragiModeBPhotoSelector.js";
import { createBragiModeBRailClient } from "./bragiModeBRailClient.js";

const STATE_PATH = join(process.cwd(), "runtime", "bragi-mode-b", "state", "latest-run.json");

function ensureParentDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function saveRunState(payload) {
  ensureParentDir(STATE_PATH);
  writeFileSync(STATE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function buildCategoryNames({ config, topicProfile, location }) {
  return [...new Set([...(topicProfile.categoryNames || [])])];
}

function buildTagNames({ topicProfile, location }) {
  return [...new Set([...(topicProfile.tagNames || [])])];
}

function toBase64(buffer) {
  return Buffer.from(buffer).toString("base64");
}

function buildMediaFilename({ articlePackage, mimeType }) {
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const cleaned = String(articlePackage.imageMeta?.filename || articlePackage.slug || "aquatrace-bragi-photo")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.endsWith(`.${ext}`) ? cleaned : `${cleaned}.${ext}`;
}

function buildLinkUsageSummary(articlePackage, linkPlan) {
  const html = String(articlePackage.contentHtml || "");
  return linkPlan.internalLinks.filter((link) => html.includes(link.url));
}

export async function runBragiModeB({ topic, location: locationInput, clientId = "aquatrace" }) {
  const config = getBragiModeBClientConfig(clientId);
  const location = normalizeBragiModeBLocation(locationInput, config);
  const topicProfile = getBragiModeBTopicProfile(topic, config);
  const linkPlan = buildBragiModeBLinkPlan({ topic, location, config });
  const rail = createBragiModeBRailClient();
  const run = {
    ok: false,
    topic,
    location: location.display,
    clientId,
    startedAt: new Date().toISOString(),
  };

  try {
    const generation = await generateBragiModeBArticle({
      topic,
      location,
      config,
      linkPlan,
      topicProfile,
    });
    const articlePackage = {
      ...generation.articlePackage,
      categoryNames: generation.articlePackage.categoryNames?.length
        ? generation.articlePackage.categoryNames
        : buildCategoryNames({ config, topicProfile, location }),
      tagNames: generation.articlePackage.tagNames?.length
        ? generation.articlePackage.tagNames
        : buildTagNames({ topicProfile, location }),
    };

    const categoryIds = await rail.resolveTermIdsByName("categories", articlePackage.categoryNames);
    const tagIds = await rail.resolveTermIdsByName("tags", articlePackage.tagNames);

    const photoListResult = await rail.listPhotos({ perPage: 100 });
    const photoSelection = selectBestCompanyCamPhoto({
      photos: photoListResult.photos,
      topic,
      articlePackage,
      location,
    });
    if (!photoSelection.selected?.photo?.id) {
      throw new Error("No CompanyCam photo candidates were available.");
    }

    const chosenPhoto = await rail.getPhoto(photoSelection.selected.photo.id);
    const photoAssetUrl = chooseBestPhotoAssetUrl(chosenPhoto.photo);
    const downloadedPhoto = await downloadCompanyCamPhotoAsset(photoAssetUrl);

    const draftResult = await rail.createDraft({
      title: articlePackage.title,
      contentHtml: articlePackage.contentHtml,
      categories: categoryIds,
      tags: tagIds,
      slug: articlePackage.slug,
      excerpt: articlePackage.excerpt,
      commentStatus: "closed",
      pingStatus: "closed",
    });

    const uploadResult = await rail.uploadMedia({
      filename: buildMediaFilename({ articlePackage, mimeType: downloadedPhoto.mimeType }),
      mimeType: downloadedPhoto.mimeType,
      contentBase64: toBase64(downloadedPhoto.buffer),
      title: articlePackage.imageMeta?.title || articlePackage.title,
      altText: articlePackage.imageMeta?.altText || `${location.display} pool leak detection photo`,
      caption: articlePackage.imageMeta?.caption || "",
      description: articlePackage.imageMeta?.description || "",
    });

    const featuredImageResult = await rail.setFeaturedImage({
      postId: draftResult.postId,
      mediaId: uploadResult.mediaId,
    });

    const yoastResult = await rail.setYoast({
      postId: draftResult.postId,
      focusKeyword: articlePackage.focusKeyword,
      seoTitle: articlePackage.seoTitle,
      metaDescription: articlePackage.metaDescription,
    });

    const emailDraft = buildBragiModeBReviewEmail({
      topic,
      location,
      articlePackage,
      draftResult,
      photoSelection,
      linkPlan,
    });
    const emailResult = await sendBragiModeBReviewEmail(emailDraft);

    const result = {
      ok: true,
      topic,
      location: location.display,
      topicProfile: topicProfile.key,
      articlePackage,
      draft: {
        ...draftResult,
        categoriesResolved: categoryIds,
        tagsResolved: tagIds,
        published: false,
        scheduled: false,
      },
      photoSelection: {
        ...photoSelection,
        chosenPhoto,
        assetUrl: photoAssetUrl,
        uploadResult,
        featuredImageResult,
      },
      yoastResult,
      email: {
        ...emailDraft,
        ...emailResult,
      },
      linksUsed: buildLinkUsageSummary(articlePackage, linkPlan),
      finishedAt: new Date().toISOString(),
    };

    saveRunState(result);
    return result;
  } catch (error) {
    run.error = {
      message: error?.message || String(error),
      validation: error?.validation || null,
      articlePackage: error?.articlePackage || null,
      data: error?.data || null,
    };
    run.finishedAt = new Date().toISOString();
    saveRunState(run);
    throw error;
  }
}
