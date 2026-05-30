const storage = require('../../utils/storage.js')

Page({
  data: {
    csvText: '',
    parsedItems: [],
    selectedIds: [],
    importResult: ''
  },

  onCSVInput(e) {
    this.setData({ csvText: e.detail.value })
  },

  // Parse CSV text
  parseCSV(text) {
    if (!text.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) {
      wx.showToast({ title: '至少需要标题行和一行数据', icon: 'none' })
      return
    }

    // Parse CSV with quote handling
    function parseLine(line) {
      const result = []
      let current = ''
      let inQuotes = false
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
      result.push(current.trim())
      return result
    }

    const header = parseLine(lines[0])
    const rows = lines.slice(1).filter(l => l.trim())

    // Find column indices
    const catIdx = header.findIndex(h =>
      h.includes('一级分类') || h.includes('分类') || h.includes('类别')
    )
    const priceIdx = header.findIndex(h =>
      h.includes('金额') || h.includes('价格') || h.includes('元')
    )
    const noteIdx = header.findIndex(h =>
      h.includes('备注') || h.includes('说明') || h.includes('描述')
    )

    if (priceIdx === -1) {
      wx.showToast({ title: '未找到"金额"列，标题: ' + header.join(', '), icon: 'none' })
      return
    }

    const parsedItems = []
    for (const line of rows) {
      const cols = parseLine(line)
      const price = parseFloat(cols[priceIdx])
      if (isNaN(price) || price <= 50) continue

      const hasNote = noteIdx !== -1 && cols[noteIdx] && cols[noteIdx].trim()
      const name = hasNote
        ? (catIdx !== -1 && cols[catIdx] ? cols[catIdx] : '导入物品')
        : '未记录'

      parsedItems.push({
        name: name,
        category: catIdx !== -1 && cols[catIdx] ? cols[catIdx] : '',
        price: price,
        note: noteIdx !== -1 ? (cols[noteIdx] || '').trim() : '',
        dateAdded: storage.todayStr(),
        _raw: cols.join(', ')
      })
    }

    if (parsedItems.length === 0) {
      wx.showToast({ title: '没有解析到有效物品', icon: 'none' })
      return
    }

    this.setData({ parsedItems, selectedIds: [] })
    wx.showToast({ title: '解析到 ' + parsedItems.length + ' 件物品', icon: 'success' })
  },

  // Toggle selection
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id
    let selectedIds = this.data.selectedIds
    const idx = selectedIds.indexOf(id)
    if (idx > -1) {
      selectedIds.splice(idx, 1)
    } else {
      selectedIds.push(id)
    }
    this.setData({ selectedIds })
  },

  // Toggle all
  toggleAll() {
    if (this.data.selectedIds.length === this.data.parsedItems.length) {
      this.setData({ selectedIds: [] })
    } else {
      this.setData({ selectedIds: this.data.parsedItems.map((_, i) => i) })
    }
  },

  // Import selected
  importSelected() {
    if (this.data.selectedIds.length === 0) {
      wx.showToast({ title: '请先选择物品', icon: 'none' })
      return
    }

    let count = 0
    for (const idx of this.data.selectedIds) {
      const item = this.data.parsedItems[idx]
      storage.addItem(item)
      count++
    }

    this.setData({
      importResult: count + ' 件物品已导入',
      parsedItems: [],
      selectedIds: []
    })
    wx.showToast({ title: '成功导入 ' + count + ' 件物品', icon: 'success' })
  },

  // Choose file from WeChat message
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'xlsx', 'xls'],
      success: (res) => {
        const file = res.tempFiles[0]
        const fs = wx.getFileSystemManager()
        const content = fs.readFileSync(file.path, 'utf8')
        this.parseCSV(content)
      },
      fail: (err) => {
        if (err.errMsg.includes('cancel')) return
        wx.showToast({ title: '文件读取失败，请尝试粘贴 CSV 内容', icon: 'none' })
      }
    })
  },

  // Parse button
  onParse() {
    this.parseCSV(this.data.csvText)
  }
})
