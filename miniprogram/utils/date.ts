export function getDaysTogether(startDate: string | Date): number {
  const start = new Date(startDate)
  const now = new Date()
  start.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

export function formatDate(date: Date | string, format = 'YYYY-MM-DD'): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
}

export function getBondLevel(days: number): { title: string; progress: number; nextThreshold: number } {
  const levels = [
    { title: '初遇', threshold: 0 },
    { title: '心动', threshold: 30 },
    { title: '热恋', threshold: 90 },
    { title: '默契', threshold: 180 },
    { title: '灵魂伴侣', threshold: 365 },
    { title: '永恒', threshold: 730 },
  ]

  let current = levels[0]
  let next = levels[1]

  for (let i = 0; i < levels.length; i++) {
    if (days >= levels[i].threshold) {
      current = levels[i]
      next = levels[i + 1] || { title: '永恒', threshold: levels[i].threshold + 365 }
    } else {
      break
    }
  }

  const progress = Math.min(100, ((days - current.threshold) / (next.threshold - current.threshold)) * 100)

  return {
    title: current.title,
    progress,
    nextThreshold: next.threshold,
  }
}
