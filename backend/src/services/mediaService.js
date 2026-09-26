const path = require("path");
const crypto = require("crypto");
const pool = require("../config/database");
const { getBucket } = require("../config/firebase");
const rtdbService = require("./rtdbService");
const rvmService = require("./rvmService");
const { writeAudit } = require("./auditService");

async function uploadRvmMedia({
  rvmId,
  mediaType,
  buffer,
  originalName,
  contentType,
  title,
  uploadedBy,
}) {
  const rvm = await rvmService.findById(rvmId);
  if (!rvm) {
    throw Object.assign(new Error("RVM not found"), { status: 404 });
  }

  const ext = path.extname(originalName || "") || (mediaType === "VIDEO" ? ".mp4" : ".jpg");
  const storagePath = `rvm-content/${rvm.rvm_code}/${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}${ext}`;

  const bucket = getBucket();
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: { contentType: contentType || "application/octet-stream" },
    resumable: false,
  });

  // Make readable via signed URL (7 days) — RTDB stores the URL for simulator
  const [downloadUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  // Deactivate previous active media of same type optionally keep history
  await pool.query(
    `UPDATE rvm_media SET is_active = false, updated_at = now()
     WHERE rvm_id = $1 AND is_active = true`,
    [rvmId]
  );

  const result = await pool.query(
    `INSERT INTO rvm_media
      (rvm_id, media_type, storage_path, download_url, title, is_active, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,true,$6)
     RETURNING *`,
    [rvmId, mediaType, storagePath, downloadUrl, title || null, uploadedBy.user_id]
  );

  const media = result.rows[0];

  await rtdbService.setRvmDisplayContent(rvm.rvm_code, {
    media_id: media.media_id,
    media_type: media.media_type,
    url: downloadUrl,
    title: media.title,
    storage_path: storagePath,
  });

  await writeAudit({
    actorUserId: uploadedBy.user_id,
    actorType: uploadedBy.role,
    action: "RVM_MEDIA_UPLOAD",
    entityType: "rvm_media",
    entityId: media.media_id,
    afterData: { rvm_id: rvmId, media_type: mediaType, storage_path: storagePath },
  });

  return media;
}

async function listMediaForRvm(rvmId) {
  const result = await pool.query(
    `SELECT * FROM rvm_media WHERE rvm_id = $1 ORDER BY created_at DESC`,
    [rvmId]
  );
  return result.rows;
}

async function getActiveMedia(rvmId) {
  const result = await pool.query(
    `SELECT * FROM rvm_media WHERE rvm_id = $1 AND is_active = true
     ORDER BY created_at DESC LIMIT 1`,
    [rvmId]
  );
  return result.rows[0] || null;
}

module.exports = { uploadRvmMedia, listMediaForRvm, getActiveMedia };
