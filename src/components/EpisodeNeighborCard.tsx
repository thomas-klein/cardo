import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { EpisodeData } from '..'
import { EpisodeCover } from './Cover'
import { useEpisode } from '../engines/Episode'
import { secondsToStr } from '../utils/utils'
import * as icons from '../Icons'

export default function EpisodeNeighborCard({
  episode,
  direction,
}: {
  episode: EpisodeData
  direction: 'previous' | 'next'
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { getDateString, inProgress, play, pause, isPlaying } = useEpisode(episode)
  return (
    <article className={`episode-neighbor ${isPlaying ? 'episode-current' : ''}`}>
      <button className="episode-neighbor-open" onClick={() => navigate('/episode-preview', { state: { episode } })}>
        <div className="episode-neighbor-cover">
          <EpisodeCover episode={episode} className="rounded-md" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="episode-neighbor-direction">
            {t(direction === 'previous' ? 'previous_episode' : 'next_episode')}
          </p>
          <h2 className="episode-neighbor-title" title={episode.title}>
            {episode.title}
          </h2>
          <p className="episode-neighbor-meta">
            {getDateString()} · {secondsToStr(episode.duration)}
          </p>
        </div>
      </button>
      <button
        className="episode-neighbor-play"
        aria-label={`${t(inProgress(true) ? 'pause_episode' : 'play_episode')} : ${episode.title}`}
        onClick={() => (inProgress(true) ? pause() : play())}
      >
        <span className="w-4">{inProgress(true) ? icons.pause : icons.play}</span>
      </button>
    </article>
  )
}
