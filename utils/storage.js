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
  calcDailyCost
}
