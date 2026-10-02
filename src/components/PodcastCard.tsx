import { PodcastData } from '..'
import { useNavigate } from 'react-router-dom'
import { PodcastCover } from './Cover'

function PodcastCard({ podcast }: { podcast: PodcastData }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="hover:bg-primary-8 flex w-full items-center gap-4 rounded-lg p-3 text-left transition-colors"
      onClick={() => {
        navigate('/preview', {
          state: {
            podcast: podcast,
          },
        })
      }}
    >
      <PodcastCover className="bg-primary-7 h-16 w-16 shrink-0 rounded-lg" podcast={podcast} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-base leading-snug font-semibold">{podcast.podcastName}</p>
        <p className="text-primary-4 truncate text-sm">{podcast.artistName}</p>
      </div>
    </button>
  )
}

export default PodcastCard
