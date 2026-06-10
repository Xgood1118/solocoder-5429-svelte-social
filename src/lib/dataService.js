import { addRecord, putRecord, deleteRecord, getRecord, getAllRecords, getByIndex, bulkAdd, bulkPut } from './db'
import { generateId } from './utils'
import { fans, comments } from './store'

export async function addFansData(platform, date, totalFans, newFans) {
  const record = {
    id: generateId(),
    platform,
    date,
    totalFans: Number(totalFans),
    newFans: Number(newFans),
    createdAt: new Date().toISOString()
  }
  await addRecord('fans', record)
  fans.update(list => [...list, record])
  return record
}

export async function updateFansData(id, data) {
  const existing = await getRecord('fans', id)
  if (!existing) return null
  
  const updated = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString()
  }
  await putRecord('fans', updated)
  fans.update(list => list.map(f => f.id === id ? updated : f))
  return updated
}

export async function getFansByPlatform(platform) {
  return getByIndex('fans', 'platform', platform)
}

export async function getFansByDate(date) {
  return getByIndex('fans', 'date', date)
}

export async function getAllFansData() {
  return getAllRecords('fans')
}

export async function addComment(contentId, platform, commentData) {
  const comment = {
    id: generateId(),
    contentId,
    platform,
    userAvatar: commentData.userAvatar || '👤',
    userName: commentData.userName || '匿名用户',
    content: commentData.content,
    isReplied: commentData.isReplied || false,
    replyContent: commentData.replyContent || '',
    replyIdentity: commentData.replyIdentity || '',
    createdAt: commentData.createdAt || new Date().toISOString(),
    repliedAt: commentData.repliedAt || null
  }
  await addRecord('comments', comment)
  comments.update(list => [...list, comment])
  return comment
}

export async function updateComment(id, data) {
  const existing = await getRecord('comments', id)
  if (!existing) return null
  
  const updated = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString()
  }
  await putRecord('comments', updated)
  comments.update(list => list.map(c => c.id === id ? updated : c))
  return updated
}

export async function replyToComment(id, replyContent, replyIdentity) {
  return updateComment(id, {
    isReplied: true,
    replyContent,
    replyIdentity,
    repliedAt: new Date().toISOString()
  })
}

export async function deleteComment(id) {
  await deleteRecord('comments', id)
  comments.update(list => list.filter(c => c.id !== id))
}

export async function getCommentsByContent(contentId) {
  return getByIndex('comments', 'contentId', contentId)
}

export async function getCommentsByPlatform(platform) {
  return getByIndex('comments', 'platform', platform)
}

export async function importFansData(data) {
  if (!Array.isArray(data) || data.length === 0) return 0
  
  const toImport = data.map(item => ({
    id: item.id || generateId(),
    platform: item.platform,
    date: item.date,
    totalFans: Number(item.totalFans) || 0,
    newFans: Number(item.newFans) || 0,
    createdAt: item.createdAt || new Date().toISOString()
  }))
  
  await bulkAdd('fans', toImport)
  fans.update(list => [...list, ...toImport])
  return toImport.length
}

export async function importCommentsData(data) {
  if (!Array.isArray(data) || data.length === 0) return 0
  
  const toImport = data.map(item => ({
    id: item.id || generateId(),
    contentId: item.contentId,
    platform: item.platform,
    userAvatar: item.userAvatar || '👤',
    userName: item.userName || '匿名用户',
    content: item.content || '',
    isReplied: item.isReplied || false,
    replyContent: item.replyContent || '',
    replyIdentity: item.replyIdentity || '',
    createdAt: item.createdAt || new Date().toISOString(),
    repliedAt: item.repliedAt || null
  }))
  
  await bulkAdd('comments', toImport)
  comments.update(list => [...list, ...toImport])
  return toImport.length
}
