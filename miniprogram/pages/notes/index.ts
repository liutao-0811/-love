import { api } from '../../utils/cloud'
import { formatDate } from '../../utils/date'
import { getLayout } from '../../utils/layout'

Page({
  data: {
    notes: [] as any[],
    showEdit: false,
    editContent: '',
    editBgColor: '#FFF8E7',
    bgColors: ['#FFF8E7', '#FFE8E8', '#E8F4FD', '#E8FFE8', '#F3E8FF', '#FFF0E0'],
    headerPaddingTop: 0,
    headerPaddingRight: 0,
  },

  onLoad() {
    const layout = getLayout()
    this.setData({
      headerPaddingTop: layout.headerPaddingTop,
      headerPaddingRight: layout.headerPaddingRight,
    })
    this.loadNotes()
  },

  onShow() {
    this.loadNotes()
  },

  async loadNotes() {
    const res = await api('getNotes')
    if (res.code === 0) {
      const notes = res.data.map((n: any) => ({
        ...n,
        timeStr: formatDate(n.createdAt, 'MM-DD HH:mm'),
        _rotate: (Math.random() * 6 - 3).toFixed(1),
      }))
      this.setData({ notes })
    }
  },

  noop() {},

  showEditor() {
    this.setData({ showEdit: true, editContent: '', editBgColor: '#FFF8E7' })
  },

  hideEditor() {
    this.setData({ showEdit: false })
  },

  onEditInput(e: any) {
    this.setData({ editContent: e.detail.value })
  },

  selectBgColor(e: any) {
    this.setData({ editBgColor: e.currentTarget.dataset.color })
  },

  async sendNote() {
    if (!this.data.editContent.trim()) return
    const res = await api('createNote', {
      content: this.data.editContent,
      bgColor: this.data.editBgColor,
    })
    if (res.code === 0) {
      wx.showToast({ title: '发送成功', icon: 'success' })
      this.hideEditor()
      this.loadNotes()
    }
  },

  onLongPress(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showActionSheet({
      itemList: ['置顶', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) this.togglePin(id)
        if (res.tapIndex === 1) this.deleteNote(id)
      },
    })
  },

  async togglePin(id: string) {
    const res = await api('toggleNotePin', { noteId: id })
    if (res.code === 0) {
      wx.showToast({ title: res.msg || '操作成功', icon: 'success' })
      this.loadNotes()
    }
  },

  async deleteNote(id: string) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张纸条吗？',
      confirmColor: '#E8A598',
      success: async (res) => {
        if (res.confirm) {
          const result = await api('deleteNote', { noteId: id })
          if (result.code === 0) {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadNotes()
          }
        }
      },
    })
  },
})
