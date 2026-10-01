from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_exact(path: str, old: str, new: str) -> None:
    file_path = ROOT / path
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one occurrence, found {count}: {old!r}')
    file_path.write_text(text.replace(old, new), encoding='utf-8')


replace_exact(
    'src/engine/capabilities.ts',
    "export const getSubSceneCapability = (sceneFamily: SceneFamilyId, subScene: SubSceneId | ''): SubSceneCapability | undefined =>\n  SCENE_CAPABILITIES[sceneFamily].subScenes?.[subScene];",
    "export const getSubSceneCapability = (sceneFamily: SceneFamilyId, subScene: SubSceneId | ''): SubSceneCapability | undefined =>\n  subScene ? SCENE_CAPABILITIES[sceneFamily].subScenes?.[subScene] : undefined;"
)

replace_exact(
    'src/engine/rules.ts',
    "  if (!family.subScenes.includes(next.subScene)) next.subScene = firstOr(family.subScenes, '');",
    "  if (!next.subScene || !family.subScenes.includes(next.subScene)) next.subScene = firstOr(family.subScenes, '');"
)

replace_exact(
    'src/engine/rules.test.ts',
    "      subScene: 'غير صالح',",
    "      subScene: '',"
)

print('Typed sub-scene edge cases fixed.')
