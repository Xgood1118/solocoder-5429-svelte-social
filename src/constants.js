export const PLATFORMS = [
  { id: 'wechat', name: '微信公众号', color: '#07C160', icon: '💬' },
  { id: 'weibo', name: '微博', color: '#E6162D', icon: '📢' },
  { id: 'douyin', name: '抖音', color: '#000000', icon: '🎵' },
  { id: 'xiaohongshu', name: '小红书', color: '#FF2442', icon: '📕' },
  { id: 'bilibili', name: 'B站', color: '#FB7299', icon: '📺' },
  { id: 'zhihu', name: '知乎', color: '#0084FF', icon: '💡' }
]

export const CONTENT_STATUS = {
  DRAFT: { id: 'draft', name: '草稿', color: '#9CA3AF' },
  PENDING: { id: 'pending', name: '待审', color: '#F59E0B' },
  APPROVED: { id: 'approved', name: '已审', color: '#3B82F6' },
  PUBLISHED: { id: 'published', name: '已发', color: '#10B981' },
  WITHDRAWN: { id: 'withdrawn', name: '已撤', color: '#EF4444' }
}

export const STATUS_ORDER = ['draft', 'pending', 'approved', 'published', 'withdrawn']

export const USER_ROLES = {
  ADMIN: { id: 'admin', name: '管理员' },
  EDITOR: { id: 'editor', name: '编辑' }
}

export const DEFAULT_USERS = [
  { id: 'u1', name: '张小明', role: 'admin', avatar: '👨‍💼' },
  { id: 'u2', name: '李小红', role: 'editor', avatar: '👩‍💻' },
  { id: 'u3', name: '王小强', role: 'editor', avatar: '👨‍🎨' },
  { id: 'u4', name: '赵小美', role: 'editor', avatar: '👩‍🎨' },
  { id: 'u5', name: '陈小华', role: 'editor', avatar: '👨‍📊' }
]

export const DEFAULT_TAGS = [
  { id: 't1', name: '新品发布', color: '#8B5CF6' },
  { id: 't2', name: '促销活动', color: '#EC4899' },
  { id: 't3', name: '节日营销', color: '#F59E0B' },
  { id: 't4', name: '品牌故事', color: '#10B981' },
  { id: 't5', name: '用户案例', color: '#3B82F6' }
]

export const DEFAULT_REPLY_IDENTITIES = {
  wechat: { type: 'official', prefix: '' },
  weibo: { type: 'official', prefix: '' },
  douyin: { type: 'official', prefix: '' },
  xiaohongshu: { type: 'personal', prefix: '' },
  bilibili: { type: 'official', prefix: '官方' },
  zhihu: { type: 'official', prefix: '官方' }
}
