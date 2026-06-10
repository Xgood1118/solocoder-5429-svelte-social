export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateTime(date) {
  const d = new Date(date)
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function getWeekDates(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(formatDate(date))
  }
  return dates
}

export function getMonthDates(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const dates = []
  
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    dates.push({ date: formatDate(d), inMonth: false })
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i)
    dates.push({ date: formatDate(d), inMonth: true })
  }
  
  const remaining = 42 - dates.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    dates.push({ date: formatDate(d), inMonth: false })
  }
  
  return dates
}

export function isSameDay(date1, date2) {
  return formatDate(date1) === formatDate(date2)
}

export function isToday(date) {
  return isSameDay(date, new Date())
}

export function getDayOfWeek(date) {
  const days = ['一', '二', '三', '四', '五', '六', '日']
  const d = new Date(date)
  const day = d.getDay()
  return days[day === 0 ? 6 : day - 1]
}

export function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function parseMetricsText(text) {
  const metrics = {}
  const patterns = {
    views: /(阅读|阅读数|阅读量|浏览|浏览量|播放|播放数|播放量|PV|访问)\s*[:：]?\s*(\d+)/i,
    likes: /(点赞|点赞数|赞|👍|在看|喜欢|爱心)\s*[:：]?\s*(\d+)/i,
    comments: /(评论|评论数|回复|回复数|留言|讨论)\s*[:：]?\s*(\d+)/i,
    shares: /(转发|转发数|分享|分享数|转|转载)\s*[:：]?\s*(\d+)/i,
    favorites: /(收藏|收藏数|存|存图|⭐|加收藏)\s*[:：]?\s*(\d+)/i
  }
  
  Object.entries(patterns).forEach(([key, pattern]) => {
    const match = text.match(pattern)
    if (match) {
      metrics[key] = parseInt(match[2], 10)
    }
  })
  
  return metrics
}

export function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function isFridayAfternoon() {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  return day === 5 && hour >= 14
}

export function isEveningEight() {
  const now = new Date()
  return now.getHours() === 20
}
