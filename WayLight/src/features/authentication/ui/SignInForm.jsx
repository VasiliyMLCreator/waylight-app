import { AuthField } from './AuthField'
import { AuthFormLayout } from './AuthFormLayout'
import { YandexSignIn } from './YandexSignIn'

export function SignInForm({ isReady, onChangeField, onSubmit, onSwitchToSignUp, values, error }) {
  return (
    <AuthFormLayout
      title="Вход"
      onSubmit={onSubmit}
      footer={
        <>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={!isReady}>Войти</button>
          <YandexSignIn />
          <p className="auth-switch">Нет аккаунта? <button type="button" onClick={onSwitchToSignUp}>Зарегистрироваться</button></p>
        </>
      }
    >
      <AuthField label="Почта" type="email" autoComplete="email" value={values.email} onChange={onChangeField('signIn', 'email')} />
      <AuthField label="Пароль" type="password" autoComplete="current-password" value={values.password} onChange={onChangeField('signIn', 'password')} />
    </AuthFormLayout>
  )
}
