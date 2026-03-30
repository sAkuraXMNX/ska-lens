import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { skaLensApi } from '../api/skaLensApi'

function absoluteImageUrl(path?: string) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  return `${base}${path}`
}

export function PhotoDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [zoomOpen, setZoomOpen] = useState(false)
  const [userId, setUserId] = useState('viewer')
  const [content, setContent] = useState('')
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null)
  const [optimisticLikeCount, setOptimisticLikeCount] = useState<number | null>(null)

  const photoQuery = useQuery({
    queryKey: ['photo', id],
    queryFn: () => skaLensApi.getPhotoById(id),
    enabled: Boolean(id),
  })

  const addCommentMutation = useMutation({
    mutationFn: (payload: { userId: string; content: string }) => skaLensApi.addComment(id, payload),
    onSuccess: () => {
      setContent('')
      queryClient.invalidateQueries({ queryKey: ['photo', id] })
      queryClient.invalidateQueries({ queryKey: ['photo-comments', id] })
    },
  })

  const commentsQuery = useQuery({
    queryKey: ['photo-comments', id],
    queryFn: () => skaLensApi.listComments(id),
    enabled: Boolean(id),
  })

  const likeMutation = useMutation({
    mutationFn: (liked: boolean) => (liked ? skaLensApi.likePhoto(id, 'viewer') : skaLensApi.unlikePhoto(id, 'viewer')),
    onSuccess: (updatedPhoto) => {
      queryClient.setQueryData(['photo', id], updatedPhoto)
      setOptimisticLiked(null)
      setOptimisticLikeCount(null)
    },
    onError: () => {
      setOptimisticLiked(null)
      setOptimisticLikeCount(null)
    },
  })

  const exifItems = useMemo(() => {
    const exif = photoQuery.data?.exif
    return [
      ['相机', exif?.cameraModel],
      ['镜头', exif?.lensModel],
      ['光圈', exif?.aperture],
      ['快门', exif?.shutterSpeed],
      ['ISO', exif?.iso ? String(exif.iso) : undefined],
      ['焦距', exif?.focalLength],
      ['拍摄时间', exif?.capturedAt],
    ]
  }, [photoQuery.data?.exif])

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userId.trim() || !content.trim()) return
    addCommentMutation.mutate({ userId: userId.trim(), content: content.trim() })
  }

  if (photoQuery.isLoading) {
    return <div className="mx-auto max-w-7xl p-6">加载中...</div>
  }

  if (photoQuery.isError || !photoQuery.data) {
    return <div className="mx-auto max-w-7xl p-6 text-red-600">作品不存在或加载失败。</div>
  }

  const photo = photoQuery.data
  const likedByMe = optimisticLiked ?? (photo.likedBy?.includes('viewer') ?? false)
  const likeCount = optimisticLikeCount ?? (photo.likeCount ?? 0)

  const toggleLike = () => {
    const nextLiked = !likedByMe
    setOptimisticLiked(nextLiked)
    setOptimisticLikeCount(Math.max(0, likeCount + (nextLiked ? 1 : -1)))
    likeMutation.mutate(nextLiked)
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[1.5fr_1fr] md:p-6">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <button type="button" onClick={() => setZoomOpen(true)} className="block w-full cursor-zoom-in overflow-hidden rounded-lg">
          <img src={absoluteImageUrl(photo.imageUrl)} alt={photo.title ?? 'photo'} className="w-full object-cover" />
        </button>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">{photo.title ?? 'Untitled'}</h1>
        <p className="mt-2 text-slate-600">{photo.description ?? '暂无描述'}</p>
        <button
          type="button"
          onClick={toggleLike}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm"
        >
          <Heart className={`h-4 w-4 ${likedByMe ? 'fill-pink-500 text-pink-500' : 'text-slate-700'}`} />
          {likeCount} 次赞
        </button>
      </section>

      <aside className="space-y-4 rounded-xl bg-white p-4 shadow-sm md:max-h-[78vh] md:overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-900">EXIF 信息</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          {exifItems.map(([label, value]) => (
            <li key={label} className="flex justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="font-medium text-slate-800">{label}</span>
              <span>{value ?? '-'}</span>
            </li>
          ))}
        </ul>

        <div>
          <h3 className="mb-2 text-base font-semibold text-slate-900">评论区</h3>
          <form className="space-y-2" onSubmit={submitComment}>
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="你的昵称"
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="说点什么..."
            />
            <button
              type="submit"
              disabled={addCommentMutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {addCommentMutation.isPending ? '提交中...' : '提交评论'}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {(commentsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">还没有评论，来发表第一条吧。</p>
            ) : (
              (commentsQuery.data ?? []).map((comment, index) => (
                <div key={`${comment.userId}-${comment.createdAt}-${index}`} className="rounded-md border border-slate-200 p-3">
                  <div className="text-sm font-medium text-slate-900">{comment.userId}</div>
                  <div className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</div>
                  <p className="mt-1 text-sm text-slate-700">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {zoomOpen && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-6"
          onClick={() => setZoomOpen(false)}
        >
          <div className="grid h-full w-full max-w-7xl gap-4 md:grid-cols-[1.7fr_1fr]">
            <div className="flex items-center justify-center">
              <img src={absoluteImageUrl(photo.imageUrl)} alt={photo.title ?? 'photo zoom'} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="hidden rounded-xl bg-black/45 p-4 text-left text-white md:block md:overflow-y-auto">
              <h3 className="text-lg font-semibold">评论区</h3>
              <div className="mt-3 space-y-3">
                {(commentsQuery.data ?? []).slice(0, 20).map((comment, index) => (
                  <div key={`${comment.userId}-${comment.createdAt}-theater-${index}`} className="rounded-md bg-white/10 p-2">
                    <div className="text-sm font-semibold">{comment.userId}</div>
                    <p className="text-sm text-white/90">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
