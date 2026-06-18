import type {
  CaseDefinition,
  SceneDefinition,
  EvidenceDefinition,
  ClueDefinition,
  ValidationIssue,
  ValidationResult,
  ValidationSeverity
} from '@/types'

export const VALIDATION_CODES = {
  DUPLICATE_ID: 'DUPLICATE_ID',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_REFERENCE: 'INVALID_REFERENCE',
  INVALID_VALUE: 'INVALID_VALUE',
  EMPTY_COLLECTION: 'EMPTY_COLLECTION',
  ORPHANED_REFERENCE: 'ORPHANED_REFERENCE',
  CIRCULAR_REFERENCE: 'CIRCULAR_REFERENCE',
  INCONSISTENT_DATA: 'INCONSISTENT_DATA',
  PERFORMANCE_WARNING: 'PERFORMANCE_WARNING',
  BEST_PRACTICE: 'BEST_PRACTICE'
} as const

function createIssue(
  severity: ValidationSeverity,
  code: string,
  message: string,
  context: Partial<ValidationIssue> = {}
): ValidationIssue {
  return { severity, code, message, ...context }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidNumber(value: unknown, min?: number, max?: number): value is number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return false
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  return true
}

function validateEvidenceDefinition(
  evidence: EvidenceDefinition,
  context: { caseId: string; sceneId: string; toolIds: Set<string>; materialIds: Set<string>; clueIds: Set<string>; allEvidenceIds: Set<string> }
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { caseId, sceneId, toolIds, materialIds, clueIds, allEvidenceIds } = context

  if (!isNonEmptyString(evidence.id)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '证据ID不能为空', { caseId, sceneId, field: 'id' }))
  } else if (!allEvidenceIds.has(evidence.id)) {
    issues.push(createIssue('warning', VALIDATION_CODES.BEST_PRACTICE, `证据ID ${evidence.id} 建议使用 case-scene-evidence 格式`, { caseId, sceneId, evidenceId: evidence.id, suggestion: `例如: ${caseId}-${sceneId}-short-name` }))
  }

  if (!isNonEmptyString(evidence.name)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '证据名称不能为空', { caseId, sceneId, evidenceId: evidence.id, field: 'name' }))
  }

  if (!isNonEmptyString(evidence.description)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '证据描述不能为空', { caseId, sceneId, evidenceId: evidence.id, field: 'description' }))
  }

  const validTypes = ['document', 'object', 'trace', 'testimony', 'image', 'text_fragment', 'audio']
  if (!validTypes.includes(evidence.type)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_TYPE, `证据类型 "${evidence.type}" 无效，有效值: ${validTypes.join(', ')}`, { caseId, sceneId, evidenceId: evidence.id, field: 'type' }))
  }

  if (!isValidNumber(evidence.sanityEffect, -100, 100)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_VALUE, `sanityEffect 必须是 -100 到 100 之间的数字，当前: ${evidence.sanityEffect}`, { caseId, sceneId, evidenceId: evidence.id, field: 'sanityEffect' }))
  }

  if (!evidence.location || !isValidNumber(evidence.location.x, 0, 100) || !isValidNumber(evidence.location.y, 0, 100)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, 'location.x 和 location.y 必须是 0-100 之间的数字', { caseId, sceneId, evidenceId: evidence.id, field: 'location' }))
  }

  if (!evidence.size || !isValidNumber(evidence.size.width, 1, 100) || !isValidNumber(evidence.size.height, 1, 100)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, 'size.width 和 size.height 必须是 1-100 之间的数字', { caseId, sceneId, evidenceId: evidence.id, field: 'size' }))
  }

  if (!isValidNumber(evidence.baseHitRate, 0, 100)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_VALUE, `baseHitRate 必须是 0-100 之间的数字，当前: ${evidence.baseHitRate}`, { caseId, sceneId, evidenceId: evidence.id, field: 'baseHitRate' }))
  } else if (evidence.baseHitRate < 20) {
    issues.push(createIssue('warning', VALIDATION_CODES.PERFORMANCE_WARNING, `baseHitRate (${evidence.baseHitRate}) 过低，可能导致玩家体验不佳`, { caseId, sceneId, evidenceId: evidence.id, suggestion: '建议设置不低于 20%' }))
  }

  if (evidence.requiredTool && !toolIds.has(evidence.requiredTool)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_REFERENCE, `requiredTool "${evidence.requiredTool}" 引用了不存在的工具ID`, { caseId, sceneId, evidenceId: evidence.id, field: 'requiredTool' }))
  }

  if (evidence.toolBoost) {
    evidence.toolBoost.forEach((toolId, index) => {
      if (!toolIds.has(toolId)) {
        issues.push(createIssue('error', VALIDATION_CODES.INVALID_REFERENCE, `toolBoost[${index}] "${toolId}" 引用了不存在的工具ID`, { caseId, sceneId, evidenceId: evidence.id, field: `toolBoost.${index}` }))
      }
    })
  }

  if (evidence.hiddenClues) {
    evidence.hiddenClues.forEach((clueId, index) => {
      if (!clueIds.has(clueId)) {
        issues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `hiddenClues[${index}] "${clueId}" 引用了不存在的线索ID`, { caseId, sceneId, evidenceId: evidence.id, field: `hiddenClues.${index}` }))
      }
    })
  }

  if (evidence.materialDrops) {
    evidence.materialDrops.forEach((drop, index) => {
      if (!materialIds.has(drop.materialId)) {
        issues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `materialDrops[${index}].materialId "${drop.materialId}" 引用了不存在的材料ID`, { caseId, sceneId, evidenceId: evidence.id, field: `materialDrops.${index}.materialId` }))
      }
      if (!isValidNumber(drop.chance, 0, 100)) {
        issues.push(createIssue('error', VALIDATION_CODES.INVALID_VALUE, `materialDrops[${index}].chance 必须是 0-100 之间的数字`, { caseId, sceneId, evidenceId: evidence.id, field: `materialDrops.${index}.chance` }))
      }
    })
  }

  if (evidence.discoveryTrigger?.type === 'evidence_combo' && evidence.discoveryTrigger.requiredEvidenceIds) {
    evidence.discoveryTrigger.requiredEvidenceIds.forEach((eid, index) => {
      if (!allEvidenceIds.has(eid)) {
        issues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `discoveryTrigger.requiredEvidenceIds[${index}] "${eid}" 引用了不存在的证据ID`, { caseId, sceneId, evidenceId: evidence.id }))
      }
    })
  }

  return issues
}

