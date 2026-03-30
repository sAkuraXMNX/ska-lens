export interface ExifInfo {
  cameraModel?: string
  lensModel?: string
  aperture?: string
  shutterSpeed?: string
  iso?: number
  focalLength?: string
  capturedAt?: string
}

export interface PhotoComment {
  id?: string
  photoId?: string
  userId: string
  content: string
  createdAt: string
}

export interface Photo {
  id: string
  title?: string
  description?: string
  imageUrl: string
  thumbnailUrl?: string
  albumId?: string
  tags?: string[]
  exif?: ExifInfo
  likedBy?: string[]
  likeCount?: number
  commentCount?: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface PhotoFeedResponse {
  items: Photo[]
  nextCursor: string | null
  hasMore: boolean
}

export interface ProfileResponse {
  username: string
  displayName: string
  bio: string
  avatarUrl?: string | null
  totalLikes: number
  albumCount: number
}

export type AlbumVisibility = 'PUBLIC' | 'PRIVATE'

export interface Album {
  id: string
  name: string
  description?: string
  visibility: AlbumVisibility
  accessCode?: string
  tags?: string[]
  coverPhotoId?: string
  createdAt: string
  updatedAt: string
}

export interface AuthRequest {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  tokenType: string
  expiresIn: number
  username: string
  roles: string[]
}

export interface CreateAlbumRequest {
  name: string
  description?: string
  visibility: AlbumVisibility
  accessCode?: string
  tags?: string[]
  coverPhotoId?: string
}

export interface UpdatePhotoRequest {
  title?: string
  description?: string
  albumId?: string
  tags?: string[]
  published?: boolean
}
