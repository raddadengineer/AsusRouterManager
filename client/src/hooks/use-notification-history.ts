import * as React from "react"

export interface NotificationItem {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  timestamp: Date
  type: 'default' | 'destructive' | 'success' | 'warning'
  read: boolean
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
}

const NOTIFICATION_STORAGE_KEY = 'router-app-notifications'
const MAX_NOTIFICATIONS = 50

function loadNotificationsFromStorage(): NotificationItem[] {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }))
    }
  } catch (error) {
    console.warn('Failed to load notifications from storage:', error)
  }
  return []
}

function saveNotificationsToStorage(notifications: NotificationItem[]) {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications))
  } catch (error) {
    console.warn('Failed to save notifications to storage:', error)
  }
}

let notificationState: NotificationState = {
  notifications: loadNotificationsFromStorage(),
  unreadCount: 0
}

// Calculate initial unread count
notificationState.unreadCount = notificationState.notifications.filter(n => !n.read).length

const listeners: Array<(state: NotificationState) => void> = []

function notifyListeners() {
  listeners.forEach(listener => listener(notificationState))
}

export function addNotificationToHistory(notification: Omit<NotificationItem, 'timestamp' | 'read'>) {
  const newNotification: NotificationItem = {
    ...notification,
    timestamp: new Date(),
    read: false
  }

  notificationState = {
    notifications: [newNotification, ...notificationState.notifications].slice(0, MAX_NOTIFICATIONS),
    unreadCount: notificationState.unreadCount + 1
  }

  saveNotificationsToStorage(notificationState.notifications)
  notifyListeners()
}

export function markNotificationAsRead(id: string) {
  const notification = notificationState.notifications.find(n => n.id === id)
  if (notification && !notification.read) {
    notification.read = true
    notificationState = {
      ...notificationState,
      unreadCount: Math.max(0, notificationState.unreadCount - 1)
    }
    saveNotificationsToStorage(notificationState.notifications)
    notifyListeners()
  }
}

export function markAllNotificationsAsRead() {
  notificationState.notifications.forEach(n => n.read = true)
  notificationState = {
    ...notificationState,
    unreadCount: 0
  }
  saveNotificationsToStorage(notificationState.notifications)
  notifyListeners()
}

export function clearAllNotifications() {
  notificationState = {
    notifications: [],
    unreadCount: 0
  }
  localStorage.removeItem(NOTIFICATION_STORAGE_KEY)
  notifyListeners()
}

export function useNotificationHistory() {
  const [state, setState] = React.useState<NotificationState>(notificationState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    clearAll: clearAllNotifications
  }
}