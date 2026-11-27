import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { authRequest } from '../../../shared/api/auth'
import './stories.css'

const template = '## О чем моя история\nКоротко опишите ситуацию и обстоятельства, которыми вы готовы поделиться.\n\n## Что оказалось трудным\nЧто происходило и как это влияло на вашу повседневную жизнь? Не обязательно описывать подробности.\n\n## Что помогало или не помогало\nРасскажите только о собственном опыте: что вы пробовали, какую поддержку получали и как это воспринимали.\n\n## Что изменилось со временем\nЧто произошло дальше? История может продолжаться, завершённый результат не обязателен.\n\n## Что мне хотелось бы сказать другим\nКакая мысль или вопрос важны для вас сейчас? Без универсальных советов и обещаний.'

export function StoryEditor({ user, onBack, onLogin }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [consent, setConsent] = useState(false)
  const [preview, setPreview] = useState(false)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const chatRef = useRef(null)
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [messages, busy])
  const insert = (before, after = '') => {
    const element = ref.current
    if (!element) return
    const start = element.selectionStart, end = element.selectionEnd
    setBody((current) => current.slice(0, start) + before + current.slice(start, end) + after + current.slice(end))
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + before.length, end + before.length) })
  }
  const assist = async (event) => {
    event.preventDefault()
    const content = question.trim()
    if (!content || busy || !user) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next); setQuestion(''); setBusy(true); setStatus('')
    try { const result = await authRequest('/stories/assist', { method: 'POST', body: { text: body, messages: next.slice(-20) } }); setMessages((current) => [...current, { role: 'assistant', content: result.text }]) } catch (error) { setStatus(error.message) } finally { setBusy(false) }
  }
  const submit = async (event) => {
    event.preventDefault()
    if (!user) { onLogin(); return }
    setBusy(true); setStatus('')
    try { await authRequest('/stories', { method: 'POST', body: { title, body, consent } }); setStatus('История отправлена на модерацию.'); setTitle(''); setBody(''); setConsent(false) } catch (error) { setStatus(error.message) } finally { setBusy(false) }
  }
  return <section className="story-editor-page" aria-labelledby="story-editor-title">
    <div className="story-editor-heading"><div><p>ВАШ ГОЛОС / ИСТОРИИ</p><h1 id="story-editor-title">Создать историю</h1></div><button type="button" onClick={onBack}>Закрыть ↗</button></div>
    <div className="story-editor-layout"><form className="story-editor-main" onSubmit={submit}>
      <label className="story-title-label"><span>НАЗВАНИЕ</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Назовите вашу историю" maxLength={120} required /></label>
      <div className="story-toolbar" aria-label="Форматирование"><button type="button" onClick={() => insert('## ')}>Заголовок</button><button type="button" onClick={() => insert('**', '**')}><strong>Ж</strong></button><button type="button" onClick={() => insert('*', '*')}><em>К</em></button><button type="button" onClick={() => insert('- ')}>Список</button><button type="button" onClick={() => setPreview(!preview)}>{preview ? 'Редактировать' : 'Просмотр'}</button></div>
      {preview ? <div className="story-preview message-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{body || 'Пока нет текста.'}</ReactMarkdown></div> : <textarea ref={ref} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Начните с того, чем вам хочется поделиться..." aria-label="Текст истории" />}
      <label className="story-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />Я согласен отправить историю на модерацию и её дальнейшую публикацию после проверки.</label>
      <div className="story-editor-actions"><span role="status">{status}{!user && <button type="button" className="story-signin" onClick={onLogin}>Войти для отправки</button>}</span><button type="submit" disabled={busy || !title.trim() || body.trim().length < 30 || !consent}>Отправить на модерацию ↗</button></div>
    </form><aside className="story-editor-assistant"><div className="story-chat-head"><div><p className="story-assistant-kicker">ЛУЧИК / ПОМОЩНИК</p><h2>Пишем вместе</h2></div><span>✦</span></div><p>Задайте вопрос о структуре или формулировках. Текст черновика и переписка отправляются в Яндекс AI Studio.</p><a className="story-template-source" href="https://www.samhsa.gov/resource/recovery/share-your-story-how-guide-digital-storytelling" target="_blank" rel="noopener noreferrer">О подходе к личным историям ↗</a><button className="story-template-button" type="button" onClick={() => { if (!body.trim() || window.confirm('Заменить текущий текст шаблоном?')) setBody(template) }}>Вставить шаблон ↗</button><div className="story-chat-messages" ref={chatRef} aria-live="polite">{messages.length === 0 && <div className="story-chat-welcome">Привет! Я помогу уточнить мысли и бережно оформить историю. С чего начнём?</div>}{messages.map((message, index) => <div className={`story-chat-message story-chat-message--${message.role}`} key={index}><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{message.content}</ReactMarkdown></div>)}{busy && <div className="story-chat-message">Готовлю ответ…</div>}</div><form className="story-chat-input" onSubmit={assist}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Спросите Лучика…" aria-label="Вопрос помощнику" /><button type="submit" disabled={!user || busy || !question.trim()} aria-label="Отправить вопрос">↑</button></form>{!user && <small>Войдите, чтобы общаться с помощником.</small>}</aside></div>
  </section>
}
