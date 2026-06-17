import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CharacterProfile, CharacterStats, TalentEffectType } from '@/types'
import { defaultCharacters, createNewCharacter, getCharacterById as getCharById } from '@/data/characters'
import { talents, getTalentById, calculateTalentEffect, unlockTalent } from '@/data/talents'

const STORAGE_KEY = 'cthulhu-character-profiles'

export const useCharacterStore = defineStore('character', () => {
  const profiles = ref<CharacterProfile[]>([])
  const activeProfileId = ref<string | null>(null)

  const activeProfile = computed(() => {
    if (!activeProfileId.value) return null
    return profiles.value.find(p => p.id === activeProfileId.value) || null
  })

  const activeTalentIds = computed(() => {
    return activeProfile.value?.talents || []
  })

  const activeTalents = computed(() => {
    return activeTalentIds.value
      .map(id => getTalentById(id))
      .filter((t): t is typeof talents[0] => t !== undefined)
  })

  function loadProfilesFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        profiles.value = JSON.parse(data)
        const active = profiles.value.find(p => p.isActive)
        if (active) {
          activeProfileId.value = active.id
        }
      } else {
        profiles.value = [...defaultCharacters].map(c => ({ ...c, createdAt: Date.now(), updatedAt: Date.now() }))
        const defaultActive = profiles.value.find(p => p.id === 'detective')
        if (defaultActive) {
          defaultActive.isActive = true
          activeProfileId.value = defaultActive.id
        }
        saveProfilesToStorage()
      }
    } catch (error) {
      console.error('Failed to load character profiles:', error)
      profiles.value = [...defaultCharacters].map(c => ({ ...c, createdAt: Date.now(), updatedAt: Date.now() }))
      activeProfileId.value = 'detective'
    }
  }

  function saveProfilesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.value))
    } catch (error) {
      console.error('Failed to save character profiles:', error)
    }
  }

  function getCharacterById(characterId: string): CharacterProfile | undefined {
    return profiles.value.find(p => p.id === characterId) || getCharById(characterId)
  }

  function setActiveProfile(characterId: string): boolean {
    const profile = profiles.value.find(p => p.id === characterId)
    if (!profile) return false

    profiles.value.forEach(p => {
      p.isActive = false
    })
    profile.isActive = true
    activeProfileId.value = characterId
    saveProfilesToStorage()
    return true
  }

  function createProfile(
    name: string,
    title: string,
    stats: CharacterStats,
    talentIds: string[],
    avatar: string = '👤'
  ): CharacterProfile {
    const newProfile = createNewCharacter(name, title, stats, talentIds)
    newProfile.avatar = avatar
    profiles.value.push(newProfile)
    saveProfilesToStorage()
    return newProfile
  }

  function updateProfile(characterId: string, updates: Partial<CharacterProfile>): boolean {
    const profile = profiles.value.find(p => p.id === characterId)
    if (!profile) return false

    Object.assign(profile, updates)
    profile.updatedAt = Date.now()
    saveProfilesToStorage()
    return true
  }

  function deleteProfile(characterId: string): boolean {
    const index = profiles.value.findIndex(p => p.id === characterId)
    if (index === -1) return false
    if (profiles.value.length <= 1) return false

    profiles.value.splice(index, 1)
    
    if (activeProfileId.value === characterId) {
      const firstProfile = profiles.value[0]
      firstProfile.isActive = true
      activeProfileId.value = firstProfile.id
    }
    
    saveProfilesToStorage()
    return true
  }

  function addTalentToProfile(characterId: string, talentId: string): boolean {
    const profile = profiles.value.find(p => p.id === characterId)
    const talent = getTalentById(talentId)
    
    if (!profile || !talent) return false
    if (profile.talents.includes(talentId)) return false

    if (talent.prerequisites) {
      const hasPrereqs = talent.prerequisites.every(p => profile.talents.includes(p))
      if (!hasPrereqs) return false
    }

    if (talent.requiredStats) {
      for (const [stat, required] of Object.entries(talent.requiredStats)) {
        if (profile.stats[stat as keyof CharacterStats] < (required || 0)) {
          return false
        }
      }
    }

    profile.talents.push(talentId)
    profile.updatedAt = Date.now()
    unlockTalent(talentId)
    saveProfilesToStorage()
    return true
  }

  function removeTalentFromProfile(characterId: string, talentId: string): boolean {
    const profile = profiles.value.find(p => p.id === characterId)
    if (!profile) return false

    const index = profile.talents.indexOf(talentId)
    if (index === -1) return false

    const dependents = profile.talents.filter(t => {
      const talent = getTalentById(t)
      return talent?.prerequisites?.includes(talentId)
    })

    if (dependents.length > 0) {
      return false
    }

    profile.talents.splice(index, 1)
    profile.updatedAt = Date.now()
    saveProfilesToStorage()
    return true
  }

  function getTalentEffect(effectType: TalentEffectType): number {
    return calculateTalentEffect(activeTalentIds.value, effectType)
  }

  function updateProfileStats(characterId: string, statUpdates: Partial<CharacterStats>): boolean {
    const profile = profiles.value.find(p => p.id === characterId)
    if (!profile) return false

    Object.assign(profile.stats, statUpdates)
    profile.updatedAt = Date.now()
    saveProfilesToStorage()
    return true
  }

  function incrementPlayCount(characterId: string) {
    const profile = profiles.value.find(p => p.id === characterId)
    if (profile) {
      profile.playCount += 1
      profile.updatedAt = Date.now()
      saveProfilesToStorage()
    }
  }

  function recordCaseCompletion(characterId: string, caseId: string, sanityLost: number, evidenceCount: number) {
    const profile = profiles.value.find(p => p.id === characterId)
    if (profile) {
      if (!profile.completedCases.includes(caseId)) {
        profile.completedCases.push(caseId)
      }
      profile.totalSanityLost += sanityLost
      profile.totalEvidenceDiscovered += evidenceCount
      profile.updatedAt = Date.now()
      saveProfilesToStorage()
    }
  }

  function canUnlockTalent(profile: CharacterProfile, talentId: string): boolean {
    const talent = getTalentById(talentId)
    if (!talent) return false
    if (profile.talents.includes(talentId)) return false

    if (talent.prerequisites) {
      const hasPrereqs = talent.prerequisites.every(p => profile.talents.includes(p))
      if (!hasPrereqs) return false
    }

    if (talent.requiredStats) {
      for (const [stat, required] of Object.entries(talent.requiredStats)) {
        if (profile.stats[stat as keyof CharacterStats] < (required || 0)) {
          return false
        }
      }
    }

    return true
  }

  loadProfilesFromStorage()

  return {
    profiles,
    activeProfileId,
    activeProfile,
    activeTalentIds,
    activeTalents,
    loadProfilesFromStorage,
    getCharacterById,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    addTalentToProfile,
    removeTalentFromProfile,
    getTalentEffect,
    updateProfileStats,
    incrementPlayCount,
    recordCaseCompletion,
    canUnlockTalent
  }
})
