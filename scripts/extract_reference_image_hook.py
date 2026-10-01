from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

text = text.replace(
    "import { useSceneOrchestration } from './hooks/useSceneOrchestration';\n\nimport { sanitizeReferenceImage } from './engine/referenceImage';\nimport { deleteImageFromDB, loadImageFromDB, saveImageToDB } from './storage/referenceImageStorage';\n",
    "import { useSceneOrchestration } from './hooks/useSceneOrchestration';\nimport { useReferenceImage } from './hooks/useReferenceImage';\n\n"
)

state_marker = "  const [isLoaded, setIsLoaded] = useState(false);\n"
hook_block = """  const [isLoaded, setIsLoaded] = useState(false);\n\n  const {\n    imageUrl,\n    hasReference,\n    hydrateReferenceImage,\n    handleImageUpload,\n    handleImageDelete\n  } = useReferenceImage(setState);\n"""
if state_marker not in text:
    raise RuntimeError('isLoaded marker not found')
text = text.replace(state_marker, hook_block, 1)

text = text.replace("  const [imageUrl, setImageUrl] = useState<string | null>(null);\n", "", 1)
text = text.replace("  const [hasReference, setHasReference] = useState<boolean>(false);\n", "", 1)

blob_start = text.find("        const blob = await loadImageFromDB();\n")
if blob_start == -1:
    raise RuntimeError('reference image hydration start not found')
catch_marker = "      } catch (e) { console.error('Failed to load local data', e); }"
blob_end = text.find(catch_marker, blob_start)
if blob_end == -1:
    raise RuntimeError('initial data catch marker not found')
text = text[:blob_start] + "        await hydrateReferenceImage();\n" + text[blob_end:]

load_call = "    loadInitialData();\n  }, []);"
if load_call not in text:
    raise RuntimeError('loadInitialData effect ending not found')
text = text.replace(load_call, "    loadInitialData();\n  }, [hydrateReferenceImage]);", 1)

cleanup = "  useEffect(() => { return () => { if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl); }; }, [imageUrl]);\n"
if cleanup not in text:
    raise RuntimeError('image URL cleanup effect not found')
text = text.replace(cleanup, "", 1)

handler_start = text.find("  const handleImageUpload = async")
handler_end_marker = "  const handleSavePreset = () => {"
handler_end = text.find(handler_end_marker, handler_start)
if handler_start == -1 or handler_end == -1:
    raise RuntimeError('reference image handler region not found')
text = text[:handler_start] + text[handler_end:]

path.write_text(text)
