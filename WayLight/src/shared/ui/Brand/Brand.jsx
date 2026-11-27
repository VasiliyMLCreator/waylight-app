import brandMark from '../../../assets/waylight-logo.png'

export function Brand({ label }) {
  return (
    <a className="brand" href="/" aria-label={`${label} — на главную`}>
      <img src={brandMark} alt="" className="brand-mark" />
      <span className="brand-name">{label.toLocaleUpperCase('ru-RU')}</span>
    </a>
  )
}
