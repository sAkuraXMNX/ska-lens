import { useEffect, useMemo, useState } from 'react'
import Masonry from 'react-masonry-css'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Camera, Images } from 'lucide-react'
import { skaLensApi } from '../api/skaLensApi'

function absoluteImageUrl(path?: string) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  return `${base}${path}`
}

export function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')

  const albumsQuery = useQuery({
    queryKey: ['albums'],
    queryFn: () => skaLensApi.getAlbums(false),
  })

  const photosQuery = useQuery({
    queryKey: ['photos', selectedTag, selectedAlbumId],
    queryFn: () => skaLensApi.getPhotos({
      tag: selectedTag || undefined,
      albumId: selectedAlbumId || undefined,
    }),
  })

  const featuredPhotos = useMemo(() => (photosQuery.data ?? []).slice(0, 5), [photosQuery.data])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    ;(photosQuery.data ?? []).forEach((photo) => {
      photo.tags?.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags)
  }, [photosQuery.data])

  useEffect(() => {
    if (featuredPhotos.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % featuredPhotos.length)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [featuredPhotos])

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <section className="relative mb-8 h-[55vh] min-h-[360px] overflow-hidden rounded-2xl bg-slate-900">
        {featuredPhotos.length > 0 ? (
          <>
            {featuredPhotos.map((photo, index) => (
              <img
                key={photo.id}
                src={absoluteImageUrl(photo.imageUrl)}
                alt={photo.title ?? 'photo'}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                  index === activeSlide ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
            <div className="absolute bottom-0 p-6 text-white md:p-8">
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/70">Ska Lens Featured</p>
              <h1 className="text-3xl font-semibold md:text-5xl">{featuredPhotos[activeSlide]?.title ?? 'Latest Works'}</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
                {featuredPhotos[activeSlide]?.description ?? '极简风格摄影作品展示'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">暂无精选作品</div>
        )}
      </section>

      <section className="mb-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">标签过滤</span>
          <select
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">全部标签</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">相册过滤</span>
          <select
            value={selectedAlbumId}
            onChange={(event) => setSelectedAlbumId(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">全部相册</option>
            {(albumsQuery.data ?? []).map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end justify-start gap-4 text-sm text-slate-600 md:justify-end">
          <span className="inline-flex items-center gap-1">
            <Images size={16} /> {(photosQuery.data ?? []).length} 张作品
          </span>
          <span className="inline-flex items-center gap-1">
            <Camera size={16} /> {(albumsQuery.data ?? []).length} 个相册
          </span>
        </div>
      </section>

      {photosQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : photosQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">加载作品失败，请稍后重试。</div>
      ) : (photosQuery.data ?? []).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">暂无作品数据</div>
      ) : (
        <Masonry
          breakpointCols={{ default: 4, 1280: 3, 960: 2, 640: 1 }}
          className="-ml-4 flex w-auto"
          columnClassName="pl-4"
        >
          {(photosQuery.data ?? []).map((photo) => (
            <Link key={photo.id} to={`/photos/${photo.id}`} className="mb-4 block overflow-hidden rounded-xl bg-white shadow-sm">
              <img
                src={absoluteImageUrl(photo.thumbnailUrl ?? photo.imageUrl)}
                alt={photo.title ?? 'photo'}
                className="w-full object-cover"
                loading="lazy"
              />
              <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{photo.title ?? 'Untitled'}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{photo.description ?? '暂无描述'}</p>
              </div>
            </Link>
          ))}
        </Masonry>
      )}
    </div>
  )
}
