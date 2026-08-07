// Firebase Admin SDK setup for uploading product images to Firebase Storage.
// Credentials come from environment variables — never hardcode them here.
import admin from "firebase-admin";

// NOTE: these are read lazily (inside functions below), never at module load
// time. ES module `import` statements are hoisted and run before any other
// top-level code in the importing file — including a later `dotenv.config()`
// call in index.ts — so reading process.env here at module scope would
// permanently cache `undefined` regardless of when/whether the .env file
// actually gets loaded.
function readFirebaseEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private keys are stored with literal "\n" sequences; convert them back to
  // real newlines or the PEM parser rejects the key.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  // Accept either the bare bucket name (e.g. "my-project.appspot.com") or the
  // "gs://" URI form some Firebase Console pages display — the Admin SDK only
  // accepts the bare name and throws immediately if given the URI form.
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.replace(/^gs:\/\//, "");
  return { projectId, clientEmail, privateKey, storageBucket };
}

let bucket: ReturnType<typeof admin.storage.prototype.bucket> | null = null;

export function isFirebaseConfigured(): boolean {
  const { projectId, clientEmail, privateKey, storageBucket } = readFirebaseEnv();
  return Boolean(projectId && clientEmail && privateKey && storageBucket);
}

export function getFirebaseBucket() {
  const { projectId, clientEmail, privateKey, storageBucket } = readFirebaseEnv();

  if (!(projectId && clientEmail && privateKey && storageBucket)) {
    throw new Error(
      "Firebase is not configured — missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, or FIREBASE_STORAGE_BUCKET.",
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  }

  if (!bucket) {
    bucket = admin.storage().bucket();
  }

  return bucket;
}

// Uploads a buffer to Firebase Storage under `products/` and returns a
// public download URL, matching the pattern the legacy mobile app relied on
// (upload to Storage, then save the resulting URL on the product record).
export async function uploadProductImageBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const bucket = getFirebaseBucket();
  const filePath = `products/${filename}`;
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: { contentType },
  });
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}
