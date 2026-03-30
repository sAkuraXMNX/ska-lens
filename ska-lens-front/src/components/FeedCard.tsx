import { useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react'
import type { Photo, PhotoComment } from '../types/api'

function absoluteImageUrl(path?: string) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  return `${base}${path}`
}

function timeAgo(dateInput?: string) {
  if (!dateInput) return '刚刚'
  const time = new Date(dateInput).getTime()
  if (Number.isNaN(time)) return '刚刚'
  const delta = Math.floor((Date.now() - time) / 1000)
  if (delta < 60) return '刚刚'
  if (delta < 3600) return `${Math.floor(delta / 60)}分钟前`
  if (delta < 86400) return `${Math.floor(delta / 3600)}小时前`
  return `${Math.floor(delta / 86400)}天前`
}

type FeedCardProps = {
  photo: Photo
  topComments?: PhotoComment[]
  onLikeToggle: (photo: Photo, nextLiked: boolean) => Promise<unknown> | void
}

const CURRENT_USER_ID = 'viewer'

export function FeedCard({ photo, topComments = [], onLikeToggle }: FeedCardProps) {
  const [showLikeBurst, setShowLikeBurst] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)
  const sourceLiked = photo.likedBy?.includes(CURRENT_USER_ID) ?? false
  const sourceLikeCount = photo.likeCount ?? 0
  const likedByMe = sourceLiked
  const likeCount = sourceLikeCount

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const triggerBurst = () => {
    setShowLikeBurst(true)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setShowLikeBurst(false), 550)
  }

  const updateLike = async (nextLiked: boolean, withBurst = false) => {
    if (likedByMe === nextLiked) return
    if (withBurst) {
      triggerBurst()
    }
    await onLikeToggle(photo, nextLiked)
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            摄
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">摄影师</div>
            <div className="text-xs text-slate-500">{timeAgo(photo.createdAt)}</div>
          </div>
        </div>
      </header>

      <button
        type="button"
        onDoubleClick={() => updateLike(true, true)}
        className="relative block w-full overflow-hidden bg-slate-100 focus:outline-none"
      >
        <img
          src={absoluteImageUrl(photo.imageUrl)}
          alt={photo.title ?? 'photo'}
          className="aspect-[4/5] w-full object-cover md:aspect-square"
          loading="lazy"
        />
        {showLikeBurst && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart className="feed-like-burst h-20 w-20 fill-pink-500 text-pink-500" />
          </span>
        )}
      </button>

      <div className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => updateLike(!likedByMe)} className="text-slate-700 hover:text-slate-900">
              <Heart className={`h-5 w-5 ${likedByMe ? 'fill-pink-500 text-pink-500' : ''}`} />
            </button>
            <MessageCircle className="h-5 w-5 text-slate-700" />
            <Share2 className="h-5 w-5 text-slate-700" />
          </div>
          <button type="button" className="text-slate-700 hover:text-slate-900">
            <Bookmark className="h-5 w-5" />
          </button>
        </div>

        <div className="text-sm font-semibold text-slate-900">{likeCount} 次赞</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
          {(photo.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2 py-1">
              #{tag}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          {topComments.slice(0, 2).map((comment, index) => (
            <p key={`${comment.userId}-${comment.createdAt}-${index}`}>
              <span className="mr-1 font-semibold text-slate-900">{comment.userId}</span>
              {comment.content}
            </p>
          ))}
          {topComments.length === 0 && <p className="text-slate-500">还没有评论</p>}
        </div>
      </div>
    </article>
  )
}
