import { api } from '../../utils/cloud'
import { getDaysTogether } from '../../utils/date'

const BADGE_DEFINITIONS = [
  { id: 'first_diary', name: '初见', icon: '📝', desc: '写下第一篇日记' },
  { id: 'diary_10', name: '记录达人', icon: '📚', desc: '累计写满10篇日记' },
  { id: 'diary_30', name: '时光作家', icon: '✍️', desc: '累计写满30篇日记' },
  { id: 'first_note', name: '纸短情长', icon: '💌', desc: '发出第一张小纸条' },
  { id: 'note_20', name: '传书鸽', icon: '🕊️', desc: '累计发送20张小纸条' },
  { id: 'checkin_7', name: '坚持一周', icon: '🔥', desc: '累计打卡7次' },
  { id: 'checkin_30', name: '月度之星', icon: '⭐', desc: '累计打卡30次' },
  { id: 'points_100', name: '小富翁', icon: '💰', desc: '累计获得100积分' },
  { id: 'days_30', name: '满月', icon: '🌙', desc: '在一起满30天' },
  { id: 'days_100', name: '百日', icon: '💯', desc: '在一起满100天' },
  { id: 'days_365', name: '周年', icon: '🎂', desc: '在一起满365天' },
  { id: 'first_exchange', name: '初次兑换', icon: '🎁', desc: '第一次兑换奖励' },
]

Page({
  data: {
    badges: [] as any[],
    unlockedCount: 0,
  },

  onLoad() {
    this.loadBadges()
  },

  async loadBadges() {
    const [statsRes, coupleRes] = await Promise.all([
      api('getUserStats'),
      api('getCoupleInfo'),
    ])

    let daysTogether = 0
    if (coupleRes.code === 0 && coupleRes.data) {
      daysTogether = getDaysTogether(coupleRes.data.startDate)
    }

    const stats = statsRes.code === 0 ? statsRes.data : {}

    const unlockedIds = new Set<string>()
    if ((stats.diaryCount || 0) >= 1) unlockedIds.add('first_diary')
    if ((stats.diaryCount || 0) >= 10) unlockedIds.add('diary_10')
    if ((stats.diaryCount || 0) >= 30) unlockedIds.add('diary_30')
    if ((stats.noteCount || 0) >= 1) unlockedIds.add('first_note')
    if ((stats.noteCount || 0) >= 20) unlockedIds.add('note_20')
    if ((stats.checkinCount || 0) >= 7) unlockedIds.add('checkin_7')
    if ((stats.checkinCount || 0) >= 30) unlockedIds.add('checkin_30')
    if ((stats.totalPoints || 0) >= 100) unlockedIds.add('points_100')
    if (daysTogether >= 30) unlockedIds.add('days_30')
    if (daysTogether >= 100) unlockedIds.add('days_100')
    if (daysTogether >= 365) unlockedIds.add('days_365')
    if (stats.hasExchange) unlockedIds.add('first_exchange')

    const badges = BADGE_DEFINITIONS.map(b => ({
      ...b,
      unlocked: unlockedIds.has(b.id),
    }))

    this.setData({ badges, unlockedCount: unlockedIds.size })
  },
})
