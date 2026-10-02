import React, { MouseEventHandler, useRef } from 'react'
import { EpisodeData } from '..'
import * as icons from '../Icons'
import { useNavigate } from 'react-router-dom'
import { stripAllHTML } from '../utils/stripAllHTML'
import { secondsToStr } from '../utils/utils'
import ProgressBar, { LiveProgressBar } from './ProgressBar'
import { useTranslation } from 'react-i18next'
import { Menu } from '@tauri-apps/api/menu'
import { useEpisode } from '../engines/Episode'
import { EpisodeCover } from './Cover'
import { useSettings } from '../engines/Settings'

function EpisodeCard({
  episode,
  className = '',
  onImageClick = undefined,
  onClick = undefined,
}: {
  episode: EpisodeData
  className?: string
  onImageClick?: MouseEventHandler<HTMLImageElement>
  onClick?: () => void
}) {
  const navigate = useNavigate()
  const contextMenuTarget = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const [
    {
      ui: { episodeTextAlignLeft },
    },
  ] = useSettings()

  const {
    reprState,
    inQueue,
    getDateString,
    togglePlayed,
    toggleQueue,
    position,
    inProgress,
    isPlaying,
    play,
    pause,
    toggleDownload,
    downloadState,
  } = useEpisode(episode)

  const secondaryTextClass = `text-xs ${reprState.complete ? 'text-primary-6/80' : 'text-primary-4'}`
  const progressClasses = {
    div: 'h-4',
    bar: 'h-1! rounded',
    innerBar: 'rounded',
    time: 'shrink-0 whitespace-nowrap text-xs',
  }

  const playbackButton = (
    <button
      className="border-primary-6 hover:text-accent-6 flex aspect-square w-7 shrink-0 items-center justify-center rounded-full border-2 p-1 hover:p-[2px]"
      onClick={(e) => {
        e.stopPropagation()
        inProgress(true) ? pause() : play()
      }}
    >
      <span className="w-5">{inProgress(true) ? icons.pause : icons.play}</span>
    </button>
  )

  return (
    <div
      ref={contextMenuTarget}
      className={`episode-row flex w-full ${reprState.complete ? 'text-primary-6' : ''} min-h-20 cursor-pointer justify-between gap-4 p-2 ${className} ${isPlaying ? 'episode-current' : ''}`}
      aria-current={isPlaying ? 'true' : undefined}
      onClick={() => {
        onClick && onClick()
        navigate('/episode-preview', {
          state: {
            episode: episode,
          },
        })
      }}
      onContextMenu={async () => {
        const menu = await Menu.new({
          items: [
            {
              text: t(reprState.complete ? 'mark_not_played' : 'mark_played'),
              action: togglePlayed,
            },
            {
              text: t(inQueue ? 'remove_queue' : 'add_queue'),
              action: toggleQueue,
            },
            {
              text: t(downloadState == 'downloaded' ? 'remove_download' : 'download'),
              action: toggleDownload,
            },
          ],
        })

        menu.popup()
      }}
    >
      <>
        <div className="bg-primary-8 flex aspect-square h-16 items-center justify-center rounded-md">
          <EpisodeCover
            className={`rounded-md ${onImageClick !== undefined ? 'cursor-pointer hover:p-0.5' : ''}`}
            onClick={onImageClick}
            episode={episode}
            title={onImageClick !== undefined ? t('open_podcast') + ' ' + episode.podcast?.podcastName : ''}
          />
        </div>

        <div
          className={`min-w-0 flex-1 ${episodeTextAlignLeft ? 'grid grid-cols-[minmax(0,1fr)_auto] content-start gap-x-2 text-left' : 'flex flex-col items-end justify-between text-right'}`}
        >
          <p className={`${secondaryTextClass} ${episodeTextAlignLeft ? 'col-start-1' : ''}`}>
            {getDateString()} - {episode.size} MB{' '}
          </p>
          <h2
            className={`min-w-0 text-base leading-snug font-semibold break-words ${isPlaying ? 'text-primary-1' : ''} ${episodeTextAlignLeft ? 'col-start-1 row-start-2 self-center' : 'mb-2'}`}
            title={stripAllHTML(episode.description)}
          >
            {episode.title}
          </h2>
          <div
            className={`flex w-full items-center gap-2 ${episodeTextAlignLeft ? 'col-start-1 row-start-3 justify-start' : 'justify-end'}`}
          >
            {inProgress() ? (
              <div className={`max-w-sm min-w-0 flex-1 ${secondaryTextClass}`}>
                {isPlaying ? (
                  <LiveProgressBar total={reprState.total} className={progressClasses} />
                ) : (
                  <ProgressBar position={position} total={reprState.total} className={progressClasses} />
                )}
              </div>
            ) : (
              <span className={secondaryTextClass}>{secondsToStr(reprState.total)}</span>
            )}
            {!episodeTextAlignLeft && playbackButton}
          </div>
          {episodeTextAlignLeft && <div className="col-start-2 row-start-2 self-center">{playbackButton}</div>}
        </div>
      </>
    </div>
  )
}

export default React.memo(EpisodeCard)
