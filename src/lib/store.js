import { writable, derived } from 'svelte/store'
import { getAllRecords, getByIndex } from './db'
import { DEFAULT_USERS, DEFAULT_TAGS, DEFAULT_REPLY_IDENTITIES } from '../constants'

function createCurrentUser() {
  const stored = localStorage.getItem('currentUser')
  const initial = stored ? JSON.parse(stored) : DEFAULT_USERS[0]
  const { subscribe, set, update } = writable(initial)
  
  return {
    subscribe,
    set: (user) => {
      localStorage.setItem('currentUser', JSON.stringify(user))
      set(user)
    },
    logout: () => {
      localStorage.removeItem('currentUser')
      set(null)
    }
  }
}

export const currentUser = createCurrentUser()
export const contents = writable([])
export const images = writable([])
export const fans = writable([])
export const comments = writable([])
export const analytics = writable([])

function createTags() {
  const stored = localStorage.getItem('appTags')
  const initial = stored ? JSON.parse(stored) : DEFAULT_TAGS
  const { subscribe, set, update } = writable(initial)

  function persist(value) {
    localStorage.setItem('appTags', JSON.stringify(value))
  }

  return {
    subscribe,
    update: (fn) => {
      update(prev => {
        const next = fn(prev)
        persist(next)
        return next
      })
    },
    set: (val) => {
      set(val)
      persist(val)
    },
    add: (tag) => {
      update(list => {
        const next = [...list, tag]
        persist(next)
        return next
      })
    },
    remove: (tagId) => {
      update(list => {
        const next = list.filter(t => t.id !== tagId)
        persist(next)
        return next
      })
    }
  }
}

export const tags = createTags()

function createSettings() {
  const stored = localStorage.getItem('appSettings')
  const initial = stored ? JSON.parse(stored) : {
    replyIdentities: DEFAULT_REPLY_IDENTITIES,
    showWithdrawn: false,
    viewMode: 'week',
    lastBackupReminder: null
  }
  const { subscribe, set, update } = writable(initial)
  
  return {
    subscribe,
    update: (fn) => {
      update(fn)
      const value = {}
      subscribe(v => Object.assign(value, v))()
      localStorage.setItem('appSettings', JSON.stringify(value))
    },
    set: (val) => {
      set(val)
      localStorage.setItem('appSettings', JSON.stringify(val))
    }
  }
}

export const settings = createSettings()

export const isAdmin = derived(currentUser, $user => {
  return $user && $user.role === 'admin'
})

export const users = writable(DEFAULT_USERS)

export async function loadAllData() {
  try {
    const [contentsData, imagesData, fansData, commentsData, analyticsData] = await Promise.all([
      getAllRecords('contents'),
      getAllRecords('images'),
      getAllRecords('fans'),
      getAllRecords('comments'),
      getAllRecords('analytics')
    ])
    contents.set(contentsData)
    images.set(imagesData)
    fans.set(fansData)
    comments.set(commentsData)
    analytics.set(analyticsData)
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

export const filteredContents = derived(
  [contents, settings],
  ([$contents, $settings]) => {
    if ($settings.showWithdrawn) return $contents
    return $contents.filter(c => c.status !== 'withdrawn')
  }
)
