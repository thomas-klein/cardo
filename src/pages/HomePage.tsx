import EpisodePreviewCard from '../components/EpisodePreviewCard'
import { useTranslation } from 'react-i18next'
import EpisodeOverview from '../components/EpisodeOverview'
import appIcon from '../../src-tauri/icons/icon.png'
import { useQueue, useSubscriptions } from '../ContextProviders'

function HomePage() {
  const queue = useQueue()
  const { latestEpisodes } = useSubscriptions()
  const { t } = useTranslation()

  return (
    <div className="flex h-fit w-full min-w-0 flex-col gap-8 p-4">
      {queue.queue.length > 0 && (
        <div>
          <h1 className="mb-3 text-lg font-semibold uppercase">{t('queue')}</h1>
          <EpisodeOverview>
            {queue.queue.map((episode) => (
              <EpisodePreviewCard key={episode.id} episode={episode} />
            ))}
          </EpisodeOverview>
        </div>
      )}

      {latestEpisodes.length > 0 && (
        <div>
          <h1 className="mb-3 text-lg font-semibold uppercase">{t('news')}</h1>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}
          >
            {latestEpisodes.map((episode) => (
              <EpisodePreviewCard key={episode.id} episode={episode} wide />
            ))}
          </div>
        </div>
      )}

      {
        // welcome message
        queue.queue.length === 0 && latestEpisodes.length === 0 && (
          <div className="flex flex-col items-center gap-4 p-2 px-4">
            <img className="w-36" alt="" src={appIcon} />
            <h1 className="text-primary-3 text-center text-lg">{t('welcome_message')}</h1>
          </div>
        )
      }
    </div>
  )
}

export default HomePage
