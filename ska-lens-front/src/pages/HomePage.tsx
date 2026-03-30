import { useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { Camera, Images } from 'lucide-react'
import { skaLensApi } from '../api/skaLensApi'
import { FeedCard } from '../components/FeedCard'
import type { Photo, PhotoComment } from '../types/api'

export function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const queryClient = useQueryClient()
  const { ref: sentinelRef, inView } = useInView({ threshold: 0 })

  const albumsQuery = useQuery({
    queryKey: ['albums'],
    queryFn: () => skaLensApi.getAlbums(false),
  })

  const photosQuery = useInfiniteQuery({
    queryKey: ['photos-feed', selectedTag, selectedAlbumId],
    queryFn: ({ pageParam }) =>
      skaLensApi.getFeed({
        cursor: pageParam,
        limit: 12,
        tag: selectedTag || undefined,
        albumId: selectedAlbumId || undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined),
  })

  const allPhotos = useMemo(() => photosQuery.data?.pages.flatMap((page) => page.items) ?? [], [photosQuery.data])
  const featuredPhotos = useMemo(() => allPhotos.slice(0, 5), [allPhotos])

  const commentsQuery = useQuery({
    queryKey: ['feed-top-comments', allPhotos.map((photo) => photo.id).join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        allPhotos.slice(0, 30).map(async (photo) => [photo.id, await skaLensApi.listTopComments(photo.id)] as const),
      )
      return Object.fromEntries(entries)
    },
    enabled: allPhotos.length > 0,
  })

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    allPhotos.forEach((photo) => {
      photo.tags?.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags)
  }, [allPhotos])

  const likeMutation = useMutation({
    mutationFn: ({ photo, nextLiked }: { photo: Photo; nextLiked: boolean }) =>
      nextLiked ? skaLensApi.likePhoto(photo.id, 'viewer') : skaLensApi.unlikePhoto(photo.id, 'viewer'),
    onMutate: async ({ photo, nextLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['photos-feed', selectedTag, selectedAlbumId] })
      const previous = queryClient.getQueryData(['photos-feed', selectedTag, selectedAlbumId])
      queryClient.setQueryData(['photos-feed', selectedTag, selectedAlbumId], (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('pages' in oldData)) return oldData
        const data = oldData as { pages: Array<{ items: Photo[] }>; pageParams: unknown[] }
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== photo.id) return item
              const likedBy = new Set(item.likedBy ?? [])
              if (nextLiked) likedBy.add('viewer')
              else likedBy.delete('viewer')
              return {
                ...item,
                likedBy: Array.from(likedBy),
                likeCount: Math.max(0, (item.likeCount ?? 0) + (nextLiked ? 1 : -1)),
              }
            }),
          })),
        }
      })
      return { previous }
    },
    onSuccess: (updatedPhoto) => {
      queryClient.setQueriesData({ queryKey: ['photos-feed'] }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('pages' in oldData)) return oldData
        const data = oldData as { pages: Array<{ items: Photo[] }>; pageParams: unknown[] }
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === updatedPhoto.id ? updatedPhoto : item)),
          })),
        }
      })
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['photos-feed', selectedTag, selectedAlbumId], context.previous)
      }
    },
  })

  useEffect(() => {
    if (featuredPhotos.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % featuredPhotos.length)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [featuredPhotos])

  useEffect(() => {
    if (inView && photosQuery.hasNextPage && !photosQuery.isFetchingNextPage) {
      photosQuery.fetchNextPage()
    }
  }, [inView, photosQuery])

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <section className="relative mb-8 h-[55vh] min-h-[360px] overflow-hidden rounded-2xl bg-slate-900">
        {featuredPhotos.length > 0 ? (
          <>
            {featuredPhotos.map((photo, index) => (
              <img
                key={photo.id}
                src={photo.imageUrl.startsWith('http') ? photo.imageUrl : `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}${photo.imageUrl}`}
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
            <Images size={16} /> {allPhotos.length} 张作品
          </span>
          <span className="inline-flex items-center gap-1">
            <Camera size={16} /> {(albumsQuery.data ?? []).length} 个相册
          </span>
        </div>
      </section>

      {photosQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="h-16 animate-pulse bg-slate-100" />
              <div className="aspect-[4/5] animate-pulse bg-slate-200" />
              <div className="h-24 animate-pulse bg-slate-100" />
            </div>
          ))}
        </div>
      ) : photosQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">加载作品失败，请稍后重试。</div>
      ) : allPhotos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">暂无作品数据</div>
      ) : (
        <section className="mx-auto max-w-3xl space-y-4">
          {allPhotos.map((photo) => (
            <FeedCard
              key={photo.id}
              photo={photo}
              topComments={(commentsQuery.data?.[photo.id] as PhotoComment[] | undefined) ?? []}
              onLikeToggle={(p, nextLiked) => likeMutation.mutateAsync({ photo: p, nextLiked })}
            />
          ))}
          <div ref={sentinelRef} className="h-8" />
          {photosQuery.isFetchingNextPage && (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="h-12 animate-pulse bg-slate-100" />
                  <div className="aspect-[4/5] animate-pulse bg-slate-200" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
