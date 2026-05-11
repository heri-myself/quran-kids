import { useProfileStore } from '../stores/profile-store'
import { Profile } from '../stores/profile-store'

const mockProfile: Profile = {
  id: 'p1',
  name: 'Ahmad',
  avatar: null,
  age: 7,
  role: 'child',
  parentId: 'u1',
  userId: 'u1',
}

describe('useProfileStore', () => {
  beforeEach(() => {
    useProfileStore.setState({ activeProfile: null })
  })

  it('starts with no active profile', () => {
    expect(useProfileStore.getState().activeProfile).toBeNull()
  })

  it('sets active profile', () => {
    useProfileStore.getState().setActiveProfile(mockProfile)
    expect(useProfileStore.getState().activeProfile?.name).toBe('Ahmad')
  })

  it('clears active profile', () => {
    useProfileStore.getState().setActiveProfile(mockProfile)
    useProfileStore.getState().clearActiveProfile()
    expect(useProfileStore.getState().activeProfile).toBeNull()
  })
})
