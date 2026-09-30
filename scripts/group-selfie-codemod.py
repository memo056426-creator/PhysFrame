from pathlib import Path

path = Path('src/App.tsx')
source = path.read_text()


def replace_once(old: str, new: str, label: str):
    global source
    if old not in source:
        raise RuntimeError(f'group selfie codemod could not find: {label}')
    source = source.replace(old, new, 1)

replace_once(
    "import { buildNegativeConstraints } from './engine/constraints';",
    "import { buildNegativeConstraints } from './engine/constraints';\nimport { buildGroupSelfieProfile, lintGroupSelfieText, type GroupSelfieCompanionCount } from './engine/groupSelfie';",
    'group selfie import'
)

replace_once(
    "  backgroundDynamics: BackgroundDynamics;\n}",
    "  backgroundDynamics: BackgroundDynamics;\n  groupSelfieEnabled: boolean;\n  groupSelfieCompanionCount: GroupSelfieCompanionCount;\n}",
    'SceneState group fields'
)

replace_once(
    "  const derived: DerivedSceneState = {",
    "  const groupSelfieProfile = buildGroupSelfieProfile({\n    enabled: state.groupSelfieEnabled,\n    companionCount: state.groupSelfieCompanionCount,\n    captureType: state.captureType\n  });\n  const derived: DerivedSceneState = {",
    'derived group profile'
)

replace_once(
    """  if (state.captureType === 'front-selfie') {\n    derived.lensEffects = 'smartphone front-camera aesthetic, 24mm equivalent focal length, slight natural barrel distortion at frame edges, handheld micro-shake. ' + derived.lensEffects;\n    derived.cameraDistance = state.framing === 'head-shoulders' ? 'close arm-reach (approx 40cm)' : 'extended arm-reach (approx 65cm)';\n  } else if (state.captureType === 'mirror-selfie') {""",
    """  if (state.captureType === 'front-selfie') {\n    if (groupSelfieProfile.active) {\n      derived.lensEffects = `${groupSelfieProfile.lensDescriptor}. ${derived.lensEffects}`;\n      derived.cameraDistance = groupSelfieProfile.cameraDistance;\n    } else {\n      derived.lensEffects = 'smartphone front-camera aesthetic, 24mm equivalent focal length, slight natural barrel distortion at frame edges, handheld micro-shake. ' + derived.lensEffects;\n      derived.cameraDistance = state.framing === 'head-shoulders' ? 'close arm-reach (approx 40cm)' : 'extended arm-reach (approx 65cm)';\n    }\n  } else if (state.captureType === 'mirror-selfie') {""",
    'front camera group geometry'
)

replace_once(
    "  const fabricPhysics = mergeFabricPhysics(outfit?.physics || [], derived.fabricBehavior);",
    "  const fabricPhysics = mergeFabricPhysics(outfit?.physics || [], derived.fabricBehavior);\n  const groupSelfieProfile = buildGroupSelfieProfile({ enabled: state.groupSelfieEnabled, companionCount: state.groupSelfieCompanionCount, captureType: state.captureType });",
    'semantic group profile'
)

replace_once(
    """  if (state.captureType === 'front-selfie') {\n    captureMechanics = `Smartphone front-camera selfie. Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Amateur framing behavior: ${derived.framingImperfectionDetails}. Gaze: ${gaze?.prompt}. ${derived.contactPhysics.find(p => p.includes('arm')) || ''}`;\n  } else if (state.captureType === 'mirror-selfie') {""",
    """  if (state.captureType === 'front-selfie') {\n    captureMechanics = groupSelfieProfile.active\n      ? `${groupSelfieProfile.captureMechanics} Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Amateur framing behavior: ${derived.framingImperfectionDetails}. Main-subject gaze: ${gaze?.prompt}. Shooter anatomy: ${derived.contactPhysics.find(p => p.includes('arm')) || ''}`\n      : `Smartphone front-camera selfie. Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Amateur framing behavior: ${derived.framingImperfectionDetails}. Gaze: ${gaze?.prompt}. ${derived.contactPhysics.find(p => p.includes('arm')) || ''}`;\n  } else if (state.captureType === 'mirror-selfie') {""",
    'group capture mechanics'
)

