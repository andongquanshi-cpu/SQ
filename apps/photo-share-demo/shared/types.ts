// 前后端共用的数据结构。服务端 JSON 存储和接口返回都用它。

export interface Member {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Note {
  id: string;
  photoId: string;
  authorId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface Tag {
  text: string;
  addedBy: string;
  addedAt: string;
}

export interface Photo {
  id: string;
  uploaderId: string;
  createdAt: string;
  width: number;
  height: number;
  location: string;
  locationVersion: number;
  locationUpdatedBy: string | null;
  tags: Tag[];
  deleted: boolean;
}

export interface TripSnapshot {
  trip: { id: string; name: string };
  me: Member;
  members: Member[];
  photos: Photo[];
  notes: Note[];
  version: number;
}

export interface ApiError {
  error: string;
  code: 'unauthorized' | 'forbidden' | 'trip_full' | 'conflict' | 'bad_request' | 'not_found' | 'too_large';
  current?: unknown;
}
