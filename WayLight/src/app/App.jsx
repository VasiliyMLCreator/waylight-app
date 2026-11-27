import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AppProviders } from './providers/AppProviders'
import { AppErrorBoundary } from './ui/AppErrorBoundary'
import { PageLoader } from './ui/PageLoader'
import { authRequest } from '../shared/api/auth'
import { AmbientLines } from '../shared/ui/AmbientLines/AmbientLines'
import './styles/global.css'

const HomePage = lazy(() => import('../pages/home/ui/HomePage'))
const AccountPage = lazy(() => import('../pages/account/ui/AccountPage').then((module) => ({ default: module.AccountPage })))
let callbackRequest

export default function App() {
  const [user, setUser] = useState(null)
  const [route, setRoute] = useState(window.location.pathname)
  const [notice, setNotice] = useState('')
  const navigate = useCallback((next) => { window.history.pushState(null, '', next); setRoute(next) }, [])
  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code'), state = params.get('state')
    if (code && state) {
      window.history.replaceState(null, '', '/')
      callbackRequest ||= authRequest('/auth/yandex/callback', { method: 'POST', body: { code, state } })
      callbackRequest.then((profile) => { setUser(profile); navigate('/account') }).catch((err) => setNotice(err.message))
    } else if (params.has('error')) {
      window.history.replaceState(null, '', '/')
      setNotice('Вход через Яндекс ID отменён или не выполнен')
    } else {
      authRequest('/auth/me').then(setUser).catch(() => setUser(null))
    }
    return () => window.removeEventListener('popstate', onPopState)
  }, [navigate])
  const onAuthenticated = useCallback((profile) => { setUser(profile); navigate('/account') }, [navigate])
  const onSignOut = useCallback(() => { setUser(null); navigate('/') }, [navigate])
  return <AppErrorBoundary><AppProviders><AmbientLines /><Suspense fallback={<PageLoader />}>
    {route === '/account' && user ? <AccountPage user={user} onUser={setUser} onHome={() => navigate('/')} onSignOut={onSignOut} /> : <HomePage user={user} route={route} navigate={navigate} onAuthenticated={onAuthenticated} onAccount={() => navigate('/account')} />}
    {notice && <div role="alert" style={{position:'fixed',bottom:24,right:24,zIndex:100,background:'#222',color:'#fff',padding:16,borderRadius:12}}>{notice} <button type="button" onClick={() => setNotice('')}>×</button></div>}
  </Suspense></AppProviders></AppErrorBoundary>
}
