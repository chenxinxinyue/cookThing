const storage = require('../../utils/storage.js')

Page({
  data: {
    items: [],
    activeItems: [],
    expiredItems: [],
    filteredActive: [],
    filteredExpired: [],
    filter: 'active',
    showAddModal: false,
    showDetailModal: false,
    detailItem: null,
    isEditing: false,
    editForm: {},
    form: {
      name: '',
      price: '',
      category: '',
      note: '',
      dateAdded: storage.todayStr()
    },
    totalDailyCost: 0,
    totalPrice: 0,
    activeCount: 0,
    searchTerm: '',
    sortBy: 'date',
    sortOrder: 'desc'
  },

  onShow() {
    this.loadItems()
  },

  loadItems() {
    const items = storage.getItems()
    const activeItems = items
      .filter(i => i.status === 'active')
      .map(i => ({
        ...i,
        days: storage.daysBetween(i.dateAdded),
        dailyCost: storage.calcDailyCost(i.price, storage.daysBetween(i.dateAdded))
      }))
    const expiredItems = items.filter(i => i.status === 'expired')

    const totalDailyCost = activeItems.reduce((sum, item) => sum + item.dailyCost, 0)
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0)

    this.setData({
      items,
      activeItems,
      expiredItems,
      totalDailyCost: parseFloat(totalDailyCost.toFixed(2)),
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      activeCount: activeItems.length
    }, () => {
      this.applyFilter()
    })
  },

  // Search + Sort + Filter
  applyFilter() {
    const { filter, searchTerm, sortBy, sortOrder } = this.data
    const source = filter === 'active' ? this.data.activeItems : this.data.expiredItems

    let result = source
    if (searchTerm.trim()) {
      const kw = searchTerm.trim().toLowerCase()
      result = source.filter(i =>
        i.name.toLowerCase().includes(kw) ||
        (i.category && i.category.toLowerCase().includes(kw)) ||
        (i.note && i.note.toLowerCase().includes(kw))
      )
    }

    result = [...result].sort((a, b) => {
      let va, vb
      switch (sortBy) {
        case 'price':
          va = a.price; vb = b.price; break
        case 'daily':
          va = a.dailyCost || 0; vb = b.dailyCost || 0; break
        case 'date':
        default:
          va = a.dateAdded; vb = b.dateAdded; break
      }
      if (sortOrder === 'asc') return va > vb ? 1 : -1
      return va < vb ? 1 : -1
    })

    const key = filter === 'active' ? 'filteredActive' : 'filteredExpired'
    this.setData({ [key]: result })
  },

  onSearchInput(e) {
    this.setData({ searchTerm: e.detail.value }, () => this.applyFilter())
  },

  clearSearch() {
    this.setData({ searchTerm: '' }, () => this.applyFilter())
  },

  // Filter
  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter, searchTerm: '' }, () => this.applyFilter())
  },

  // Sort
  toggleSort() {
    const sorts = ['date', 'price', 'daily']
    const labels = ['日期', '价格', '日均']
    wx.showActionSheet({
      itemList: ['按日期', '按价格', '按日均成本'],
      success: (res) => {
        const sortBy = sorts[res.tapIndex]
        const sortOrder = this.data.sortBy === sortBy && this.data.sortOrder === 'desc' ? 'asc' : 'desc'
        this.setData({ sortBy, sortOrder }, () => this.applyFilter())
      }
    })
  },

  // Add modal
  openAddModal() {
    this.setData({
      showAddModal: true,
      form: {
        name: '',
        price: '',
        category: '',
        note: '',
        dateAdded: storage.todayStr()
      }
    })
  },

  closeAddModal() {
    this.setData({ showAddModal: false })
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'form.dateAdded': e.detail.value })
  },

  submitAdd() {
    const { name, price } = this.data.form
    if (!name.trim()) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' })
      return
    }
    if (!price || parseFloat(price) <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' })
      return
    }

    storage.addItem(this.data.form)
    this.setData({ showAddModal: false })
    this.loadItems()
    wx.showToast({ title: '添加成功', icon: 'success' })
  },

  // Detail modal
  openDetail(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i.id === id)
    if (item) {
      const days = storage.daysBetween(item.dateAdded)
      const dailyCost = storage.calcDailyCost(item.price, days)
      this.setData({
        showDetailModal: true,
        detailItem: { ...item, days, dailyCost },
        isEditing: false
      })
    }
  },

  closeDetail() {
    this.setData({ showDetailModal: false, detailItem: null, isEditing: false })
  },

  // Edit mode
  startEdit() {
    this.setData({
      isEditing: true,
      editForm: {
        name: this.data.detailItem.name,
        price: this.data.detailItem.price,
        category: this.data.detailItem.category || '',
        note: this.data.detailItem.note || '',
        dateAdded: this.data.detailItem.dateAdded
      }
    })
  },

  cancelEdit() {
    this.setData({ isEditing: false })
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['editForm.' + field]: e.detail.value })
  },

  onEditDateChange(e) {
    this.setData({ 'editForm.dateAdded': e.detail.value })
  },

  saveEdit() {
    const { name, price } = this.data.editForm
    if (!name.trim()) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' })
      return
    }
    if (!price || parseFloat(price) <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' })
      return
    }

    const id = this.data.detailItem.id
    storage.updateItem(id, {
      name: name.trim(),
      price: parseFloat(price),
      category: this.data.editForm.category.trim(),
      note: this.data.editForm.note.trim(),
      dateAdded: this.data.editForm.dateAdded
    })

    const updated = storage.getItems().find(i => i.id === id)
    const days = storage.daysBetween(updated.dateAdded)
    this.setData({
      detailItem: { ...updated, days, dailyCost: storage.calcDailyCost(updated.price, days) },
      isEditing: false
    })
    this.loadItems()
    wx.showToast({ title: '修改成功', icon: 'success' })
  },

  // Actions
  toggleStatus(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i.id === id)
    if (item.status === 'active') {
      storage.markExpired(id)
    } else {
      storage.markActive(id)
    }
    this.loadItems()
    if (this.data.showDetailModal) {
      const updated = storage.getItems().find(i => i.id === id)
      const days = storage.daysBetween(updated.dateAdded)
      this.setData({
        detailItem: { ...updated, days, dailyCost: storage.calcDailyCost(updated.price, days) }
      })
    }
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
      success: (res) => {
        if (res.confirm) {
          storage.deleteItem(id)
          this.loadItems()
          if (this.data.showDetailModal && this.data.detailItem.id === id) {
            this.closeDetail()
          }
        }
      }
    })
  },

  // Long press action sheet
  onLongPress(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i.id === id)
    wx.showActionSheet({
      itemList: [
        item.status === 'active' ? '标记为已失效' : '恢复为生效中',
        '删除物品'
      ],
      itemColor: '#4a4a4a',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.toggleStatus(e)
        } else if (res.tapIndex === 1) {
          this.deleteItem(e)
        }
      }
    })
  },

  stopPropagation() {}
})