function validateClueDefinition(
  clue: ClueDefinition,
  context: { caseId: string; allClueIds: Set<string>; toolIds: Set<string> }
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { caseId, allClueIds, toolIds } = context

  if (!isNonEmptyString(clue.id)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '线索ID不能为空', { caseId, field: 'id' }))
  }

  if (!isNonEmptyString(clue.name)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '线索名称不能为空', { caseId, clueId: clue.id, field: 'name' }))
  }

  if (!isNonEmptyString(clue.description)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '线索描述不能为空', { caseId, clueId: clue.id, field: 'description' }))
  }

  const validTypes = ['physical', 'testimonial', 'documentary', 'deduction']
  if (!validTypes.includes(clue.type)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_TYPE, `线索类型 "${clue.type}" 无效，有效值: ${validTypes.join(', ')}`, { caseId, clueId: clue.id, field: 'type' }))
  }

  if (!isNonEmptyString(clue.source)) {
    issues.push(createIssue('warning', VALIDATION_CODES.MISSING_FIELD, '建议为线索添加 source 字段说明来源', { caseId, clueId: clue.id, field: 'source', suggestion: '例如: "证据A + 证据B"' }))
  }

  if (!isValidNumber(clue.importance, 1, 5)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_VALUE, `importance 必须是 1-5 之间的整数，当前: ${clue.importance}`, { caseId, clueId: clue.id, field: 'importance' }))
  }

  if (clue.connections) {
    clue.connections.forEach((connectedId, index) => {
      if (connectedId === clue.id) {
        issues.push(createIssue('error', VALIDATION_CODES.CIRCULAR_REFERENCE, `线索不能关联自身`, { caseId, clueId: clue.id, field: `connections.${index}` }))
      } else if (!allClueIds.has(connectedId)) {
        issues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `connections[${index}] "${connectedId}" 引用了不存在的线索ID`, { caseId, clueId: clue.id, field: `connections.${index}` }))
      }
    })
  }

  if (clue.requiredToolForAnalysis && !toolIds.has(clue.requiredToolForAnalysis)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_REFERENCE, `requiredToolForAnalysis "${clue.requiredToolForAnalysis}" 引用了不存在的工具ID`, { caseId, clueId: clue.id, field: 'requiredToolForAnalysis' }))
  }

  return issues
}

