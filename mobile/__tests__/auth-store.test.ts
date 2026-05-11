import { useAuthStore } from '../stores/auth-store'

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

const mockUser = { id: '1', email: 'test@test.com', role: 'parent' as const }

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('starts unauthenticated', () => {
    const { isAuthenticated, user } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(user).toBeNull()
  })

  it('sets auth state on login', async () => {
    await useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token')
    const { isAuthenticated, user } = useAuthStore.getState()
    expect(isAuthenticated).toBe(true)
    expect(user?.email).toBe('test@test.com')
  })

  it('clears auth state on logout', async () => {
    await useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token')
    await useAuthStore.getState().logout()
    const { isAuthenticated, user } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(user).toBeNull()
  })
})
