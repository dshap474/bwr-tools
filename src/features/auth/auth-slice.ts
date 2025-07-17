// Example auth slice structure (Redux Toolkit style)
// This is a placeholder for future authentication features

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  error: string | null
}

export interface User {
  id: string
  email: string
  name: string
}

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
}

// Auth actions (example structure)
export type AuthAction =
  | { type: 'AUTH_LOGIN_START' }
  | { type: 'AUTH_LOGIN_SUCCESS'; payload: User }
  | { type: 'AUTH_LOGIN_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }

export function authReducer(state: AuthState = initialAuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOGIN_START':
      return { ...state, loading: true, error: null }
    case 'AUTH_LOGIN_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        isAuthenticated: true, 
        user: action.payload,
        error: null 
      }
    case 'AUTH_LOGIN_FAILURE':
      return { 
        ...state, 
        loading: false, 
        isAuthenticated: false, 
        user: null,
        error: action.payload 
      }
    case 'AUTH_LOGOUT':
      return initialAuthState
    default:
      return state
  }
}