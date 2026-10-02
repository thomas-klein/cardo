/*Compact variation of EpisodeCard */

import React from 'react'
import { EpisodeData, NewEpisodeData } from '..'
import * as icons from '../Icons'
import { useNavigate } from 'react-router-dom'
import ProgressBar, { LiveProgressBar } from './ProgressBar'
import { useTranslation } from 'react-i18next'
import { Menu } from '@tauri-apps/api/menu'
import { useEpisode } from '../engines/Episode'
import { EpisodeCover } from './Cover'

function EpisodePreviewCard({ episode, wide = false }: { episode: EpisodeData | NewEpisodeData; wide?: boolean }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    reprState,
    inQueue,
    getDateString,
    togglePlayed,
    toggleQueue,
    position,
    isPlaying,
    play,
    toggleDownload,
    downloadState,
    inProgress,
    pause,
  } = useEpisode(episode)

  return (
    <div
      className={`flex cursor-pointer rounded-lg transition-colors ${wide ? 'border-primary-7 bg-primary-8/50 hover:bg-primary-8 min-w-0 items-start gap-3 border p-3' : 'w-24 shrink-0 flex-col'} ${isPlaying ? 'episode-current' : ''}`}
      onClick={() => navigate('/episode-preview', { state: { episode } })}
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
              text: t(downloadState === 'downloaded' ? 'remove_download' : 'download'),
              action: toggleDownload,
            },
          ],
        })

        menu.popup()
      }}
    >
      <div
        className={`bg-primary-8 relative flex aspect-square shrink-0 flex-col items-center justify-center overflow-hidden rounded-md ${wide ? 'w-20' : 'w-full'}`}
      >
        <EpisodeCover
          episode={episode}
          title={episode.podcast?.podcastName}
          className="aspect-square w-full object-cover"
          onClick={() => {
            navigate('/episode-preview', {
              state: {
                episode: episode,
              },
            })
          }}
        />
        {isPlaying ? (
          <LiveProgressBar total={episode.duration} showTime={false} className={{ div: 'h-2 shrink-0' }} />
        ) : (
          <ProgressBar
            position={position}
            total={episode.duration}
            showTime={false}
            className={{ div: 'h-2 shrink-0' }}
          />
        )}

        <button
          className="border-accent-8 bg-accent-7 absolute right-2 bottom-2 flex aspect-square w-7 items-center justify-center rounded-full border-2 p-[3px] pl-[4px] transition-all hover:p-px"
          onClick={(e) => {
            e.stopPropagation()
            inProgress(true) ? pause() : play()
          }}
        >
          <span className="w-5 text-white">{inProgress(true) ? icons.pause : icons.play}</span>
        </button>
      </div>
      <div className={`relative min-w-0 ${wide ? 'flex flex-1 flex-col gap-2' : ''}`}>
        <h1
          className={`${wide ? 'line-clamp-4 leading-snug font-semibold' : 'line-clamp-2 text-sm'}`}
          title={episode.title}
        >
          {episode.title}
        </h1>
        <div className="flex items-center gap-2">
          {(episode as NewEpisodeData).new && <span className="bg-accent-5 h-2 w-2 rounded-full" title={t('new')} />}
          <h2 className="text-primary-3 text-sm">{getDateString()}</h2>
        </div>
      </div>
    </div>
  )
}

export default React.memo(EpisodePreviewCard)
