export async function authRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api${path}`, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = typeof data.detail === 'string' ? data.detail : 'Проверьте введённые данные'
    throw new Error(message)
  }
  return response.status === 204 ? null : response.json()
}
