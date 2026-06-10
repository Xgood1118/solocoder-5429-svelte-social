import { addRecord, putRecord, deleteRecord, getRecord, getAllRecords, bulkAdd, bulkPut } from './db'
import { generateId } from './utils'
import { contents, images, analytics as analyticsStore } from './store'

export async function createContent(data) {
  const content = {
    id: generateId(),
    title: data.title || '',
    content: data.content || '',
    platform: data.platform,
    date: data.date,
    scheduledTime: data.scheduledTime || '09:00',
    status: data.status || 'draft',
    authorId: data.authorId,
    tags: data.tags || [],
    coverImageId: data.coverImageId || null,
    mediaType: data.mediaType || 'image',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await addRecord('contents', content)
  contents.update(list => [...list, content])
  return content
}

export async function updateContent(id, data) {
  const existing = await getRecord('contents', id)
  if (!existing) return null
  
  const updated = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString()
  }
  await putRecord('contents', updated)
  contents.update(list => list.map(c => c.id === id ? updated : c))
  return updated
}

export async function deleteContent(id) {
  await deleteRecord('contents', id)
  contents.update(list => list.filter(c => c.id !== id))
}

export async function updateContentStatus(id, status) {
  return updateContent(id, { status })
}

export async function batchUpdateStatus(ids, status) {
  const updates = []
  for (const id of ids) {
    const existing = await getRecord('contents', id)
    if (existing) {
      const updated = { ...existing, status, updatedAt: new Date().toISOString() }
      updates.push(updated)
    }
  }
  if (updates.length > 0) {
    await bulkPut('contents', updates)
    contents.update(list => {
      const map = new Map(updates.map(u => [u.id, u]))
      return list.map(c => map.has(c.id) ? map.get(c.id) : c)
    })
  }
  return updates
}

export async function moveContent(id, newDate, newPlatform) {
  return updateContent(id, { date: newDate, platform: newPlatform })
}

export async function copyContent(id, newDate, newPlatform) {
  const existing = await getRecord('contents', id)
  if (!existing) return null
  
  const newData = {
    ...existing,
    date: newDate,
    platform: newPlatform,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  return createContent(newData)
}

export async function saveImage(id, base64Data) {
  const image = {
    id,
    data: base64Data,
    createdAt: new Date().toISOString()
  }
  await putRecord('images', image)
  images.update(list => {
    const existing = list.find(i => i.id === id)
    if (existing) {
      return list.map(i => i.id === id ? image : i)
    }
    return [...list, image]
  })
  return image
}

export async function getImage(id) {
  return getRecord('images', id)
}

export async function saveAnalytics(contentId, platform, metrics) {
  const id = `${contentId}_${platform}`
  const existing = await getRecord('analytics', id)
  
  const record = {
    id,
    contentId,
    platform,
    ...metrics,
    updatedAt: new Date().toISOString()
  }
  
  await putRecord('analytics', record)
  
  analyticsStore.update(list => {
    const existing = list.find(a => a.id === id)
    if (existing) {
      return list.map(a => a.id === id ? record : a)
    }
    return [...list, record]
  })
  
  return record
}

export async function getAnalyticsByContent(contentId) {
  const all = await getAllRecords('analytics')
  return all.filter(a => a.contentId === contentId)
}

export async function importContents(data) {
  if (!Array.isArray(data) || data.length === 0) return 0
  
  const toImport = data.map(item => ({
    id: item.id || generateId(),
    title: item.title || '',
    content: item.content || '',
    platform: item.platform,
    date: item.date,
    scheduledTime: item.scheduledTime || '09:00',
    status: item.status || 'draft',
    authorId: item.authorId || 'u1',
    tags: item.tags || [],
    coverImageId: item.coverImageId || null,
    mediaType: item.mediaType || 'image',
    notes: item.notes || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  }))
  
  await bulkAdd('contents', toImport)
  contents.update(list => [...list, ...toImport])
  return toImport.length
}
