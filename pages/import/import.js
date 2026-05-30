const storage = require('../../utils/storage.js')

Page({
  data: {
    csvText: '',
    parsedItems: [],
    selectedIds: [],
    importResult: '',
    parseLog: ''
  },

  onCSVInput(e) {
    this.setData({ csvText: e.detail.value })
  },

  parseCSV(text) {
    if (!text.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    // Remove BOM
    text = text.replace(/^﻿/, '')

    // Detect delimiter: count commas vs tabs in first non-empty line
    const firstLine = text.trim().split(/\r?\n/)[0]
    const commaCount = (firstLine.match(/,/g) || []).length
    const tabCount = (firstLine.match(/\t/g) || []).length
    const delimiter = tabCount > commaCount ? '\t' : ','

    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) {
      this.setData({ parseLog: '行数不足：至少需要标题行和一行数据' })
      wx.showToast({ title: '至少需要标题行和一行数据', icon: 'none' })
      return
    }

    function parseLine(line) {
      const result = []
      let current = ''
      let inQuotes = false
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes
        } else if (ch === delimiter && !inQuotes) {
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

    // Find columns - try exact match first, then loose
    const catIdx = header.findIndex(h =>
      h.includes('一级分类') || h.includes('分类') || h.includes('类别')
    )
    const priceIdx = header.findIndex(h =>
      h.includes('金额') || h.includes('价格') || h.includes('元')
    )
    const noteIdx = header.findIndex(h =>
      h.includes('备注') || h.includes('说明') || h.includes('描述') || h.includes('摘要')
    )

    const logLines = []
    logLines.push('标题列: ' + header.join(' | '))
    logLines.push('分隔符: ' + (delimiter === '\t' ? 'Tab' : '逗号'))
    logLines.push('数据行数: ' + rows.length)
    logLines.push('金额列: ' + (priceIdx !== -1 ? '第' + (priceIdx + 1) + '列「' + header[priceIdx] + '」' : '未找到'))
    logLines.push('分类列: ' + (catIdx !== -1 ? '第' + (catIdx + 1) + '列「' + header[catIdx] + '」' : '未找到'))
    logLines.push('备注列: ' + (noteIdx !== -1 ? '第' + (noteIdx + 1) + '列「' + header[noteIdx] + '」' : '未找到'))
    logLines.push('过滤规则: 金额 ≤ 50 元的跳过')

    if (priceIdx === -1) {
      logLines.push('错误: 未找到金额列，请确认 CSV 包含"金额"或"价格"列')
      this.setData({ parseLog: logLines.join('\n'), parsedItems: [], selectedIds: [] })
      wx.showToast({ title: '未找到金额列', icon: 'none' })
      return
    }

    const parsedItems = []
    let filteredCount = 0
    let badPriceCount = 0

    for (let i = 0; i < rows.length; i++) {
      const cols = parseLine(rows[i])
      if (cols.length <= priceIdx) { badPriceCount++; continue }

      const price = parseFloat(cols[priceIdx].replace(/[¥元,，\s]/g, ''))
      if (isNaN(price) || price <= 0) { badPriceCount++; continue }
      if (price <= 50) { filteredCount++; continue }

      const hasNote = noteIdx !== -1 && noteIdx < cols.length && cols[noteIdx] && cols[noteIdx].trim()
      const name = hasNote
        ? (catIdx !== -1 && catIdx < cols.length && cols[catIdx] ? cols[catIdx].trim() : '导入物品')
        : '未记录'

      parsedItems.push({
        name: name,
        category: catIdx !== -1 && catIdx < cols.length ? (cols[catIdx] || '').trim() : '',
        price: price,
        note: noteIdx !== -1 && noteIdx < cols.length ? (cols[noteIdx] || '').trim() : '',
        dateAdded: storage.todayStr(),
        _raw: cols.join(', ')
      })
    }

    logLines.push('')
    logLines.push('结果: 有效 ' + parsedItems.length + ' 件 | 金额≤50过滤 ' + filteredCount + ' 件 | 无金额跳过 ' + badPriceCount + ' 件')

    this.setData({ parsedItems, selectedIds: [], parseLog: logLines.join('\n') })

    if (parsedItems.length === 0) {
      wx.showToast({ title: '没有符合条件物品（需金额>50元）', icon: 'none' })
    } else {
      wx.showToast({ title: '解析到 ' + parsedItems.length + ' 件物品', icon: 'success' })
    }
  },

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

  toggleAll() {
    if (this.data.selectedIds.length === this.data.parsedItems.length) {
      this.setData({ selectedIds: [] })
    } else {
      this.setData({ selectedIds: this.data.parsedItems.map((_, i) => i) })
    }
  },

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
      selectedIds: [],
      parseLog: ''
    })
    wx.showToast({ title: '成功导入 ' + count + ' 件物品', icon: 'success' })
  },

  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'xlsx', 'xls'],
      success: (res) => {
        const file = res.tempFiles[0]
        const fs = wx.getFileSystemManager()
        try {
          const content = fs.readFileSync(file.path, 'utf8')
          this.setData({ csvText: content })
          this.parseCSV(content)
        } catch (e) {
          wx.showToast({ title: '读取失败，请用粘贴方式导入', icon: 'none' })
        }
      },
      fail: (err) => {
        if (err.errMsg.includes('cancel')) return
        wx.showToast({ title: '文件读取失败，请尝试粘贴 CSV 内容', icon: 'none' })
      }
    })
  },

  onParse() {
    this.parseCSV(this.data.csvText)
  }
})
