import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { EpisodeData } from '..'
import { EpisodeCover } from './Cover'
import { useEpisode } from '../engines/Episode'
import { secondsToStr } from '../utils/utils'
import * as icons from '../Icons'

export default function EpisodeSummaryRow({ episode }: { episode: EpisodeData }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getDateString, inProgress, isPlaying, play, pause } = useEpisode(episode)
  return (
    <article
      className={`border-primary-8 hover:bg-primary-8 flex min-w-0 items-center gap-3 border-b p-2 transition-colors last:border-b-0 ${isPlaying ? 'episode-current' : ''}`}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => navigate('/episode-preview', { state: { episode } })}
      >
        <div className="h-12 w-12 shrink-0">
          <EpisodeCover episode={episode} className="rounded-md" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm leading-snug font-semibold" title={episode.title}>
            {episode.title}
          </h2>
          <p className="text-primary-3 mt-1 truncate text-xs">
            {episode.podcast?.podcastName && `${episode.podcast.podcastName} · `}
            {getDateString()} · {secondsToStr(episode.duration)}
          </p>
        </div>
      </button>
      <button
        className="border-primary-6 hover:bg-primary-7 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
        aria-label={`${t(inProgress(true) ? 'pause_episode' : 'play_episode')} : ${episode.title}`}
        onClick={() => (inProgress(true) ? pause() : play())}
      >
        <span className="w-4">{inProgress(true) ? icons.pause : icons.play}</span>
      </button>
    </article>
  )
}
