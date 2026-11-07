import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BukuDompet',
    short_name: 'BukuDompet',
    description: 'Aplikasi BukuDompet dengan pengalaman gamifikasi interaktif',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFDF9',
    theme_color: '#FFFDF9',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
