// Firebase Admin SDK setup for uploading product images to Firebase Storage.
// Credentials come from Replit Secrets — never hardcode them here.
import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Private keys are stored with literal "\n" sequences; convert them back to
// real newlines or the PEM parser rejects the key.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

let bucket: ReturnType<typeof admin.storage.prototype.bucket> | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(projectId && clientEmail && privateKey && storageBucket);
}

export function getFirebaseBucket() {
  if (!isFirebaseConfigured()) {
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