function validateSceneDefinition(
  scene: SceneDefinition,
  context: { caseId: string; allSceneIds: Set<string>; toolIds: Set<string>; materialIds: Set<string>; allEvidenceIds: Set<string>; clueIds: Set<string> }
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { caseId, allSceneIds, toolIds, materialIds, allEvidenceIds, clueIds } = context

  if (!isNonEmptyString(scene.id)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '场景ID不能为空', { caseId, field: 'id' }))
  }

  if (!isNonEmptyString(scene.name)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '场景名称不能为空', { caseId, sceneId: scene.id, field: 'name' }))
  }

  if (!isNonEmptyString(scene.description)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '场景描述不能为空', { caseId, sceneId: scene.id, field: 'description' }))
  }

  if (!scene.evidence || scene.evidence.length === 0) {
    issues.push(createIssue('warning', VALIDATION_CODES.EMPTY_COLLECTION, '场景中没有定义任何证据', { caseId, sceneId: scene.id, suggestion: '至少添加一个证据' }))
  }

  if (scene.unlockConditions) {
    scene.unlockConditions.forEach((condition, index) => {
      if (condition.requiredEvidenceIds) {
        condition.requiredEvidenceIds.forEach((eid, eIndex) => {
          if (!allEvidenceIds.has(eid)) {
            issues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `unlockConditions[${index}].requiredEvidenceIds[${eIndex}] "${eid}" 引用了不存在的证据ID`, { caseId, sceneId: scene.id }))
          }
        })
      }
      if (condition.requiredToolIds) {
        condition.requiredToolIds.forEach((tid, tIndex) => {
          if (!toolIds.has(tid)) {
            issues.push(createIssue('error', VALIDATION_CODES.INVALID_REFERENCE, `unlockConditions[${index}].requiredToolIds[${tIndex}] "${tid}" 引用了不存在的工具ID`, { caseId, sceneId: scene.id }))
          }
        })
      }
      if (condition.requiredSceneIds) {
        condition.requiredSceneIds.forEach((sid, sIndex) => {
          if (!allSceneIds.has(sid)) {
            issues.push(createIssue('error', VALIDATION_CODES.INVALID_REFERENCE, `unlockConditions[${index}].requiredSceneIds[${sIndex}] "${sid}" 引用了不存在的场景ID`, { caseId, sceneId: scene.id }))
          }
        })
      }
    })
  }

  const sceneEvidenceIds = new Set<string>()
  scene.evidence.forEach(evidence => {
    if (evidence.id && sceneEvidenceIds.has(evidence.id)) {
      issues.push(createIssue('error', VALIDATION_CODES.DUPLICATE_ID, `场景内证据ID重复: ${evidence.id}`, { caseId, sceneId: scene.id, evidenceId: evidence.id }))
    }
    sceneEvidenceIds.add(evidence.id)
    issues.push(...validateEvidenceDefinition(evidence, { caseId, sceneId: scene.id, toolIds, materialIds, clueIds, allEvidenceIds }))
  })

  return issues
}