replace_once(
    """  return {\n    identity: state.hasGlasses\n      ? `${IDENTITY_LOCK} The subject wears eyeglasses in the reference image: STRICTLY preserve the exact same frame shape, color, proportions, lens geometry, bridge fit, and temple position.`\n      : IDENTITY_LOCK,""",
    """  const identityBase = state.hasGlasses\n    ? `${IDENTITY_LOCK} The subject wears eyeglasses in the reference image: STRICTLY preserve the exact same frame shape, color, proportions, lens geometry, bridge fit, and temple position.`\n    : IDENTITY_LOCK;\n\n  return {\n    identity: groupSelfieProfile.active ? `${identityBase} ${groupSelfieProfile.identityRules}` : identityBase,""",
    'group identity lock'
)

replace_once(
    "    poseAndContact: `Pose: ${state.pose}. Activity: ${state.activity}. Contact rules: ${derived.contactPhysics.filter(p => !p.includes('arm')).join('. ')}`,",
    "    poseAndContact: `Pose: ${state.pose}. Activity: ${state.activity}. Contact rules: ${derived.contactPhysics.filter(p => !p.includes('arm')).join('. ')}${groupSelfieProfile.active ? `. Group anatomical integrity: ${groupSelfieProfile.anatomyRules} Group candid dynamics: ${groupSelfieProfile.dynamicsRules}` : ''}`,",
    'group anatomy and dynamics'
)

replace_once(
    "    styleConstraints: Array.from(new Set([...derived.realismConstraints, ...backgroundDynamics.constraints])).join('. '),",
    "    styleConstraints: Array.from(new Set([...derived.realismConstraints, ...backgroundDynamics.constraints, ...groupSelfieProfile.styleConstraints])).join('. '),",
    'group style constraints'
)

replace_once(
    "    negativePrompt: buildNegativeConstraints(state).join(', ')",
    "    negativePrompt: buildNegativeConstraints({ backgroundDynamics: state.backgroundDynamics, groupSelfieEnabled: groupSelfieProfile.active }).join(', ')",
    'group negatives'
)

replace_once(
    """  const physicsWarnings = lintPhysicalText(\n    [semantic.hair, semantic.outfitPhysics, semantic.poseAndContact, semantic.skinResponse, semantic.cameraRealism, semantic.styleConstraints].join('\\n'),\n    { hasGlasses: state.hasGlasses, captureType: state.captureType }\n  );\n  ir.warnings.push(...warnings, ...physicsWarnings);\n  if (warnings.length || physicsWarnings.length) console.warn('[PhysFrame PromptLint]', [...warnings, ...physicsWarnings]);""",
    """  const physicsWarnings = lintPhysicalText(\n    [semantic.hair, semantic.outfitPhysics, semantic.poseAndContact, semantic.skinResponse, semantic.cameraRealism, semantic.styleConstraints].join('\\n'),\n    { hasGlasses: state.hasGlasses, captureType: state.captureType }\n  );\n  const groupWarnings = lintGroupSelfieText(\n    [semantic.identity, semantic.captureMechanics, semantic.poseAndContact, semantic.cameraRealism, semantic.styleConstraints].join('\\n'),\n    { enabled: state.groupSelfieEnabled, companionCount: state.groupSelfieCompanionCount, captureType: state.captureType }\n  );\n  ir.warnings.push(...warnings, ...physicsWarnings, ...groupWarnings);\n  if (warnings.length || physicsWarnings.length || groupWarnings.length) console.warn('[PhysFrame PromptLint]', [...warnings, ...physicsWarnings, ...groupWarnings]);""",
    'group linter'
)

replace_once(
    "backgroundDynamics: 'empty'\n};",
    "backgroundDynamics: 'empty', groupSelfieEnabled: false, groupSelfieCompanionCount: 2\n};",
    'default group state'
)

replace_once(
    "  const framingImperfections: FramingImperfection[] = ['perfect', 'dutch-angle', 'awkward-crop'];",
    "  const framingImperfections: FramingImperfection[] = ['perfect', 'dutch-angle', 'awkward-crop'];\n  const groupSelfieCounts: GroupSelfieCompanionCount[] = [1, 2, 3];",
    'group count validation list'
)

