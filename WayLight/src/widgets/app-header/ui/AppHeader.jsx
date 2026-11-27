import { siteContent } from '../../../shared/config/site-content'
import { Brand } from '../../../shared/ui/Brand/Brand'
import { useState } from 'react'

export function AppHeader({ onLogin, user, onStories, onHome, onChats, onCreate, route }) {
  const [failedAvatar, setFailedAvatar] = useState(null)
  const avatar = user?.avatar_url && failedAvatar !== user.avatar_url ? user.avatar_url : null
  return (
    <header className="topbar">
      <Brand label={siteContent.brand} />
      <nav className="header-navigation" aria-label="Навигация">{[
        { label: 'Главная', active: route === '/', action: onHome },
        { label: 'Чаты', active: route === '/chats', action: onChats },
        { label: 'Истории', active: route === '/stories', action: onStories },
        { label: 'Создать', active: route === '/create', action: onCreate },
      ].map((item) => <button key={item.label} className={item.active ? 'header-navigation-active' : undefined} type="button" onClick={item.action}>{item.label}</button>)}</nav>
      {user ? (
        <button className="profile-avatar-button" type="button" onClick={onLogin} aria-label="Открыть личный кабинет" title="Личный кабинет">
          {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatar)} /> : <span aria-hidden="true">{(user.name || 'П').slice(0, 1).toUpperCase()}</span>}
        </button>
      ) : <button className="login-button" type="button" onClick={onLogin}>Войти</button>}
    </header>
  )
}
