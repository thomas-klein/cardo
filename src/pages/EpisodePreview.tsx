import { useEffect, useRef, useState } from 'react'
import * as icons from '../Icons'
import { EpisodeData } from '..'
import { useLocation, useNavigate } from 'react-router-dom'
import { parseXML, secondsToStr } from '../utils/utils'
import { useTranslation } from 'react-i18next'
import ProgressBar, { LiveProgressBar } from '../components/ProgressBar'
import { useEpisode } from '../engines/Episode'
import { sanitizeHTML } from '../utils/sanitize'
import { Menu } from '@tauri-apps/api/menu'
import { toast } from 'react-toastify'
import { useSubscriptions, useSubscriptionsEpisodes } from '../ContextProviders'
import { EpisodeCover } from '../components/Cover'
import EpisodeNeighborCard from '../components/EpisodeNeighborCard'
import { getAdjacentEpisodes } from '../utils/adjacentEpisodes'

function EpisodePreview() {
  const location = useLocation()
  const episode = location.state.episode as EpisodeData
  const navigate = useNavigate()
  const subscriptions = useSubscriptions()
  const { t } = useTranslation()
  const subscriptionsEpisodes = useSubscriptionsEpisodes()
  const descriptionRef = useRef<HTMLDivElement>(null)
  const [catalog, setCatalog] = useState<{ url: string; podcast?: EpisodeData['podcast']; episodes: EpisodeData[] }>({
    url: '',
    episodes: [],
  })
  const podcastData = catalog.url === episode.podcastUrl ? (catalog.podcast ?? episode.podcast) : episode.podcast
  const podcastFetched = podcastData?.artistName != null && !!podcastData.feedUrl
  const enrichedEpisode = { ...episode, podcast: podcastData }
  const adjacent = getAdjacentEpisodes(catalog.url === episode.podcastUrl ? catalog.episodes : [], episode)
  const {
    reprState,
    inQueue,
    getDateString,
    togglePlayed,
    toggleQueue,
    position,
    inProgress,
    isPlaying,
    toggleDownload,
    downloadState,
    play,
    pause,
  } = useEpisode(enrichedEpisode)

  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      const [podcastResult, episodesResult] = await Promise.allSettled([
        subscriptions.get(episode.podcastUrl),
        subscriptionsEpisodes.getAll({ podcastUrl: episode.podcastUrl }),
      ])
      let podcast = podcastResult.status === 'fulfilled' ? podcastResult.value : undefined
      let episodes = episodesResult.status === 'fulfilled' ? episodesResult.value : []
      if (!episodes.length || !podcast) {
        try {
          const [feedEpisodes, feedPodcast] = await parseXML(episode.podcastUrl)
          // Keep older cached episodes that may no longer be present in the feed.
          episodes = [...episodes, ...feedEpisodes]
          podcast = podcast ?? feedPodcast
        } catch (error) {
          console.warn('Could not load related podcast episodes', error)
        }
      }
      if (!cancelled) setCatalog({ url: episode.podcastUrl, podcast, episodes })
    }
    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [episode.podcastUrl, subscriptions.get, subscriptionsEpisodes.getAll])

  useEffect(() => {
    descriptionRef.current?.scrollTo({ top: 0 })
  }, [episode.src])

  function openPodcast() {
    if (podcastFetched) navigate('/preview', { state: { podcast: podcastData } })
  }

  async function showContextMenu() {
    const menu = await Menu.new({
      items: [
        {
          text: t('copy_episode_url'),
          action: () => {
            navigator.clipboard.writeText(episode.src)
            toast.info(t('episode_url_copied'), {
              position: 'top-center',
              autoClose: 3000,
              hideProgressBar: true,
              theme: 'dark',
            })
          },
        },
      ],
    })
    menu.popup()
  }

  return (
    <div className="episode-detail">
      <header className="episode-detail-header">
        <div
          className={`episode-detail-cover bg-primary-8 flex shrink-0 items-center justify-center rounded-lg ${podcastFetched ? 'cursor-pointer' : ''}`}
        >
          <EpisodeCover
            episode={enrichedEpisode}
            className="rounded-lg"
            title={podcastFetched ? t('open_podcast') + ' ' + podcastData?.podcastName : ''}
            onClick={openPodcast}
            onContextMenu={showContextMenu}
          />
        </div>
        <div className="episode-detail-heading min-w-0 flex-1">
          {podcastData?.podcastName && (
            <button className="episode-detail-podcast" disabled={!podcastFetched} onClick={openPodcast}>
              {podcastData.podcastName}
            </button>
          )}
          <h1 className="episode-detail-title" title={episode.title}>
            {episode.title}
          </h1>
          <p className="episode-detail-meta">
            {getDateString()} · {episode.size} MB · {secondsToStr(episode.duration)}
          </p>
          <div className="episode-detail-controls">
            <button className="filled-button episode-detail-play" onClick={() => (inProgress(true) ? pause() : play())}>
              <span className="w-5">{inProgress(true) ? icons.pause : icons.play}</span>
              <span>{t(inProgress(true) ? 'pause_episode' : 'play_episode')}</span>
            </button>
            <button
              className={`episode-detail-action ${reprState.complete ? 'bg-primary-7 text-primary-1' : ''}`}
              title={t(reprState.complete ? 'mark_not_played' : 'mark_played')}
              aria-pressed={reprState.complete}
              onClick={togglePlayed}
            >
              {icons.check}
            </button>
            <button
              className={`episode-detail-action ${inQueue ? 'bg-primary-7 text-primary-1' : ''}`}
              title={t(inQueue ? 'remove_queue' : 'add_queue')}
              aria-pressed={inQueue}
              onClick={toggleQueue}
            >
              {icons.queue}
            </button>
            <button
              className={`episode-detail-action ${downloadState === 'downloaded' ? 'bg-primary-7 text-primary-1' : ''}`}
              title={t(downloadState === 'downloaded' ? 'remove_download' : 'download')}
              aria-pressed={downloadState === 'downloaded'}
              onClick={toggleDownload}
            >
              {icons.download}
            </button>
          </div>
          {inProgress() && (
            <div className="episode-detail-progress">
              {isPlaying ? (
                <LiveProgressBar
                  total={reprState.total}
                  className={{
                    div: 'h-4 text-xs',
                    bar: 'h-1! rounded',
                    innerBar: 'rounded',
                    time: 'shrink-0 whitespace-nowrap',
                  }}
                />
              ) : (
                <ProgressBar
                  position={position}
                  total={reprState.total}
                  className={{
                    div: 'h-4 text-xs',
                    bar: 'h-1! rounded',
                    innerBar: 'rounded',
                    time: 'shrink-0 whitespace-nowrap',
                  }}
                />
              )}
            </div>
          )}
        </div>
      </header>
      <section className="episode-detail-description-panel" aria-labelledby="episode-description-title">
        <h2 id="episode-description-title" className="episode-detail-section-title">
          {t('episode_description')}
        </h2>
        <div
          ref={descriptionRef}
          className="episode-detail-description"
          tabIndex={0}
          aria-labelledby="episode-description-title"
        >
          {episode.description ? (
            <div
              className="episode-detail-prose"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(episode.description) }}
            />
          ) : (
            <p className="text-primary-3">{t('no_episode_description')}</p>
          )}
        </div>
      </section>
      {(adjacent.previous || adjacent.next) && (
        <nav className="episode-detail-neighbors" aria-label={t('episode_navigation')}>
          {adjacent.previous && (
            <EpisodeNeighborCard direction="previous" episode={{ ...adjacent.previous, podcast: podcastData }} />
          )}
          {adjacent.next && (
            <div className="episode-detail-next">
              <EpisodeNeighborCard direction="next" episode={{ ...adjacent.next, podcast: podcastData }} />
            </div>
          )}
        </nav>
      )}
    </div>
  )
}

export default EpisodePreview