export function validateCaseDefinition(
  caseDef: CaseDefinition,
  context: { toolIds: Set<string>; materialIds: Set<string> }
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { toolIds, materialIds } = context

  if (!isNonEmptyString(caseDef.id)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '案件ID不能为空', { field: 'id' }))
    return issues
  }

  const caseId = caseDef.id

  if (!isNonEmptyString(caseDef.title)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '案件标题不能为空', { caseId, field: 'title' }))
  }

  if (!isNonEmptyString(caseDef.description)) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '案件描述不能为空', { caseId, field: 'description' }))
  }

  const validDifficulties = ['easy', 'normal', 'hard']
  if (!validDifficulties.includes(caseDef.difficulty)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_TYPE, `difficulty "${caseDef.difficulty}" 无效，有效值: ${validDifficulties.join(', ')}`, { caseId, field: 'difficulty' }))
  }

  if (!isValidNumber(caseDef.sanityCost, 0, 100)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_VALUE, `sanityCost 必须是 0-100 之间的数字，当前: ${caseDef.sanityCost}`, { caseId, field: 'sanityCost' }))
  }

  if (!isValidNumber(caseDef.recommendedSanity, 0, 100)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_VALUE, `recommendedSanity 必须是 0-100 之间的数字，当前: ${caseDef.recommendedSanity}`, { caseId, field: 'recommendedSanity' }))
  } else if (caseDef.recommendedSanity < caseDef.sanityCost) {
    issues.push(createIssue('warning', VALIDATION_CODES.INCONSISTENT_DATA, `recommendedSanity (${caseDef.recommendedSanity}) 低于 sanityCost (${caseDef.sanityCost})`, { caseId, suggestion: '推荐理智值应高于或等于消耗的理智值' }))
  }

  if (!isValidNumber(caseDef.chapter, 1)) {
    issues.push(createIssue('error', VALIDATION_CODES.INVALID_VALUE, `chapter 必须是大于等于 1 的整数，当前: ${caseDef.chapter}`, { caseId, field: 'chapter' }))
  }

  if (!caseDef.scenes || caseDef.scenes.length === 0) {
    issues.push(createIssue('error', VALIDATION_CODES.EMPTY_COLLECTION, '案件必须至少定义一个场景', { caseId, field: 'scenes' }))
  }

  if (!caseDef.clues || caseDef.clues.length === 0) {
    issues.push(createIssue('warning', VALIDATION_CODES.EMPTY_COLLECTION, '案件中没有定义任何线索', { caseId, field: 'clues', suggestion: '建议添加与证据关联的线索' }))
  }

  if (!caseDef.timeLimit) {
    issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, '必须定义 timeLimit 配置', { caseId, field: 'timeLimit' }))
  } else {
    if (!isValidNumber(caseDef.timeLimit.totalSeconds, 60)) {
      issues.push(createIssue('error', VALIDATION_CODES.INVALID_VALUE, `timeLimit.totalSeconds 必须至少为 60 秒`, { caseId, field: 'timeLimit.totalSeconds' }))
    }
  }

  if (caseDef.startingTools) {
    caseDef.startingTools.forEach((toolId, index) => {
      if (!toolIds.has(toolId)) {
        issues.push(createIssue('error', VALIDATION_CODES.INVALID_REFERENCE, `startingTools[${index}] "${toolId}" 引用了不存在的工具ID`, { caseId, field: `startingTools.${index}` }))
      }
    })
  }

  const allSceneIds = new Set(caseDef.scenes.map(s => s.id))
  const allEvidenceIds = new Set<string>()
  caseDef.scenes.forEach(scene => scene.evidence.forEach(e => allEvidenceIds.add(e.id)))
  const allClueIds = new Set(caseDef.clues.map(c => c.id))

  const sceneIdCounts = new Map<string, number>()
  caseDef.scenes.forEach(scene => {
    const count = (sceneIdCounts.get(scene.id) || 0) + 1
    sceneIdCounts.set(scene.id, count)
    if (count > 1) {
      issues.push(createIssue('error', VALIDATION_CODES.DUPLICATE_ID, `场景ID重复: ${scene.id}`, { caseId, sceneId: scene.id }))
    }
  })

  const clueIdCounts = new Map<string, number>()
  caseDef.clues.forEach(clue => {
    const count = (clueIdCounts.get(clue.id) || 0) + 1
    clueIdCounts.set(clue.id, count)
    if (count > 1) {
      issues.push(createIssue('error', VALIDATION_CODES.DUPLICATE_ID, `线索ID重复: ${clue.id}`, { caseId, clueId: clue.id }))
    }
  })

  caseDef.scenes.forEach(scene => {
    issues.push(...validateSceneDefinition(scene, { caseId, allSceneIds, toolIds, materialIds, allEvidenceIds, clueIds: allClueIds }))
  })

  caseDef.clues.forEach(clue => {
    issues.push(...validateClueDefinition(clue, { caseId, allClueIds, toolIds }))
  })

  if (caseDef.conclusion) {
    if (!caseDef.conclusion.correctAnswer) {
      issues.push(createIssue('error', VALIDATION_CODES.MISSING_FIELD, 'conclusion.correctAnswer 不能为空', { caseId, field: 'conclusion.correctAnswer' }))
    }
    if (!caseDef.conclusion.options || caseDef.conclusion.options.length === 0) {
      issues.push(createIssue('error', VALIDATION_CODES.EMPTY_COLLECTION, 'conclusion.options 不能为空', { caseId, field: 'conclusion.options' }))
    } else {
      const hasCorrect = caseDef.conclusion.options.some(opt => opt.id === caseDef.conclusion.correctAnswer && opt.isCorrect)
      if (!hasCorrect) {
        issues.push(createIssue('error', VALIDATION_CODES.INCONSISTENT_DATA, `correctAnswer "${caseDef.conclusion.correctAnswer}" 在 options 中不存在或未标记为正确`, { caseId, field: 'conclusion.correctAnswer' }))
      }
      caseDef.conclusion.options.forEach((opt, index) => {
        if (opt.requiredEvidence) {
          opt.requiredEvidence.forEach((eid, eIndex) => {
            if (!allEvidenceIds.has(eid)) {
              issues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `conclusion.options[${index}].requiredEvidence[${eIndex}] "${eid}" 引用了不存在的证据ID`, { caseId }))
            }
          })
        }
        if (opt.requiredTools) {
          opt.requiredTools.forEach((tid, tIndex) => {
            if (!toolIds.has(tid)) {
              issues.push(createIssue('error', VALIDATION_CODES.INVALID_REFERENCE, `conclusion.options[${index}].requiredTools[${tIndex}] "${tid}" 引用了不存在的工具ID`, { caseId }))
            }
          })
        }
      })
    }
  }

  if (caseDef.prerequisites) {
    caseDef.prerequisites.forEach((prereqId, index) => {
      if (prereqId === caseDef.id) {
        issues.push(createIssue('error', VALIDATION_CODES.CIRCULAR_REFERENCE, '案件不能作为自己的前置条件', { caseId, field: `prerequisites.${index}` }))
      }
    })
  }

  if (caseDef.branchRewards) {
    Object.entries(caseDef.branchRewards).forEach(([branchName, rewards]) => {
      rewards.tools.forEach((toolId, index) => {
        if (!toolIds.has(toolId)) {
          issues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `branchRewards.${branchName}.tools[${index}] "${toolId}" 引用了不存在的工具ID`, { caseId }))
        }
      })
    })
  }

  return issues
}

