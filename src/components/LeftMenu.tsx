import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sync, home, news, settings, queue, download } from '../Icons'
import SubscriptionCard from './SubscriptionCard'
import { useSettings } from '../engines/Settings'
import { useModalBanner } from './ModalBanner'
import { parsePodcastDetails, toastError } from '../utils/utils'
import { useEffect, useRef, useState } from 'react'
import { useSubscriptions, useSubscriptionsEpisodes } from '../ContextProviders'

const COLLAPSED_WIDTH = 64
const COLLAPSE_THRESHOLD = 100
const MIN_WIDTH = 180
const MAX_WIDTH = 480
const AUTO_EXPAND_WIDTH = 1050

function NewSubscriptionButton({ mini = false }: { mini?: boolean }) {
  const { t } = useTranslation()
  const [showBanner, Banner] = useModalBanner()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  function checkURLScheme() {
    // If no scheme is specified, attempt to append https:// to the URL.
    if (inputRef.current && inputRef.current.value.length >= 3 && !inputRef.current.value.includes('://')) {
      inputRef.current.value = 'https://' + inputRef.current.value
    }
  }

  return (
    <>
      <Banner
        labels={[t('ok'), t('cancel')]}
        onSubmit={async () => {
          if (!inputRef.current) return
          checkURLScheme()

          if (!inputRef.current.validity.valid) {
            toastError(t('please_indicate_url'))
            return 'error'
          }

          const podcast = await parsePodcastDetails(inputRef.current.value)
          navigate('/preview', {
            state: {
              podcast,
            },
          })
        }}
      >
        <div className="mb-1 flex flex-col gap-2">
          <h1 className="border-primary-8 border-b-2 pb-1 text-lg">{t('add_subscription_url')}</h1>
          <input
            ref={inputRef}
            type="url"
            placeholder={t('feed_url')}
            autoFocus
            className="bg-primary-8 w-96 rounded-md px-2 py-1 focus:outline-none"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                checkURLScheme()
              }
            }}
            onBlur={checkURLScheme}
          />
        </div>
      </Banner>

      <button
        type="button"
        onClick={() => showBanner()}
        title={t('add_subscription_url')}
        aria-label={t('add_subscription_url')}
        className={`group hover:bg-primary-8 flex w-full items-center gap-2 rounded-md p-1 text-left transition-colors ${mini ? 'justify-center' : ''}`}
      >
        <span
          aria-hidden="true"
          className="bg-primary-8 group-hover:bg-accent-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        >
          <span className="-mt-2 text-3xl">+</span>
        </span>

        {!mini && <span className="min-w-0 text-sm">{t('add_subscription_url')}</span>}
      </button>
    </>
  )
}

