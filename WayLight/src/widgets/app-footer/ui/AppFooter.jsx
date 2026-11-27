import { siteContent } from '../../../shared/config/site-content'

export function AppFooter() {
  return (
    <footer className="footer" id="stories">
      <p><span className="footer-brand">{siteContent.brand.toLocaleUpperCase('ru-RU')}</span>{siteContent.home.footer.slice(siteContent.brand.length)}</p>
    </footer>
  )
}
