export interface User {
  _id: string
  _openid: string
  nickname: string
  avatar: string
  coupleId: string | null
  points: number
  createdAt: Date
  updatedAt: Date
}

export interface Couple {
  _id: string
  partner1Openid: string
  partner2Openid: string
  startDate: string
  bondValue: number
  createdAt: Date
}

export interface Diary {
  _id: string
  _openid: string
  coupleId: string
  content: string
  images: string[]
  location?: { name: string; latitude: number; longitude: number }
  weather?: { icon: string; temp: number }
  mood: string
  date: string
  isFavorite: boolean
  createdAt: Date
}

export interface Note {
  _id: string
  _openid: string
  coupleId: string
  content: string
  bgColor: string
  isPinned: boolean
  createdAt: Date
}

export interface Task {
  _id: string
  coupleId: string
  title: string
  points: number
  frequency: 'daily' | 'weekly'
  createdBy: string
  createdAt: Date
}

export interface TaskRecord {
  _id: string
  taskId: string
  _openid: string
  completedAt: Date
  streak: number
}

export interface Countdown {
  _id: string
  coupleId: string
  name: string
  targetDate: string
  type: 'anniversary' | 'birthday' | 'travel' | 'custom'
  remindBefore: number
  createdAt: Date
}

export interface Reward {
  _id: string
  coupleId: string
  title: string
  cost: number
  description: string
  createdAt: Date
}

export interface PointsLog {
  _id: string
  _openid: string
  amount: number
  type: 'earn' | 'spend'
  source: string
  createdAt: Date
}