function LeftMenu() {
  const subscriptions = useSubscriptions()
  const subscriptionsEpisodes = useSubscriptionsEpisodes()
  const { t } = useTranslation()
  const [
    {
      ui: { leftMenuWidth },
    },
    updateSettings,
  ] = useSettings()
  const dragging = useRef(false)
  const dragDirection = useRef<'left' | 'right'>('right')
  const prevX = useRef(0)
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null)

  useEffect(() => {
    const onResize = () => {
      setWindowWidth(window.innerWidth)
      if (window.innerWidth !== windowWidth) setManualCollapsed(null)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [windowWidth])

  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )

  const liveDragging = liveWidth !== null
  const collapsed = liveDragging
    ? liveWidth! < COLLAPSE_THRESHOLD
    : (manualCollapsed ?? windowWidth < AUTO_EXPAND_WIDTH)
  const displayWidth = collapsed
    ? COLLAPSED_WIDTH
    : Math.min(liveWidth ?? leftMenuWidth, Math.max(MIN_WIDTH, windowWidth * 0.28))
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-10 items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-primary-8 text-primary-1 shadow-[inset_3px_0_0_var(--color-accent-5)]' : 'text-primary-3 hover:bg-primary-8 hover:text-primary-1'}`

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    prevX.current = e.clientX
    dragDirection.current = 'right'
    document.body.style.cursor = 'col-resize'
    setLiveWidth(e.clientX)
  }

  function onResizeMove(e: React.PointerEvent) {
    if (!dragging.current) return
    if (e.clientX !== prevX.current) {
      dragDirection.current = e.clientX > prevX.current ? 'right' : 'left'
      prevX.current = e.clientX
    }
    setLiveWidth(Math.min(MAX_WIDTH, e.clientX))
  }

  function onResizeEnd(e: React.PointerEvent) {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    const newWidth = Math.min(MAX_WIDTH, e.clientX)
    if (newWidth < COLLAPSE_THRESHOLD || (newWidth < MIN_WIDTH && dragDirection.current === 'left')) {
      setManualCollapsed(true)
      updateSettings({ ui: { collapsedLeftMenu: true } })
    } else {
      setManualCollapsed(false)
      updateSettings({ ui: { collapsedLeftMenu: false, leftMenuWidth: Math.max(MIN_WIDTH, newWidth) } })
    }
    setLiveWidth(null)
  }

  return (
    <div className="relative flex shrink-0" style={{ width: displayWidth }}>
      <div
        className={`border-primary-7 bg-primary-10 flex h-full min-h-0 w-full flex-col overflow-x-hidden border-r pt-3 ${collapsed ? 'items-center px-1' : 'px-3'}`}
      >
        <div className="mb-4 flex w-full shrink-0 flex-col gap-1 uppercase">
          <NavLink to="/" className={navClass} title={t('home')}>
            <span className="w-6 shrink-0">{home}</span>
            {!collapsed && t('home')}
          </NavLink>
          <NavLink to="/news" className={navClass} title={t('news')} aria-label={t('news')}>
            <span className="w-6 shrink-0">{news}</span>
            {!collapsed && t('news')}
          </NavLink>
          <NavLink to="/queue" className={navClass} title={t('queue')}>
            <span className="w-6 shrink-0">{queue}</span>
            {!collapsed && t('queue')}
          </NavLink>
          <NavLink to="/downloads" className={navClass} title={t('downloads')}>
            <span className="w-6 shrink-0">{download}</span>
            {!collapsed && t('downloads')}
          </NavLink>
        </div>

        <div className={`mb-2 flex shrink-0 items-center gap-2 ${collapsed && 'justify-center'}`}>
          {!collapsed && <h1 className="mb-0.5 uppercase">{t('subscriptions')}</h1>}
          <button
            className={`hover:text-accent-5 flex justify-center ${subscriptionsEpisodes.fetchingFeeds.length && 'animate-[spin_1.5s_linear_reverse_infinite]'}`}
            onClick={() => subscriptions.updateFeeds()}
            title={t('update_subs_feeds')}
          >
            <span className={`${collapsed ? 'w-6' : 'w-5'}`}>{sync}</span>
          </button>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col gap-1 overflow-y-auto scroll-smooth">
          {subscriptions.subscriptions.map((subscription) => {
            return <SubscriptionCard key={subscription.id} podcast={subscription} mini={collapsed} />
          })}
          <NewSubscriptionButton mini={collapsed} />
        </div>
        <div className="border-primary-7 mt-2 w-full shrink-0 border-t py-2">
          <NavLink to="/settings" className={navClass} title={t('settings')}>
            <span className="w-6 shrink-0">{settings}</span>
            {!collapsed && t('settings')}
          </NavLink>
        </div>
      </div>

      {/* RESIZE HANDLE */}
      <div
        className="hover:bg-accent-8 absolute right-0 my-auto h-full w-2 translate-x-1/2 cursor-w-resize bg-clip-content px-[3px] transition-colors"
        title={collapsed ? t('double_click_expand') : t('double_click_collapse')}
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={() => {
          dragging.current = false
          document.body.style.cursor = ''
          setLiveWidth(null)
        }}
        onDoubleClick={() => {
          setManualCollapsed(!collapsed)
          updateSettings({ ui: { collapsedLeftMenu: !collapsed } })
        }}
      />
    </div>
  )
}

export default LeftMenu
