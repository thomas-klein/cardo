import { useTranslation } from 'react-i18next'
import { Checkbox } from '../components/Inputs'
import { useSettings } from '../engines/Settings'
import { useEffect, useState } from 'react'
import { TailwindBaseColor } from '..'
import { DefaultTheme, DefaultThemes, BasicColors } from '../DefaultThemes'
import appIcon from '../../src-tauri/icons/icon.png'
import { appConfigDir, join, resolveResource } from '@tauri-apps/api/path'
import { readDir } from '@tauri-apps/plugin-fs'
import tauriConfig from '../../src-tauri/tauri.conf.json'
import { useModalBanner } from '../components/ModalBanner'
import { SyncSettings } from '../components/sync/SyncSettings'
import { useOPML } from '../utils/opml'
import { heart as heartIcon } from '../Icons'
import { changeLanguage } from '../engines/translations'
import * as shell from '@tauri-apps/plugin-shell'
import colors from 'tailwindcss/colors'

function AccentColorSelector() {
  const [, updateSettings] = useSettings()
  const [showSelector, setShowSelector] = useState(false)

  return (
    <div className="relative">
      <button
        className="bg-accent-5 border-accent-7 h-10 w-16 rounded-md border-2"
        aria-expanded={showSelector}
        onClick={() => setShowSelector((show) => !show)}
      />

      {showSelector && (
        <div className="bg-primary-2 absolute bottom-0 left-0 z-10 grid min-w-max grid-cols-5 gap-1 rounded-md p-1">
          {BasicColors.map((color) => (
            <button
              className="h-10 w-16 rounded-md"
              style={{ backgroundColor: colors[color][500] }}
              title={color}
              key={color}
              onClick={(e) => {
                updateSettings({
                  colors: {
                    accent: color,
                  },
                })
                setShowSelector(false)
                e.preventDefault()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Settings() {
  const { t } = useTranslation()
  const [{ globals, general, colors: colorSettings, playback, ui }, updateSettings] = useSettings()
  const [languages, setLanguages] = useState<string[]>()
  const [showBanner, Banner] = useModalBanner()
  const [importOPML, exportOPML] = useOPML()

  useEffect(() => {
    const loadLocales = async () => {
      const translationsDir = await resolveResource(`_up_/resources/translations`)
      setLanguages((await readDir(translationsDir)).map((file) => file.name?.split('.')[0] ?? ''))
    }

    loadLocales()
  }, [])

  return (
    <div className="settings-page mx-auto flex h-fit w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <div className="settings-section flex flex-wrap items-center justify-between gap-3">
        <h2>{t('open_settings_file')}:</h2>
        <button className="filled-button text-sm" onClick={() => showBanner()}>
          config.json
        </button>

        <Banner
          labels={[t('ok'), t('cancel')]}
          onSubmit={async () => {
            const confFile = await join(await appConfigDir(), 'config.json')
            shell.open(confFile)
          }}
        >
          <h1 className="max-w-80 p-1 whitespace-pre-line">{t('open_settings_danger_menu')}</h1>
        </Banner>
      </div>

      <div className="settings-section flex flex-col gap-4">
        <h1 className="settings-section-title uppercase">{t('sync')}</h1>
        <SyncSettings />
      </div>

      <div className="settings-section flex flex-col gap-4">
        <h1 className="settings-section-title uppercase">{t('general')}</h1>

        <div className="flex flex-col gap-3">
          <label className="mb-1 flex items-center gap-2 uppercase">
            {t('language')}:
            <select
              className="bg-primary-8 rounded-md px-2 py-px text-center outline-none"
              onChange={({ target: { value } }) => {
                changeLanguage(value)
                updateSettings({
                  globals: {
                    language: value,
                  },
                })
              }}
              value={globals.language}
            >
              {languages?.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>

          <label className="flex max-w-full items-center gap-3">
            {t('check_updates')}:
            <Checkbox
              defaultChecked={general.checkUpdates}
              onChange={(value) => updateSettings({ general: { checkUpdates: value } })}
            />
          </label>

          <div className="settings-subgroup border-primary-7 mt-3 border-t pt-4">
            <h2 className="mb-3 font-semibold uppercase">{t('theme')}</h2>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <label className="flex items-center gap-2 uppercase">
                {t('base')}:
                <select
                  className="bg-primary-8 rounded-md px-2 py-px text-center outline-none"
                  onChange={({ target: { value } }) =>
                    updateSettings({
                      colors: {
                        primary: value as TailwindBaseColor | DefaultTheme,
                      },
                    })
                  }
                  defaultValue={
                    (colorSettings.primary as string) in DefaultThemes ||
                    BasicColors.includes(colorSettings.primary as TailwindBaseColor)
                      ? (colorSettings.primary as string)
                      : 'CUSTOM'
                  }
                >
                  <option value="dark">DARK</option>
                  <option value="light">LIGHT</option>
                  <option value="slate">SLATE</option>
                </select>
              </label>
              <label className="flex items-center gap-2 uppercase">
                {t('accent')}:
                <AccentColorSelector />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section flex flex-col gap-4">
        <h1 className="settings-section-title uppercase">{t('import/export')}</h1>
        <div className="flex flex-wrap gap-3">
          <button className="filled-button" onClick={importOPML}>
            {t('import_opml')}
          </button>
          <button className="filled-button" onClick={exportOPML}>
            {t('export_opml')}
          </button>
        </div>
      </div>

      <div className="settings-section flex flex-col gap-4">
        <h1 className="settings-section-title uppercase">{t('news')}</h1>

        <label className="flex max-w-full items-center gap-3">
          {t('fetch_subscriptions_startup')}:
          <Checkbox
            defaultChecked={general.fetchSubscriptionsAtStartup}
            onChange={(value) => updateSettings({ general: { fetchSubscriptionsAtStartup: value } })}
          />
        </label>

        <label className="flex w-full items-center gap-2">
          {t('number_days_news')}:
          <input
            type="text"
            className="bg-primary-8 w-14 rounded-md px-2 py-1 focus:outline-none"
            value={general.numberOfDaysInNews}
            onChange={(e) => {
              const value = Number(e.target.value)
              if (!Number.isNaN(value)) {
                updateSettings({ general: { numberOfDaysInNews: value } })
              }
            }}
          />
        </label>
      </div>

      <div className="settings-section flex flex-col gap-4">
        <h1 className="settings-section-title uppercase">{t('playback')}</h1>
        <div className="flex flex-wrap items-start gap-8">
          <div className="flex flex-col items-start gap-3">
            <label className="flex max-w-full flex-wrap items-center gap-3">
              {t('step_backwards')}:
              <input
                type="text"
                className="bg-primary-8 w-12 rounded-md px-2 py-1 focus:outline-none"
                value={playback.stepBackwards}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  if (!Number.isNaN(value)) {
                    updateSettings({ playback: { stepBackwards: value } })
                  }
                }}
              />
              <p className="-ml-1">s</p>
            </label>
            <label className="flex max-w-full flex-wrap items-center gap-3">
              {t('step_forward')}:
              <input
                type="text"
                className="bg-primary-8 w-12 rounded-md px-2 py-1 focus:outline-none"
                value={playback.stepForward}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  if (!Number.isNaN(value)) {
                    updateSettings({ playback: { stepForward: value } })
                  }
                }}
              />
              <p className="-ml-1">s</p>
            </label>
          </div>

          <div className="flex flex-col items-start gap-3">
            <label className="flex max-w-full items-center gap-3">
              {t('remove_from_queue_end')}:
              <Checkbox
                defaultChecked={playback.removeFromQueueAtEnd}
                onChange={(value) => updateSettings({ playback: { removeFromQueueAtEnd: value } })}
              />
            </label>
            <label className="flex max-w-full items-center gap-3">
              {t('remove_from_downloads_end')}:
              <Checkbox
                defaultChecked={playback.removeFromDownloadsAtEnd}
                onChange={(value) => updateSettings({ playback: { removeFromDownloadsAtEnd: value } })}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="settings-section flex flex-col gap-4">
        <h1 className="settings-section-title uppercase">UI</h1>
        <label className="flex max-w-full flex-wrap items-center gap-3">
          {t('align_episode_title_left')}:
          <span className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={ui.episodeTextAlignLeft}
              onChange={(e) => updateSettings({ ui: { episodeTextAlignLeft: e.target.checked } })}
            />
            <span className="bg-primary-8 peer-checked:bg-accent-6 peer-focus-visible:outline-accent-5 h-6 w-11 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2" />
            <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
        <div>
          <label className="flex max-w-full items-center gap-3">
            {t('show_pinWindow_button')}:
            <Checkbox
              defaultChecked={ui.showPinWindowButton}
              onChange={(value) => updateSettings({ ui: { showPinWindowButton: value } })}
            />
          </label>
        </div>
      </div>

      <div className="settings-section flex flex-col gap-4">
        <h1 className="settings-section-title uppercase">{t('about')}</h1>
        <div className="flex flex-wrap gap-3">
          <img
            alt=""
            className="w-28 cursor-pointer transition-all hover:scale-110"
            title={t('open_web')}
            src={appIcon}
            onClick={() => shell.open('https://cardo-podcast.github.io')}
          />
          <div className="flex flex-col gap-2">
            <h1>
              Cardo - {t('podcast_player')} ( v{tauriConfig.version} )
            </h1>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <h1>
                  {t('author')}:{' '}
                  <a href="https://n0vella.github.io" target="_blank" rel="noreferrer">
                    <span className="text-accent-5">n0vella</span>
                  </a>
                </h1>
                <div className="flex h-fit items-center gap-1">
                  <p>{t('source_code')}: </p>
                  <img
                    className="w-5 cursor-pointer rounded-full bg-white p-px transition-transform hover:scale-110"
                    src="https://github.githubassets.com/favicons/favicon.png"
                    alt="Github"
                    title="https://github.com/cardo-podcast/cardo"
                    onClick={() => shell.open('https://github.com/cardo-podcast/cardo')}
                  />
                </div>
              </div>
              <div className="flex h-12 items-center gap-2">
                <a href="https://www.buymeacoffee.com/n0vella" target="_blank" rel="noreferrer">
                  <img
                    src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                    alt="Buy Me A Coffee"
                    className="animate-brightness h-12 transition-transform hover:scale-105"
                  />
                </a>
                <a
                  href="https://github.com/sponsors/cardo-podcast"
                  target="_blank"
                  rel="noreferrer"
                  className="animate-brightness bg-primary-1 flex h-12 items-center gap-1 rounded-md p-1 px-2 transition-transform hover:scale-105"
                >
                  <span className="block aspect-square h-12 text-[#bf3989]">{heartIcon}</span>
                  <span className="text-lg">Sponsor</span>
                </a>
                <a href="https://www.paypal.com/paypalme/n0velladev" target="_blank" rel="noreferrer">
                  <img
                    src="https://www.paypalobjects.com/webstatic/icon/pp196.png"
                    alt="Paypal"
                    className="h-12 rounded-md transition-transform hover:scale-105"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