export function validateAllCaseDefinitions(
  caseDefinitions: CaseDefinition[],
  context: { toolIds: Set<string>; materialIds: Set<string> }
): ValidationResult {
  const allIssues: ValidationIssue[] = []
  const caseIdSet = new Set<string>()

  caseDefinitions.forEach(caseDef => {
    if (caseDef.id) {
      if (caseIdSet.has(caseDef.id)) {
        allIssues.push(createIssue('error', VALIDATION_CODES.DUPLICATE_ID, `案件ID重复: ${caseDef.id}`, { caseId: caseDef.id }))
      }
      caseIdSet.add(caseDef.id)
    }
    allIssues.push(...validateCaseDefinition(caseDef, context))
  })

  caseDefinitions.forEach(caseDef => {
    if (caseDef.prerequisites) {
      caseDef.prerequisites.forEach((prereqId, index) => {
        if (!caseIdSet.has(prereqId)) {
          allIssues.push(createIssue('error', VALIDATION_CODES.INVALID_REFERENCE, `prerequisites[${index}] "${prereqId}" 引用了不存在的案件ID`, { caseId: caseDef.id }))
        }
      })
    }
    if (caseDef.rewards?.unlocksCases) {
      caseDef.rewards.unlocksCases.forEach((unlockId, index) => {
        if (!caseIdSet.has(unlockId)) {
          allIssues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `rewards.unlocksCases[${index}] "${unlockId}" 引用了不存在的案件ID`, { caseId: caseDef.id }))
        }
      })
    }
    if (caseDef.branchRewards) {
      Object.entries(caseDef.branchRewards).forEach(([branchName, rewards]) => {
        rewards.unlocksCases.forEach((unlockId, index) => {
          if (!caseIdSet.has(unlockId)) {
            allIssues.push(createIssue('warning', VALIDATION_CODES.ORPHANED_REFERENCE, `branchRewards.${branchName}.unlocksCases[${index}] "${unlockId}" 引用了不存在的案件ID`, { caseId: caseDef.id }))
          }
        })
      })
    }
  })

  const errorCount = allIssues.filter(i => i.severity === 'error').length
  const warningCount = allIssues.filter(i => i.severity === 'warning').length
  const infoCount = allIssues.filter(i => i.severity === 'info').length

  return {
    isValid: errorCount === 0,
    issues: allIssues,
    errorCount,
    warningCount,
    infoCount,
    summary: `验证完成: ${caseDefinitions.length} 个案件, ${errorCount} 个错误, ${warningCount} 个警告, ${infoCount} 个提示`
  }
}

