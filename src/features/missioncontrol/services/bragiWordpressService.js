import { mkdirSync } from "fs";
import { join } from "path";
import { buildBasicAuthHeader, createWordPressPost, updateWordPressPost } from "./wordpressApi.js";
import { writeYoastFieldsInEditor } from "./wordpressYoastEditor.js";

const DEFAULT_SITE_URL = "https://aquatraceleak.com";
const DEFAULT_LOGIN_URL = `${DEFAULT_SITE_URL}/wp-login.php`;
const DEFAULT_ADMIN_BASE = `${DEFAULT_SITE_URL}/wp-admin`;

export async function executeBragiWordpressDraft({
  postId,
  title,
  content,
  slug,
  excerpt,
  commentStatus = "closed",
  pingStatus = "closed",
  yoast,
  credentials,
  screenshotDir,
}) {
  if (!credentials?.apiUsername || !credentials?.apiPassword) {
    throw new Error("WordPress API credentials are required.");
  }
  if (!credentials?.editorUsername || !credentials?.editorPassword) {
    throw new Error("WordPress editor credentials are required for Yoast field automation.");
  }
  if (!yoast) {
    throw new Error("Yoast metadata payload is required.");
  }

  const siteUrl = credentials.siteUrl || DEFAULT_SITE_URL;
  const authHeader = buildBasicAuthHeader(credentials.apiUsername, credentials.apiPassword);

  const postUpdate = {};
  if (title) postUpdate.title = title;
  if (content) postUpdate.content = content;
  if (slug) postUpdate.slug = slug;
  if (excerpt) postUpdate.excerpt = excerpt;
  postUpdate.status = "draft";
  postUpdate.comment_status = commentStatus;
  postUpdate.ping_status = pingStatus;

  const updatedPost = postId
    ? await updateWordPressPost({
        siteUrl,
        authHeader,
        postId,
        fields: postUpdate,
      })
    : await createWordPressPost({
        siteUrl,
        authHeader,
        fields: postUpdate,
      });

  const resolvedPostId = updatedPost?.id || postId;
  if (!resolvedPostId) {
    throw new Error("WordPress draft creation did not return a post ID.");
  }

  const proofDir = screenshotDir || join(process.cwd(), "tmp-proof");
  mkdirSync(proofDir, { recursive: true });

  const yoastResult = await writeYoastFieldsInEditor({
    loginUrl: `${siteUrl}/wp-login.php`,
    editUrl: `${siteUrl}/wp-admin/post.php?post=${resolvedPostId}&action=edit`,
    username: credentials.editorUsername,
    password: credentials.editorPassword,
    values: {
      focusKeyphrase: yoast.focusKeyphrase,
      seoTitle: yoast.seoTitle,
      metaDescription: yoast.metaDescription,
      socialTitle: yoast.socialTitle,
      socialDescription: yoast.socialDescription,
    },
    screenshotDir: proofDir,
  });

  return {
    postId: resolvedPostId,
    draftUrl: updatedPost?.link || `${siteUrl}/?p=${resolvedPostId}`,
    editUrl: yoastResult.editUrl,
    wordpress: {
      title: updatedPost?.title?.rendered || title || null,
      slug: updatedPost?.slug || slug || null,
      status: updatedPost?.status || "draft",
      commentStatus: updatedPost?.comment_status || commentStatus,
      pingStatus: updatedPost?.ping_status || pingStatus,
    },
    yoast: yoastResult.stored,
    proof: yoastResult.proof,
  };
}
