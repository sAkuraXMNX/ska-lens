import { apiClient } from './client'
import type {
  Album,
  AuthRequest,
  AuthResponse,
  CreateAlbumRequest,
  PhotoComment,
  PhotoFeedResponse,
  Photo,
  ProfileResponse,
  UpdatePhotoRequest,
} from '../types/api'

export const skaLensApi = {
  getFeed: async (params?: {
    cursor?: string
    limit?: number
    tag?: string
    albumId?: string
    includePrivate?: boolean
  }): Promise<PhotoFeedResponse> => {
    const response = await apiClient.get<PhotoFeedResponse>('/api/v1/photos/feed', { params })
    return response.data
  },
  getPhotos: async (params?: { tag?: string; albumId?: string; includePrivate?: boolean }): Promise<Photo[]> => {
    const response = await apiClient.get<Photo[]>('/api/photos', { params })
    return response.data
  },
  getPhotoById: async (id: string): Promise<Photo> => {
    const response = await apiClient.get<Photo>(`/api/photos/${id}`)
    return response.data
  },
  listComments: async (id: string): Promise<PhotoComment[]> => {
    const response = await apiClient.get<PhotoComment[]>(`/api/photos/${id}/comments`)
    return response.data
  },
  listTopComments: async (id: string): Promise<PhotoComment[]> => {
    const response = await apiClient.get<PhotoComment[]>(`/api/photos/${id}/comments/highlight`)
    return response.data
  },
  addComment: async (id: string, payload: { userId: string; content: string }): Promise<Photo> => {
    const response = await apiClient.post<Photo>(`/api/photos/${id}/comments`, payload)
    return response.data
  },
  likePhoto: async (id: string, userId: string): Promise<Photo> => {
    const response = await apiClient.post<Photo>(`/api/photos/${id}/likes`, { userId })
    return response.data
  },
  unlikePhoto: async (id: string, userId: string): Promise<Photo> => {
    const response = await apiClient.delete<Photo>(`/api/photos/${id}/likes`, { data: { userId } })
    return response.data
  },
  getProfile: async (username?: string): Promise<ProfileResponse> => {
    const response = await apiClient.get<ProfileResponse>('/api/profile', { params: { username } })
    return response.data
  },
  getProfilePhotos: async (params?: { username?: string; cursor?: string; limit?: number }): Promise<PhotoFeedResponse> => {
    const response = await apiClient.get<PhotoFeedResponse>('/api/profile/photos', { params })
    return response.data
  },
  getAdminPhotos: async (): Promise<Photo[]> => {
    const response = await apiClient.get<Photo[]>('/api/photos/admin')
    return response.data
  },
  uploadPhotos: async (formData: FormData): Promise<Photo[]> => {
    const response = await apiClient.post<Photo[]>('/api/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  updatePhoto: async (id: string, payload: UpdatePhotoRequest): Promise<Photo> => {
    const response = await apiClient.put<Photo>(`/api/photos/${id}`, payload)
    return response.data
  },
  deletePhoto: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/photos/${id}`)
  },
  batchDeletePhotos: async (ids: string[]): Promise<void> => {
    await apiClient.delete('/api/photos/batch', { data: { ids } })
  },
  batchUpdateTags: async (ids: string[], tags: string[]): Promise<Photo[]> => {
    const response = await apiClient.put<Photo[]>('/api/photos/batch/tags', { ids, tags })
    return response.data
  },
  getAlbums: async (includePrivate = false): Promise<Album[]> => {
    const response = await apiClient.get<Album[]>('/api/albums', { params: { includePrivate } })
    return response.data
  },
  createAlbum: async (payload: CreateAlbumRequest): Promise<Album> => {
    const response = await apiClient.post<Album>('/api/albums', payload)
    return response.data
  },
  login: async (payload: AuthRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', payload)
    return response.data
  },
}
