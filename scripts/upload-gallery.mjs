import { createClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://cjqmterrgrthhpxmaoxc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcW10ZXJyZ3J0aGhweG1hb3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3OTAwMiwiZXhwIjoyMDkzNzU1MDAyfQ.iB40oqOJ5r20O3TLFWccHHua-6Jokzqe0CgP8dVb_us';
const BUCKET = 'nail-gallery';
const UNAS_DIR = path.join(process.cwd(), 'public', 'unas');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  realtime: { transport: WebSocket },
});

async function main() {
  // Create bucket if it doesn't exist
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Bucket error:', bucketError.message);
    process.exit(1);
  }
  console.log(`Bucket "${BUCKET}" ready.`);

  const files = fs.readdirSync(UNAS_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  console.log(`Uploading ${files.length} images...`);

  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(UNAS_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = file.match(/\.png$/i) ? 'image/png' : 'image/jpeg';

    const { error } = await supabase.storage.from(BUCKET).upload(file, fileBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error(`  ✗ ${file}: ${error.message}`);
    } else {
      uploaded++;
      if (uploaded % 20 === 0) console.log(`  ${uploaded}/${files.length} uploaded...`);
    }
  }

  console.log(`\nDone! ${uploaded} uploaded, ${skipped} skipped.`);
  console.log(`\nPublic URL pattern:`);
  console.log(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/u1.jpg`);
}

main().catch(console.error);
