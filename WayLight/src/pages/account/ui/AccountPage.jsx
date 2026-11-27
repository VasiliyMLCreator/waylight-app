import { useState } from 'react'
import { Brand } from '../../../shared/ui/Brand/Brand'
import { siteContent } from '../../../shared/config/site-content'
import { authRequest } from '../../../shared/api/auth'
import { Moderation } from '../../../features/stories/ui/Moderation'
import './account.css'
import './monochrome-account.css'

const fields = [ ['first_name', 'Имя', 'text'], ['last_name', 'Фамилия', 'text'], ['birthday', 'Дата рождения', 'date'], ['phone', 'Телефон', 'tel'], ['gender', 'Пол', 'text'] ]
export function AccountPage({ user, onUser, onHome, onSignOut }) {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(([key]) => [key, user[key] || (key === 'first_name' ? user.name : '') || ''])))
  const [status, setStatus] = useState('')
  const [showModeration, setShowModeration] = useState(false)
  const [busy, setBusy] = useState(false)
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setStatus('')
    try { const updated = await authRequest('/profile', { method: 'PATCH', body: { ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value || null])), name: form.first_name } }); onUser(updated); setStatus('Изменения сохранены') }
    catch (error) { setStatus(error.message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!window.confirm('Удалить аккаунт и все данные профиля? Это действие нельзя отменить.')) return
    setBusy(true); setStatus('')
    try { await authRequest('/account', { method: 'DELETE' }); onSignOut() } catch (error) { setStatus(error.message); setBusy(false) }
  }
  const logout = async () => { setBusy(true); setStatus(''); try { await authRequest('/auth/logout', { method: 'POST' }); onSignOut() } catch (error) { setStatus(error.message); setBusy(false) } }
  return <main className="account-page">
    <header className="account-top"><Brand label={siteContent.brand} /><div className="account-top-actions">{user.role === 'specialist' && <button type="button" className="account-back" onClick={() => setShowModeration(!showModeration)}>{showModeration ? 'Профиль' : 'Модерация'}</button>}<button type="button" className="account-back" onClick={onHome}>На главную</button></div></header>
    {showModeration ? <Moderation /> : <section className="account-card" aria-labelledby="account-title">
      <div className="account-overview">
        <p className="account-kicker">ВАШЕ ПРОСТРАНСТВО / 01</p>
        <h1 id="account-title">Личный<br />кабинет<span>.</span></h1>
        <p className="account-caption">Пространство, в котором всё начинается с вас.</p>
        <div className="account-identity">{user.avatar_url ? <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{(user.first_name || user.name || 'П').slice(0, 1).toUpperCase()}</span>}<div><strong>{user.first_name || user.name || 'Пользователь'}</strong><p>{user.email || 'Почта не указана'}</p>{user.login && <p>@{user.login}</p>}</div></div>
        <div className="account-actions"><button type="button" onClick={logout} disabled={busy}>Выйти</button><button type="button" className="account-delete" onClick={remove} disabled={busy}>Удалить аккаунт</button></div>
      </div>
      <div className="account-details">
        <div className="account-details-heading"><div><p className="account-kicker">ПРОФИЛЬ</p><h2>Личные данные</h2></div><span aria-hidden="true">↗</span></div>
        <p className="account-details-caption">Дополнительные поля можно оставить пустыми.</p>
        <form onSubmit={save} className="account-form">{fields.map(([key, label, type]) => <label key={key}><span>{label}</span>{key === 'gender' ? <select value={['male', 'female'].includes(form[key]) ? form[key] : ''} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Не указан</option><option value="male">Мужской</option><option value="female">Женский</option></select> : <input type={type} value={form[key]} maxLength={key === 'phone' ? 30 : 100} required={key === 'first_name'} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />}</label>)}<button className="account-save" disabled={busy} type="submit">Сохранить изменения <span aria-hidden="true">↗</span></button></form>
        {status && <p className="account-status" role="status">{status}</p>}
      </div>
    </section>}
  </main>
}
