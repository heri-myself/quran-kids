import Cookies from 'js-cookie'

const TOKEN_KEY = 'qk_admin_token'

export function setToken(token: string, remember = false) {
  Cookies.set(TOKEN_KEY, token, {
    expires: remember ? 30 : undefined, // 30 hari jika remember, session cookie jika tidak
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function clearToken() {
  Cookies.remove(TOKEN_KEY)
}
