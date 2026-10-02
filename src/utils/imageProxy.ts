import { convertFileSrc, isTauri } from '@tauri-apps/api/core'

export function proxyUrl(url: string | undefined): string | undefined {
  if (!url || !/^https?:\/\//i.test(url) || !isTauri()) return url
  // Tauri encodes the complete source URL and selects the platform's protocol format.
  return convertFileSrc(url, 'imgproxy')
}
