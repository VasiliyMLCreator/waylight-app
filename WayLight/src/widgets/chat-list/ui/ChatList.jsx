import './chat-list.css'

export function ChatList({ chats, user, onOpen, onCreate, onLogin }) {
  return <section className="chat-list-page" aria-labelledby="chat-list-title">
    <div className="chat-list-intro">
      <p className="eyebrow"><span />ВАШЕ ПРОСТРАНСТВО</p>
      <h1 id="chat-list-title">ВАШИ<br /><em>ДИАЛОГИ</em></h1>
      <p>Истории и мысли, к которым можно вернуться.</p>
      <button className="chat-list-create" type="button" onClick={onCreate}>Новый разговор <span aria-hidden="true">↗</span></button>
    </div>
    <div className="chat-list-panel">
      <div className="chat-list-panel-heading"><div><p>ВАЙЛАЙТ / ЧАТЫ</p><h2>Все разговоры</h2></div><span>{String(chats.length).padStart(2, '0')}</span></div>
      {!user ? <div className="chat-list-empty"><p>Войдите, чтобы увидеть свои разговоры.</p><button type="button" onClick={onLogin}>Войти</button></div> : chats.length === 0 ? <div className="chat-list-empty"><p>Пока здесь нет разговоров.<br />Начните с вашей истории.</p><button type="button" onClick={onCreate}>Начать разговор ↗</button></div> : <div className="chat-list-items">{chats.map((chat) => <button className="chat-list-item" type="button" key={chat.id} onClick={() => onOpen(chat.id)}><span><strong>{chat.title}</strong><small>{chat.messages.length ? chat.messages[chat.messages.length - 1].text : 'Новый разговор'}</small></span><span aria-hidden="true">↗</span></button>)}</div>}
    </div>
  </section>
}
