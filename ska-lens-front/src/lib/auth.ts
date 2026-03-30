const TOKEN_KEY = 'ska_lens_token'

export const authStore = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clearToken: (): void => localStorage.removeItem(TOKEN_KEY),
  isAuthenticated: (): boolean => Boolean(localStorage.getItem(TOKEN_KEY)),
}
