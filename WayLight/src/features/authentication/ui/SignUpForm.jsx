import { AuthField } from './AuthField'
import { AuthFormLayout } from './AuthFormLayout'
import { YandexSignIn } from './YandexSignIn'

export function SignUpForm({ isReady, onChangeField, onSubmit, onSwitchToSignIn, values, error }) {
  return (
    <AuthFormLayout
      title="Регистрация"
      onSubmit={onSubmit}
      footer={
        <>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={!isReady}>Зарегистрироваться</button>
          <YandexSignIn />
          <p className="auth-switch">Есть аккаунт? <button type="button" onClick={onSwitchToSignIn}>Войти</button></p>
        </>
      }
    >
      <label className="auth-field">Роль<select className="auth-role" value={values.role} onChange={onChangeField('signUp', 'role')}><option value="user">Пользователь</option><option value="specialist">Медицинский специалист</option></select></label>
      {values.role === 'specialist' && <p className="auth-role-note">Роль указывается самостоятельно и пока не подтверждается.</p>}
      <AuthField label="Имя" autoComplete="name" value={values.name} onChange={onChangeField('signUp', 'name')} />
      <AuthField label="Почта" type="email" autoComplete="email" value={values.email} onChange={onChangeField('signUp', 'email')} />
      <AuthField label="Пароль" type="password" autoComplete="new-password" value={values.password} onChange={onChangeField('signUp', 'password')} />
      <AuthField label="Повторите пароль" type="password" autoComplete="new-password" value={values.passwordConfirmation} onChange={onChangeField('signUp', 'passwordConfirmation')} />
    </AuthFormLayout>
  )
}
