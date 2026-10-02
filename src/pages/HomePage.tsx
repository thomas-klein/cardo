import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EpisodePreviewCard from '../components/EpisodePreviewCard'
import EpisodeSummaryRow from '../components/EpisodeSummaryRow'
import { useTranslation } from 'react-i18next'
import EpisodeOverview from '../components/EpisodeOverview'
import appIcon from '../../src-tauri/icons/icon.png'
import { useDownloads, useQueue, useSubscriptions } from '../ContextProviders'
import { useUnstartedEpisodes } from '../engines/UnstartedEpisodes'

function HomePage() {
  const queue = useQueue()
  const { subscriptions } = useSubscriptions()
  const { downloads } = useDownloads()
  const { episodes, loading, error } = useUnstartedEpisodes()
  const { t } = useTranslation()
  const getLimit = () => Math.max(2, Math.min(6, Math.floor((window.innerHeight - 360) / 110)))
  const [limit, setLimit] = useState(getLimit)
  useEffect(() => {
    const resize = () => setLimit(getLimit())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const recentDownloads = [...downloads].reverse().slice(0, Math.min(3, limit))
  const hasSubscriptions = subscriptions.length > 0
  const listClass = 'grid min-w-0 content-start'
  const linkClass =
    'text-primary-2 hover:text-primary-1 mt-3 flex w-fit items-center text-sm underline decoration-accent-5 underline-offset-4 ml-auto'

  return (
    <div className="flex h-fit w-full min-w-0 flex-col gap-6 p-4">
      {queue.queue.length > 0 && (
        <section>
          <h1 className="mb-3 text-lg font-semibold uppercase">{t('queue')}</h1>
          <EpisodeOverview>
            {queue.queue.map((episode) => (
              <EpisodePreviewCard key={episode.src} episode={episode} />
            ))}
          </EpisodeOverview>
        </section>
      )}
      {hasSubscriptions && (
        <section>
          <h1 className="mb-3 text-lg font-semibold uppercase">{t('news')}</h1>
          {episodes.length > 0 ? (
            <div className={listClass}>
              {episodes.slice(0, limit).map((episode) => (
                <EpisodeSummaryRow key={episode.src} episode={episode} />
              ))}
            </div>
          ) : (
            <p className="text-primary-3 py-3 text-sm">
              {t(loading ? 'loading_episodes' : error ? 'episodes_load_error' : 'news_empty')}
            </p>
          )}
          <Link to="/news" className={linkClass}>
            {t('view_all')}
          </Link>
        </section>
      )}
      {recentDownloads.length > 0 && (
        <section>
          <h1 className="mb-3 text-lg font-semibold uppercase">{t('downloads')}</h1>
          <div className={listClass}>
            {recentDownloads.map((episode) => (
              <EpisodeSummaryRow
                key={episode.src}
                episode={{
                  ...episode,
                  podcast: subscriptions.find((podcast) => podcast.feedUrl === episode.podcastUrl) ?? episode.podcast,
                }}
              />
            ))}
          </div>
          <Link to="/downloads" className={linkClass}>
            {t('view_all')}
          </Link>
        </section>
      )}
      {!hasSubscriptions && queue.queue.length === 0 && downloads.length === 0 && (
        <div className="flex flex-col items-center gap-4 p-2 px-4">
          <img className="w-36" alt="" src={appIcon} />
          <h1 className="text-primary-3 text-center text-lg">{t('welcome_message')}</h1>
        </div>
      )}
    </div>
  )
}
export default HomePage
