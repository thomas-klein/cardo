import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu } from '@tauri-apps/api/menu'
import { PodcastData } from '..'
import { sync } from '../Icons'
import { useSubscriptions, useSubscriptionsEpisodes } from '../ContextProviders'
import { PodcastCover } from './Cover'

export default function SubscriptionCard({ podcast, mini = false }: { podcast: PodcastData; mini?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const selected = location.pathname === '/preview' && location.state?.podcast?.feedUrl === podcast.feedUrl
  const { t } = useTranslation()
  const subscriptions = useSubscriptions()
  const { fetchingFeeds } = useSubscriptionsEpisodes()

  return (
    <div
      className={`flex items-center gap-3 rounded-md p-1 ${mini ? 'justify-center' : ''} hover:bg-primary-8 cursor-pointer transition-colors ${selected ? 'bg-primary-8 shadow-[inset_3px_0_0_var(--color-accent-5)]' : ''}`}
      title={podcast.podcastName}
      aria-current={selected ? 'page' : undefined}
      onClick={() =>
        navigate('/preview', {
          state: {
            podcast,
          },
        })
      }
      onContextMenu={async () => {
        const menu = await Menu.new({
          items: [
            {
              text: t('remove_from_subscriptions'),
              action: async () => {
                await subscriptions.remove(podcast.feedUrl)
              },
            },
          ],
        })
        menu.popup()
      }}
    >
      <div className="relative aspect-square h-10 shrink-0">
        <PodcastCover
          className={`aspect-square h-10 rounded-md ${mini ? 'hover:scale-95' : ''}`}
          title={podcast.podcastName}
          podcast={podcast}
        />
        {fetchingFeeds.includes(podcast.id!) && (
          <div className="bg-opacity-20 absolute top-1/2 left-1/2 z-10 flex w-10 -translate-x-1/2 -translate-y-1/2 bg-black">
            <span className="w-10 animate-[spin_1.5s_linear_reverse_infinite] stroke-2">{sync}</span>
          </div>
        )}
      </div>
      {!mini && <p className="min-w-0 flex-1 truncate text-sm font-medium">{podcast.podcastName}</p>}
    </div>
  )
}
