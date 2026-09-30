import { readFileSync, writeFileSync } from 'node:fs';

const appPath = 'src/App.tsx';
let source = readFileSync(appPath, 'utf8');

const importLine = "import { REFERENCE_IMAGE_ACCEPT, sanitizeReferenceImage } from './engine/referenceImage';";
if (!source.includes(importLine)) {
  const marker = '\n// --- TYPES ---';
  if (!source.includes(marker)) throw new Error('Could not find App.tsx import marker');
  source = source.replace(marker, `\n${importLine}\n${marker}`);
}

const oldLoad = `        const blob = await loadImageFromDB();\n        if (blob) { setImageUrl(URL.createObjectURL(blob)); setHasReference(true); }`;
const newLoad = `        const blob = await loadImageFromDB();\n        if (blob) {\n          try {\n            const safeBlob = await sanitizeReferenceImage(blob);\n            await saveImageToDB(safeBlob);\n            setImageUrl(URL.createObjectURL(safeBlob));\n            setHasReference(true);\n          } catch (error) {\n            console.warn('Discarded an unsafe or unsupported stored reference image.', error);\n            await deleteImageFromDB();\n          }\n        }`;
if (source.includes(oldLoad)) source = source.replace(oldLoad, newLoad);
else if (!source.includes('Discarded an unsafe or unsupported stored reference image.')) throw new Error('Could not find stored reference-image load block');

const oldUpload = `  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (!file) return;\n\n    try {\n      await saveImageToDB(file);\n    } catch (error) {\n      console.warn('Could not persist reference image in IndexedDB; using session preview only.', error);\n    }\n\n    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);\n    setImageUrl(URL.createObjectURL(file));\n    setHasReference(true);\n    setState(prev => ({ ...prev, referenceImageId: file.name }));\n  };`;
const newUpload = `  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (!file) return;\n\n    let safeImage: Blob;\n    try {\n      safeImage = await sanitizeReferenceImage(file);\n    } catch (error) {\n      console.warn('Rejected unsafe or unsupported reference image.', error);\n      e.currentTarget.value = '';\n      return;\n    }\n\n    try {\n      await saveImageToDB(safeImage);\n    } catch (error) {\n      console.warn('Could not persist reference image in IndexedDB; using session preview only.', error);\n    }\n\n    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);\n    setImageUrl(URL.createObjectURL(safeImage));\n    setHasReference(true);\n    setState(prev => ({ ...prev, referenceImageId: file.name }));\n  };`;
if (source.includes(oldUpload)) source = source.replace(oldUpload, newUpload);
else if (!source.includes("Rejected unsafe or unsupported reference image.")) throw new Error('Could not find reference-image upload block');

const legacyAccept = 'accept="image/*"';
const acceptCount = source.split(legacyAccept).length - 1;
if (acceptCount > 0) source = source.split(legacyAccept).join('accept={REFERENCE_IMAGE_ACCEPT}');
if (!source.includes('accept={REFERENCE_IMAGE_ACCEPT}')) throw new Error('Could not update reference-image accept filter');

writeFileSync(appPath, source);
console.log(`Materialized CodeQL image-upload fixes; replaced ${acceptCount} legacy accept attributes.`);
