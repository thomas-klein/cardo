import { useTranslation } from 'react-i18next'
import { useUnstartedEpisodes } from '../engines/UnstartedEpisodes'
import EpisodeCard from '../components/EpisodeCard'
import { useSubscriptions } from '../ContextProviders'
import { useNavigate } from 'react-router-dom'

export default function NewsPage() {
  const { t } = useTranslation()
  const { episodes, loading, error } = useUnstartedEpisodes()
  const { subscriptions } = useSubscriptions()
  const navigate = useNavigate()
  return (
    <div className="flex h-fit w-full min-w-0 flex-col p-2">
      <header className="border-primary-8 flex w-full flex-col border-b p-2">
        <h1 className="uppercase">{t('news')}</h1>
        <p className="text-sm">{t('news_unstarted_description')}</p>
      </header>
      {episodes.length > 0 ? (
        <div className="grid content-start">
          {episodes.map((episode) => {
            const podcast = subscriptions.find((podcast) => podcast.feedUrl === episode.podcastUrl)
            return (
              <EpisodeCard
                key={episode.src}
                episode={{ ...episode, podcast: podcast ?? episode.podcast }}
                className="border-primary-8 hover:bg-primary-8 border-b"
                onImageClick={
                  podcast
                    ? (event) => {
                        event.stopPropagation()
                        navigate('/preview', { state: { podcast } })
                      }
                    : undefined
                }
              />
            )
          })}
        </div>
      ) : (
        <p className="text-primary-3 p-4">
          {t(loading ? 'loading_episodes' : error ? 'episodes_load_error' : 'news_empty')}
        </p>
      )}
    </div>
  )
}