export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [result.summary, '']
  
  if (result.issues.length === 0) {
    lines.push('✅ 所有数据校验通过！')
    return lines.join('\n')
  }

  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')
  const infos = result.issues.filter(i => i.severity === 'info')

  if (errors.length > 0) {
    lines.push('❌ 错误:')
    errors.forEach(issue => {
      const loc = [issue.caseId, issue.sceneId, issue.evidenceId, issue.clueId].filter(Boolean).join(' > ')
      lines.push(`  [${issue.code}] ${loc ? loc + ': ' : ''}${issue.message}`)
      if (issue.suggestion) lines.push(`    💡 建议: ${issue.suggestion}`)
    })
  }

  if (warnings.length > 0) {
    lines.push('\n⚠️ 警告:')
    warnings.forEach(issue => {
      const loc = [issue.caseId, issue.sceneId, issue.evidenceId, issue.clueId].filter(Boolean).join(' > ')
      lines.push(`  [${issue.code}] ${loc ? loc + ': ' : ''}${issue.message}`)
      if (issue.suggestion) lines.push(`    💡 建议: ${issue.suggestion}`)
    })
  }

  if (infos.length > 0) {
    lines.push('\nℹ️ 提示:')
    infos.forEach(issue => {
      const loc = [issue.caseId, issue.sceneId, issue.evidenceId, issue.clueId].filter(Boolean).join(' > ')
      lines.push(`  [${issue.code}] ${loc ? loc + ': ' : ''}${issue.message}`)
      if (issue.suggestion) lines.push(`    💡 建议: ${issue.suggestion}`)
    })
  }

  return lines.join('\n')
}