replace_once(
    "  if (!framingImperfections.includes(next.framingImperfection)) next.framingImperfection = DEFAULT_STATE.framingImperfection;",
    "  if (!framingImperfections.includes(next.framingImperfection)) next.framingImperfection = DEFAULT_STATE.framingImperfection;\n  if (!groupSelfieCounts.includes(next.groupSelfieCompanionCount)) next.groupSelfieCompanionCount = DEFAULT_STATE.groupSelfieCompanionCount;",
    'group count validation'
)

replace_once(
    "  next.hasGlasses = Boolean(next.hasGlasses);\n  next.useDigitalZoom = Boolean(next.useDigitalZoom);",
    "  next.hasGlasses = Boolean(next.hasGlasses);\n  next.useDigitalZoom = Boolean(next.useDigitalZoom);\n  next.groupSelfieEnabled = Boolean(next.groupSelfieEnabled);",
    'group bool normalization'
)

replace_once(
    "state.handProp, state.environmentRealism]);",
    "state.handProp, state.environmentRealism, state.groupSelfieEnabled]);",
    'resolver dependency'
)

replace_once(
    "onClick={() => setState({...state, captureType: t.id as CaptureType})}",
    "onClick={() => setState({...state, captureType: t.id as CaptureType, groupSelfieEnabled: t.id === 'front-selfie' ? state.groupSelfieEnabled : false})}",
    'capture selection group compatibility'
)

camera_marker = """                  </select>\n                  <div className=\"mt-3\">\n                    <label className=\"text-[11px] text-[var(--text-muted)] block mb-1\">عدم مثالية التأطير</label>"""
group_ui = """                  </select>\n                  {state.captureType === 'front-selfie' && (\n                    <div className=\"mt-3 space-y-2\">\n                      <label className=\"flex items-center justify-between gap-3 bg-black/10 border border-[var(--border)] rounded-xl px-3 py-2.5 cursor-pointer\">\n                        <div>\n                          <span className=\"text-xs font-medium block\">سيلفي جماعي</span>\n                          <span className=\"text-[10px] text-[var(--text-muted)]\">الموضوع الرئيسي هو المصوّر، مع منع استنساخ وجوه المرافقين</span>\n                        </div>\n                        <input type=\"checkbox\" checked={state.groupSelfieEnabled} onChange={e => setState({...state, groupSelfieEnabled: e.target.checked})} className=\"w-5 h-5 accent-[var(--accent)]\" />\n                      </label>\n                      {state.groupSelfieEnabled && (\n                        <div>\n                          <label className=\"text-[11px] text-[var(--text-muted)] block mb-1\">عدد المرافقين</label>\n                          <select value={state.groupSelfieCompanionCount} onChange={e => setState({...state, groupSelfieCompanionCount: Number(e.target.value) as GroupSelfieCompanionCount})} className=\"w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring\">\n                            <option value={1}>شخص واحد معي</option>\n                            <option value={2}>شخصان معي</option>\n                            <option value={3}>ثلاثة أشخاص معي</option>\n                          </select>\n                        </div>\n                      )}\n                    </div>\n                  )}\n                  <div className=\"mt-3\">\n                    <label className=\"text-[11px] text-[var(--text-muted)] block mb-1\">عدم مثالية التأطير</label>"""
replace_once(camera_marker, group_ui, 'group selfie camera UI')

old_duplicate_background = """                     <div>\n                       <label className=\"text-[11px] text-[var(--text-muted)] block mb-1\">حركة الخلفية</label>\n                       <select value={state.backgroundDynamics ?? 'empty'} onChange={e => setState({...state, backgroundDynamics: e.target.value as BackgroundDynamics})} className=\"w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring\">\n                         <option value=\"empty-still\">هادئة / فارغة</option>\n                         <option value=\"casual-indifferent\">عابرون غير مبالين</option>\n                         <option value=\"busy-motion\">مزدحمة وحركية</option>\n                       </select>\n                     </div>\n"""
replace_once(old_duplicate_background, '', 'stale duplicate background dropdown')

path.write_text(source)
print('Group selfie architecture materialized into src/App.tsx')
