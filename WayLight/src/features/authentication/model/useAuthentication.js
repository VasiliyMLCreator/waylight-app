import { useCallback, useEffect, useReducer, useState } from 'react'
import { authenticationAction, authenticationView, initialAuthenticationState, authenticationReducer } from './authentication.reducer'
import { authRequest } from '../../../shared/api/auth'

export function useAuthentication(onAuthenticated) {
  const [state, dispatch] = useReducer(authenticationReducer, initialAuthenticationState)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const open = useCallback((view) => { setError(''); dispatch({ type: authenticationAction.open, payload: view }) }, [])
  const close = useCallback(() => { setError(''); dispatch({ type: authenticationAction.close }) }, [])
  const changeField = useCallback((form, field) => (event) => dispatch({ type: authenticationAction.fieldChanged, payload: { form, field, value: event.target.value } }), [])
  const submit = useCallback(async (event) => {
    event.preventDefault(); setError(''); setBusy(true)
    const signup = state.view === authenticationView.signUp
    const form = signup ? state.signUp : state.signIn
    try {
      if (signup && form.password.length < 8) throw new Error('Пароль должен содержать не менее 8 символов')
      const body = signup ? { name: form.name, email: form.email, password: form.password, role: form.role } : { email: form.email, password: form.password }
      const user = await authRequest(signup ? '/auth/register' : '/auth/login', { method: 'POST', body })
      close(); onAuthenticated(user)
    } catch (err) { setError(err.message || 'Не удалось связаться с сервисом') }
    finally { setBusy(false) }
  }, [state, close, onAuthenticated])
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') close() }
    if (state.view !== authenticationView.closed) window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, state.view])
  return { state, close, changeField, startVerification: submit, error, busy,
    openSignIn: () => open(authenticationView.signIn), openSignUp: () => open(authenticationView.signUp),
    signInIsReady: !busy && Boolean(state.signIn.email.trim() && state.signIn.password),
    signUpIsReady: !busy && Boolean(state.signUp.name.trim() && state.signUp.email.trim() && state.signUp.password && state.signUp.password === state.signUp.passwordConfirmation) }
}
