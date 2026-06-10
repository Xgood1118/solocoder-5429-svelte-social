const DB_NAME = 'SocialSchedulerDB'
const DB_VERSION = 1

const STORES = {
  contents: { keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }, { name: 'platform', keyPath: 'platform' }, { name: 'status', keyPath: 'status' }, { name: 'authorId', keyPath: 'authorId' }] },
  images: { keyPath: 'id', indexes: [] },
  fans: { keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }, { name: 'platform', keyPath: 'platform' }] },
  comments: { keyPath: 'id', indexes: [{ name: 'contentId', keyPath: 'contentId' }, { name: 'platform', keyPath: 'platform' }] },
  analytics: { keyPath: 'id', indexes: [{ name: 'contentId', keyPath: 'contentId' }, { name: 'platform', keyPath: 'platform' }] },
  settings: { keyPath: 'key', indexes: [] }
}

let db = null

export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      Object.entries(STORES).forEach(([storeName, config]) => {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: config.keyPath })
          config.indexes.forEach(idx => {
            store.createIndex(idx.name, idx.keyPath, { unique: false })
          })
        }
      })
    }
  })
}

export function addRecord(storeName, data) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.add(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function putRecord(storeName, data) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function getRecord(storeName, id) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function getAllRecords(storeName) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export function deleteRecord(storeName, id) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function getByIndex(storeName, indexName, value) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export function clearStore(storeName) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function bulkAdd(storeName, records) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    records.forEach(record => store.add(record))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export function bulkPut(storeName, records) {
  return new Promise(async (resolve, reject) => {
    await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    records.forEach(record => store.put(record))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
