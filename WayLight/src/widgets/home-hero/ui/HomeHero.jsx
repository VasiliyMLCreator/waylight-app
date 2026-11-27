import { siteContent } from '../../../shared/config/site-content'
import { StoryComposerCard } from '../../story-composer-card/ui/StoryComposerCard'

export function HomeHero({ onCreateChat, mobileExperience }) {
  const { eyebrow, title } = siteContent.home

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-art" aria-hidden="true" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}><div className="hero-art-image" /><span>01 / HUMAN STORIES</span></div>
      <div className="hero-copy">
        <p className="eyebrow"><span></span>{eyebrow}</p>
        <h1 id="hero-title">{title[0]}<br /><em>{title[1]}</em></h1>
      </div>
      <div className="experience-grid" data-mobile-view={mobileExperience.view}>
        <StoryComposerCard onOpenExplorer={mobileExperience.showExplorer} onSubmit={onCreateChat} />
      </div>
    </section>
  )
}
