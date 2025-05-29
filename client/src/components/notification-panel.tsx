import * as React from "react"
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotificationHistory, type NotificationItem } from "@/hooks/use-notification-history"
import { cn } from "@/lib/utils"

function getNotificationIcon(type: NotificationItem['type']) {
  switch (type) {
    case 'destructive':
      return '❌'
    case 'success':
      return '✅'
    case 'warning':
      return '⚠️'
    default:
      return 'ℹ️'
  }
}

function getNotificationColor(type: NotificationItem['type']) {
  switch (type) {
    case 'destructive':
      return 'text-red-600 dark:text-red-400'
    case 'success':
      return 'text-green-600 dark:text-green-400'
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-blue-600 dark:text-blue-400'
  }
}

interface NotificationItemProps {
  notification: NotificationItem
  onMarkAsRead: (id: string) => void
}

function NotificationItemComponent({ notification, onMarkAsRead }: NotificationItemProps) {
  return (
    <div 
      className={cn(
        "p-3 border-l-2 transition-colors",
        notification.read 
          ? "bg-muted/30 border-l-muted-foreground/20" 
          : "bg-background border-l-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{getNotificationIcon(notification.type)}</span>
            {notification.title && (
              <div className={cn("font-medium text-sm", getNotificationColor(notification.type))}>
                {notification.title}
              </div>
            )}
            {!notification.read && (
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
            )}
          </div>
          {notification.description && (
            <div className="text-sm text-muted-foreground">
              {notification.description}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {format(notification.timestamp, 'MMM d, h:mm a')}
          </div>
        </div>
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onMarkAsRead(notification.id)}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationHistory()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between p-4 pb-2">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={clearAll}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-96">
              <div className="space-y-0">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <NotificationItemComponent 
                      notification={notification}
                      onMarkAsRead={markAsRead}
                    />
                    {index < notifications.length - 1 && (
                      <Separator className="mx-3" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}