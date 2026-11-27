import { useEffect, useState } from 'react'
import { authRequest } from '../../../shared/api/auth'
import './stories.css'

export function Moderation() {
  const [stories, setStories] = useState([])
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async () => { try { setStories(await authRequest('/moderation/stories')) } catch (error) { setStatus(error.message) } }
  useEffect(() => { load() }, [])
  const publish = async () => {
    setBusy(true); setStatus('')
    try { const result = await authRequest(`/moderation/stories/${selected.id}/publish`, { method: 'POST', body: { title:selected.title, body:selected.body, anonymized:checked } }); setStatus(result.status === 'published' ? 'История опубликована в индексе.' : result.status === 'index_failed' ? 'Индексация завершилась ошибкой. Можно повторить отправку.' : 'История передана в индекс. Ожидается завершение обработки.'); setSelected(null); setChecked(false); await load() } catch (error) { setStatus(error.message); await load() } finally { setBusy(false) }
  }
  const checkStatus = async (story) => { setBusy(true); try { const result = await authRequest(`/moderation/stories/${story.id}/index-status`); setStatus(result.status === 'published' ? 'Индексация завершена.' : result.status === 'index_failed' ? 'Ошибка индексации. Можно повторить отправку.' : 'Индексация продолжается.'); await load() } catch (error) { setStatus(error.message) } finally { setBusy(false) } }
  return <div className="moderation"><div className="moderation-head"><div><p>ОЧЕРЕДЬ / ИСТОРИИ</p><h2>На модерации</h2></div><button type="button" onClick={load}>Обновить ↻</button></div><p className="moderation-note">Проверьте текст, удалите имена, контакты и косвенно идентифицирующие детали перед публикацией.</p><div className="moderation-list">{stories.length === 0 && <p>Новых историй нет.</p>}{stories.map((story) => <div className="moderation-item" key={story.id}><div><strong>{story.title}</strong><small>{story.id} · {story.status === 'indexing' ? 'Индексация' : story.status === 'index_failed' ? 'Ошибка индекса' : 'Ожидает проверки'}</small></div>{story.status === 'indexing' ? <button type="button" disabled={busy} onClick={() => checkStatus(story)}>Проверить</button> : <button type="button" onClick={() => { setSelected(story); setChecked(false) }}>Проверить ↗</button>}</div>)}</div>{status && <p role="status">{status}</p>}{selected && <div className="review-overlay"><div className="review-dialog" role="dialog" aria-modal="true" aria-label="Проверка истории"><div className="moderation-head"><h2>Проверка истории</h2><button type="button" onClick={() => setSelected(null)}>Закрыть ×</button></div><label>Название<input value={selected.title} onChange={(event) => setSelected({ ...selected, title:event.target.value })} /></label><label>Текст<textarea value={selected.body} onChange={(event) => setSelected({ ...selected, body:event.target.value })} /></label><label className="story-consent"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />Я проверил обезличивание и содержание истории.</label><button className="review-publish" type="button" disabled={!checked || busy} onClick={publish}>Отправить в индекс ↗</button></div></div>}</div>
}
