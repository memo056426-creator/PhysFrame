from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

# 1) Never auto-override the user's hairstyle in resolveConflicts.
auto_hair_block = """  if (newState.sceneFamily === 'gym' && newState.activity === 'بعد التمرين' && !newState.hairStyle.includes('تمرين')) {\n    newState.hairStyle = 'h5'; \n  }\n  \n"""
text = text.replace(auto_hair_block, "")

# 2) Add a dedicated negative-constraint builder for hair preservation.
marker = "const buildSemanticScene = (state: SceneState, derived: DerivedSceneState): SemanticScene => {"
helper = """const buildNegativeConstraints = (state: SceneState): string[] => {\n  const crowdConstraints = state.backgroundDynamics === 'empty'\n    ? ['background people', 'crowd', 'background people staring at camera', 'posed background characters']\n    : ['background people staring at camera', 'posed background characters', 'generic stock-photo crowd', 'duplicated people', 'cloned faces'];\n\n  return [\n    ...crowdConstraints,\n    'altered hair volume',\n    'added hair density',\n    'filled bald spots',\n    'wig',\n    'unnaturally thick hair',\n    'altered hairline'\n  ];\n};\n\n"""
if 'const buildNegativeConstraints = (state: SceneState)' not in text:
    if marker not in text:
        raise SystemExit('buildSemanticScene marker not found')
    text = text.replace(marker, helper + marker, 1)

# 3) Keep the selected hairstyle, while locking density, volume, hairline and scalp visibility to the reference.
old_hair = "    hair: `${hair?.prompt}. Physics: ${hair?.physics}. ${derived.hairCondition}.`,"
new_hair = "    hair: `${hair?.prompt}. Physics: ${hair?.physics}. ${derived.hairCondition}. CRITICAL: Apply the selected hairstyle, but maintain the EXACT biological hair density, volume, hairline, and scalp visibility seen in the reference image. DO NOT artificially thicken hair or fill in sparse areas.`,"
if old_hair in text:
    text = text.replace(old_hair, new_hair, 1)
elif 'CRITICAL: Apply the selected hairstyle' not in text:
    raise SystemExit('semantic hair output marker not found')

# 4) Route Negative Prompt generation through buildNegativeConstraints.
old_negative = """    negativePrompt: state.backgroundDynamics === 'empty'\n      ? 'background people, crowd, background people staring at camera, posed background characters'\n      : 'background people staring at camera, posed background characters, generic stock-photo crowd, duplicated people, cloned faces'"""
new_negative = "    negativePrompt: buildNegativeConstraints(state).join(', ')"
if old_negative in text:
    text = text.replace(old_negative, new_negative, 1)
elif 'negativePrompt: buildNegativeConstraints(state).join' not in text:
    raise SystemExit('negative prompt marker not found')

path.write_text(text)
print('Hair manual-control and density-lock patch applied successfully.')
