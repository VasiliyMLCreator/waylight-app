import { useState } from 'react'
import { authRequest } from '../../../shared/api/auth'

export function YandexSignIn() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const start = async () => {
    setBusy(true); setError('')
    try {
      const result = await authRequest('/auth/yandex/start', { method: 'POST' })
      const url = new URL(result.url)
      if (url.origin !== 'https://oauth.yandex.ru') throw new Error('Не удалось открыть Яндекс ID')
      window.location.assign(url.href)
    } catch (err) { setError(err.message); setBusy(false) }
  }
  return <div className="yandex-auth">
    <div className="yandex-auth-divider"><span>или</span></div>
    <button className="yandex-auth-placeholder yandex-auth-button" type="button" onClick={start} disabled={busy}>
      <span className="yandex-auth-mark" aria-hidden="true">Я</span> Войти с Яндекс ID
    </button>
    {error && <p className="yandex-auth-status" role="alert">{error}</p>}
  </div>
}
