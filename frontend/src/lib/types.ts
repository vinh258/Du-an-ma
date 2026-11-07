export type Role = 'ADMIN' | 'MOD' | 'STUDENT';
export type DocStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Faculty { id: number; name: string; code: string }
export interface Subject { id: number; name: string; code: string; facultyId: number; faculty?: Faculty }
export interface Tag { id: number; name: string; slug: string }

export interface User {
  id: number; email: string; fullName: string; avatarUrl: string | null; studentCode: string | null;
  role: Role; reputationScore: number; status: 'ACTIVE' | 'BANNED'; faculty?: Faculty | null; facultyId: number | null;
  createdAt: string;
}
export interface UserLite { id: number; fullName: string; avatarUrl?: string | null; reputationScore?: number; role?: Role }

export interface Doc {
  id: number; title: string; description: string | null; status: DocStatus; rejectReason: string | null;
  fileName: string; fileSize: number; mimeType: string; uploaderId: number; uploader?: UserLite;
  subject?: Subject; tags: Tag[]; viewCount: number; downloadCount: number; ratingAvg: number; ratingCount: number;
  createdAt: string; myRating?: number | null; bookmarked?: boolean; aiSummary?: string | null;
}

export interface Page<T> { items: T[]; total: number; page: number; limit: number; totalPages: number }

export interface CommentNode {
  id: number; parentId: number | null; content: string; isDeleted: boolean; createdAt: string; editedAt?: string | null;
  user?: UserLite; replies: CommentNode[];
}

export interface Notif {
  id: number; type: string; payload: Record<string, any> | null; isRead: boolean; createdAt: string;
}
export interface RepLog { id: number; delta: number; reason: string; createdAt: string }
export interface ModLog {
  id: number; action: 'APPROVE' | 'REJECT'; reason: string | null; createdAt: string;
  moderator?: UserLite; document?: { id: number; title: string };
}
export interface ReportItem {
  id: number; reason: string; status: string; createdAt: string;
  reporter?: UserLite; document?: { id: number; title: string; status: DocStatus };
}

export interface Stats {
  users: { total: number; active: number; banned: number; mods: number; admins: number; new7: number };
  documents: { total: number; pending: number; approved: number; rejected: number; downloads: number; views: number; new7: number };
  interactions: { comments: number; ratings: number; bookmarks: number; openReports: number };
  moderation: { approve: number; reject: number };
  series: { dates: string[]; documents: number[]; users: number[]; downloads: number[] };
  byFaculty: { id: number; name: string; code: string; docs: number; downloads: number }[];
  topContributors: { id: number; fullName: string; reputation: number; docs: number; downloads: number }[];
  topDocuments: { id: number; title: string; downloads: number; views: number; rating: number }[];
}
export interface AuditItem {
  id: number; action: string; targetType: string | null; targetId: number | null; detail: string | null; createdAt: string;
  actor?: { id: number; fullName: string; email: string } | null;
}
export interface TagRow { id: number; name: string; slug: string; uses: number }
export interface BulkResult { done: number; failed: { id: number; message: string }[] }
