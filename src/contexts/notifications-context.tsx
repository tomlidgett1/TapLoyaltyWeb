"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from './auth-context'

export interface Notification {
  id: string
  message: string
  type: string
  customerId?: string
  dateCreated?: Date
  idSuffix?: string
  timestamp: Date
  read: boolean
  customerFirstName?: string
  customerFullName?: string
  customerProfilePictureUrl?: string
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  notificationsLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  notificationsLoading: true,
  markAsRead: async () => {},
  markAllAsRead: async () => {}
})

export const useNotifications = () => useContext(NotificationsContext)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  // Mark individual notification as read
  const markAsRead = async (id: string) => {
    if (!user?.uid) return
    
    try {
      await setDoc(doc(db, 'merchants', user.uid, 'notifications', id), {
        read: true
      }, { merge: true })
      
      // Update local state immediately
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.uid) return
    
    try {
      // Update all notifications in Firestore
      const promises = notifications
        .filter(n => !n.read)
        .map(notification => {
          const notificationRef = doc(db, 'merchants', user.uid, 'notifications', notification.id)
          return setDoc(notificationRef, { read: true }, { merge: true })
        })
      
      await Promise.all(promises)
      
      // Update local state immediately
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Single persistent notification listener
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([])
      setNotificationsLoading(false)
      return
    }

    console.log('🔔 Setting up persistent notifications listener for user:', user.uid)
    setNotificationsLoading(true)
    
    const notificationsRef = collection(db, 'merchants', user.uid, 'notifications')
    const notificationsQuery = query(notificationsRef, orderBy('dateCreated', 'desc'), limit(10))
    
    const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
      console.log('🔔 Notifications update:', snapshot.size, 'docs')
      
      if (snapshot.empty) {
        setNotifications([])
        setNotificationsLoading(false)
        return
      }

      // Process notifications immediately with basic data
      const basicNotifications = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          message: data.message || 'Notification',
          type: data.type || 'INFO',
          customerId: data.customerId,
          timestamp: data.dateCreated?.toDate() || new Date(),
          read: data.read || false,
          customerFullName: data.customerId ? `Customer ${data.customerId.substring(0, 4)}` : undefined,
          customerProfilePictureUrl: undefined
        }
      })

      // Set basic notifications immediately
      setNotifications(basicNotifications)
      setNotificationsLoading(false)

      // Enhance with customer data in background
      const customerIds = basicNotifications
        .filter(n => n.customerId)
        .map(n => n.customerId as string)

      if (customerIds.length > 0) {
        const customerData: Record<string, any> = {}
        
        for (const customerId of customerIds) {
          try {
            const customerDoc = await getDoc(doc(db, 'customers', customerId))
            if (customerDoc.exists()) {
              const data = customerDoc.data()
              customerData[customerId] = {
                fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || `Customer ${customerId.substring(0, 4)}`,
                profilePictureUrl: data.shareProfileWithMerchants === true ? data.profilePictureUrl : undefined
              }
            }
          } catch (error) {
            console.error('Error fetching customer:', customerId, error)
          }
        }

        // Update with customer data
        const enhancedNotifications = basicNotifications.map(notification => ({
          ...notification,
          customerFullName: notification.customerId && customerData[notification.customerId] 
            ? customerData[notification.customerId].fullName 
            : notification.customerFullName,
          customerProfilePictureUrl: notification.customerId && customerData[notification.customerId] 
            ? customerData[notification.customerId].profilePictureUrl 
            : undefined
        }))

        setNotifications(enhancedNotifications)
      }
    }, (error) => {
      console.error('Error listening to notifications:', error)
      setNotificationsLoading(false)
    })
    
    return () => {
      console.log('🔔 Cleaning up notifications listener')
      unsubscribe()
    }
  }, [user?.uid])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      notificationsLoading,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </NotificationsContext.Provider>
  )
} 