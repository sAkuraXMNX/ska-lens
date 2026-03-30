import { apiClient } from './client'
import type {
  Album,
  AuthRequest,
  AuthResponse,
  CreateAlbumRequest,
  Photo,
  UpdatePhotoRequest,
} from '../types/api'

export const skaLensApi = {
  getPhotos: async (params?: { tag?: string; albumId?: string; includePrivate?: boolean }): Promise<Photo[]> => {
    const response = await apiClient.get<Photo[]>('/api/photos', { params })
    return response.data
  },
  getPhotoById: async (id: string): Promise<Photo> => {
    const response = await apiClient.get<Photo>(`/api/photos/${id}`)
    return response.data
  },
  addComment: async (id: string, payload: { authorName: string; content: string }): Promise<Photo> => {
    const response = await apiClient.post<Photo>(`/api/photos/${id}/comments`, payload)
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
