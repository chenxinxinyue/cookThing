function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function getItems() {
  return wx.getStorageSync('items') || []
}

function saveItems(items) {
  wx.setStorageSync('items', items)
}

function addItem(item) {
  const items = getItems()
  items.unshift({
    id: generateId(),
    name: item.name,
    price: parseFloat(item.price),
    category: item.category || '',
    note: item.note || '',
    dateAdded: item.dateAdded || todayStr(),
    status: 'active'
  })
  saveItems(items)
  return items
}

function updateItem(id, updates) {
  const items = getItems()
  const idx = items.findIndex(i => i.id === id)
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates }
    saveItems(items)
  }
  return items
}

function deleteItem(id) {
  const items = getItems().filter(i => i.id !== id)
  saveItems(items)
  return items
}

function markExpired(id) {
  return updateItem(id, { status: 'expired' })
}

function markActive(id) {
  return updateItem(id, { status: 'active' })
}

const THEMES = [
  { name: '暖棕', primary: '#8b7355', accent: '#c9a87c', bg: '#f5f0eb', bgLight: '#faf7f2', mid: '#d4c5b2', tagBg: '#f5f0eb', tagColor: '#8b7355' },
  { name: '雾蓝', primary: '#6b8299', accent: '#8fa4b8', bg: '#e8eef3', bgLight: '#f0f4f8', mid: '#b0c4d4', tagBg: '#e8eef3', tagColor: '#6b8299' },
  { name: '灰绿', primary: '#7a8b7a', accent: '#9db09d', bg: '#e8efe5', bgLight: '#f0f4ee', mid: '#b0c4b0', tagBg: '#e8efe5', tagColor: '#7a8b7a' },
  { name: '藕粉', primary: '#9b7b8b', accent: '#c4a8b4', bg: '#f2e8ec', bgLight: '#f8f2f4', mid: '#d4bcc4', tagBg: '#f2e8ec', tagColor: '#9b7b8b' }
]

function getThemeIndex() {
  const idx = wx.getStorageSync('themeIndex')
  return idx !== undefined && idx !== '' ? idx : 0
}

function setThemeIndex(idx) {
  wx.setStorageSync('themeIndex', idx)
}

function getTheme() {
  return THEMES[getThemeIndex()]
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function daysBetween(dateStr) {
  const added = new Date(dateStr)
  const today = new Date(todayStr())
  const diff = today.getTime() - added.getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
}

function calcDailyCost(price, daysSinceAdded) {
  return parseFloat((price / daysSinceAdded).toFixed(2))
}

module.exports = {
  getItems,
  saveItems,
  addItem,
  updateItem,
  deleteItem,
  markExpired,
  markActive,
  todayStr,
  daysBetween,
  calcDailyCost,
  THEMES,
  getThemeIndex,
  setThemeIndex,
  getTheme
}
