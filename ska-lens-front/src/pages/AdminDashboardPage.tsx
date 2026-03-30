import { useMemo, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { skaLensApi } from '../api/skaLensApi'
import { authStore } from '../lib/auth'
import type { AlbumVisibility } from '../types/api'

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function AdminDashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [albumId, setAlbumId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const [albumName, setAlbumName] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
  const [albumVisibility, setAlbumVisibility] = useState<AlbumVisibility>('PUBLIC')
  const [albumAccessCode, setAlbumAccessCode] = useState('')
  const [albumTags, setAlbumTags] = useState('')

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [batchTags, setBatchTags] = useState('')

  const albumsQuery = useQuery({
    queryKey: ['admin-albums'],
    queryFn: () => skaLensApi.getAlbums(true),
  })

  const photosQuery = useQuery({
    queryKey: ['admin-photos'],
    queryFn: skaLensApi.getAdminPhotos,
  })

  const uploadMutation = useMutation({
    mutationFn: skaLensApi.uploadPhotos,
    onSuccess: () => {
      setUploadFiles([])
      setTitle('')
      setDescription('')
      setTagsInput('')
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })

  const createAlbumMutation = useMutation({
    mutationFn: skaLensApi.createAlbum,
    onSuccess: () => {
      setAlbumName('')
      setAlbumDescription('')
      setAlbumVisibility('PUBLIC')
      setAlbumAccessCode('')
      setAlbumTags('')
      queryClient.invalidateQueries({ queryKey: ['admin-albums'] })
      queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })

  const deleteBatchMutation = useMutation({
    mutationFn: skaLensApi.batchDeletePhotos,
    onSuccess: () => {
      setSelectedPhotoIds([])
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })

  const updateTagsMutation = useMutation({
    mutationFn: ({ ids, tags }: { ids: string[]; tags: string[] }) => skaLensApi.batchUpdateTags(ids, tags),
    onSuccess: () => {
      setBatchTags('')
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })

  const sortedPhotos = useMemo(
    () => (photosQuery.data ?? []).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [photosQuery.data],
  )

  const onDropFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const dropped = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
    if (dropped.length > 0) {
      setUploadFiles((current) => [...current, ...dropped])
    }
  }

  const submitUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (uploadFiles.length === 0) return

    const formData = new FormData()
    uploadFiles.forEach((file) => formData.append('files', file))
    if (albumId) formData.append('albumId', albumId)
    if (title) formData.append('title', title)
    if (description) formData.append('description', description)
    if (tagsInput) formData.append('tags', tagsInput)

    uploadMutation.mutate(formData)
  }

  const submitCreateAlbum = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createAlbumMutation.mutate({
      name: albumName,
      description: albumDescription || undefined,
      visibility: albumVisibility,
      accessCode: albumVisibility === 'PRIVATE' ? albumAccessCode || undefined : undefined,
      tags: parseTags(albumTags),
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedPhotoIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const handleLogout = () => {
    authStore.clearToken()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">后台管理台</h1>
          <p className="text-sm text-slate-500">上传作品、管理相册和批量维护标签</p>
        </div>
        <button type="button" onClick={handleLogout} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          退出登录
        </button>
      </header>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">上传中心</h2>
        <form className="space-y-3" onSubmit={submitUpload}>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDropFiles}
            className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500"
          >
            拖拽图片到此处上传
            <div className="mt-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
                className="text-sm"
              />
            </div>
            {uploadFiles.length > 0 && <div className="mt-2 text-xs text-slate-600">已选择 {uploadFiles.length} 张图片</div>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              placeholder="标题（可选）"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select value={albumId} onChange={(event) => setAlbumId(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">不归类到相册</option>
              {(albumsQuery.data ?? []).map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            placeholder="描述（可选）"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="标签，使用逗号分隔"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <button type="submit" disabled={uploadMutation.isPending} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
            {uploadMutation.isPending ? '上传中...' : '开始上传'}
          </button>
          {uploadMutation.isError && <div className="text-sm text-red-600">上传失败，请检查服务状态或权限。</div>}
        </form>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">相册管理</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submitCreateAlbum}>
          <input
            required
            placeholder="相册名称"
            value={albumName}
            onChange={(event) => setAlbumName(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={albumVisibility}
            onChange={(event) => setAlbumVisibility(event.target.value as AlbumVisibility)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="PUBLIC">公开相册</option>
            <option value="PRIVATE">私密相册</option>
          </select>
          <input
            placeholder="描述"
            value={albumDescription}
            onChange={(event) => setAlbumDescription(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="标签（逗号分隔）"
            value={albumTags}
            onChange={(event) => setAlbumTags(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {albumVisibility === 'PRIVATE' && (
            <input
              placeholder="私密访问码"
              value={albumAccessCode}
              onChange={(event) => setAlbumAccessCode(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
          )}
          <button type="submit" disabled={createAlbumMutation.isPending} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white md:col-span-2">
            {createAlbumMutation.isPending ? '创建中...' : '创建相册'}
          </button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">作品列表与批量操作</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            placeholder="批量标签（逗号分隔）"
            value={batchTags}
            onChange={(event) => setBatchTags(event.target.value)}
            className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={selectedPhotoIds.length === 0 || updateTagsMutation.isPending}
            onClick={() => updateTagsMutation.mutate({ ids: selectedPhotoIds, tags: parseTags(batchTags) })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            批量更新标签
          </button>
          <button
            type="button"
            disabled={selectedPhotoIds.length === 0 || deleteBatchMutation.isPending}
            onClick={() => deleteBatchMutation.mutate(selectedPhotoIds)}
            className="rounded-md bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            批量删除
          </button>
        </div>

        {photosQuery.isLoading ? (
          <div className="text-sm text-slate-500">加载中...</div>
        ) : photosQuery.isError ? (
          <div className="text-sm text-red-600">加载失败，请检查是否已登录。</div>
        ) : sortedPhotos.length === 0 ? (
          <div className="text-sm text-slate-500">暂无作品</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-2">选择</th>
                  <th className="py-2 pr-2">标题</th>
                  <th className="py-2 pr-2">标签</th>
                  <th className="py-2 pr-2">相册</th>
                  <th className="py-2 pr-2">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {sortedPhotos.map((photo) => (
                  <tr key={photo.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={selectedPhotoIds.includes(photo.id)} onChange={() => toggleSelect(photo.id)} />
                    </td>
                    <td className="py-2 pr-2">{photo.title ?? 'Untitled'}</td>
                    <td className="py-2 pr-2">{(photo.tags ?? []).join(', ') || '-'}</td>
                    <td className="py-2 pr-2">{(albumsQuery.data ?? []).find((album) => album.id === photo.albumId)?.name ?? '-'}</td>
                    <td className="py-2 pr-2">{new Date(photo.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
