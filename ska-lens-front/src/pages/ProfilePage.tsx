import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect, useMemo } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { skaLensApi } from '../api/skaLensApi'

function absoluteImageUrl(path?: string) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  return `${base}${path}`
}

export function ProfilePage() {
  const [params] = useSearchParams()
  const username = params.get('username') ?? undefined
  const { ref, inView } = useInView({ threshold: 0 })

  const profileQuery = useQuery({
    queryKey: ['profile', username],
    queryFn: () => skaLensApi.getProfile(username),
  })

  const photosQuery = useInfiniteQuery({
    queryKey: ['profile-photos', username],
    queryFn: ({ pageParam }) => skaLensApi.getProfilePhotos({ username, cursor: pageParam, limit: 9 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined),
  })

  useEffect(() => {
    if (inView && photosQuery.hasNextPage && !photosQuery.isFetchingNextPage) {
      photosQuery.fetchNextPage()
    }
  }, [inView, photosQuery])

  const photos = useMemo(() => photosQuery.data?.pages.flatMap((page) => page.items) ?? [], [photosQuery.data])

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-2xl font-semibold text-slate-700">
            {profileQuery.data?.avatarUrl ? (
              <img src={absoluteImageUrl(profileQuery.data.avatarUrl)} alt={profileQuery.data.displayName} className="h-full w-full object-cover" />
            ) : (
              (profileQuery.data?.displayName?.[0] ?? 'P').toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-slate-900">{profileQuery.data?.displayName ?? 'Profile'}</h1>
            <p className="mt-1 text-sm text-slate-600">@{profileQuery.data?.username ?? 'unknown'}</p>
            <p className="mt-2 text-sm text-slate-700">{profileQuery.data?.bio ?? '这个人很神秘，什么都没留下。'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
              <div className="text-lg font-semibold text-slate-900">{profileQuery.data?.totalLikes ?? 0}</div>
              <div className="text-slate-600">获赞总数</div>
            </div>
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
              <div className="text-lg font-semibold text-slate-900">{profileQuery.data?.albumCount ?? 0}</div>
              <div className="text-slate-600">相册数量</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-1 md:gap-2">
        {photos.map((photo) => (
          <Link key={photo.id} to={`/photos/${photo.id}`} className="group relative block overflow-hidden rounded-md bg-slate-200">
            <img src={absoluteImageUrl(photo.thumbnailUrl ?? photo.imageUrl)} alt={photo.title ?? 'photo'} className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/55 text-sm font-semibold text-white group-hover:flex">
              <span className="inline-flex items-center gap-1">
                <Heart className="h-4 w-4 fill-white text-white" /> {photo.likeCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-4 w-4" /> {photo.commentCount ?? 0}
              </span>
            </div>
          </Link>
        ))}
      </section>
      <div ref={ref} className="h-8" />
    </div>
  )
}
