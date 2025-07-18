export interface User {
  id: string
  email: string
  name?: string
}

export type AuthState = {
  user: User | null
  isLoading: boolean
  error: string | null
}

// Simple auth slice for now
export const authSlice = {
  initialState: {
    user: null,
    isLoading: false,
    error: null
  } as AuthState
}