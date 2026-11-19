
'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Bell, CheckCheck } from 'lucide-react';
import { getNotificationsForUser, markNotificationAsRead, markAllNotificationsAsRead, type Notification } from '@/lib/notification-service';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function NotificationsPanel() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    
    // Hardcoded user ID for demonstration purposes
    const currentUserId = '1'; 

    useEffect(() => {
        const fetchNotifications = async () => {
            const userNotifications = await getNotificationsForUser(currentUserId);
            setNotifications(userNotifications);
        };
        
        if (isOpen) {
            fetchNotifications();
        }

        // Set up polling while the panel is open
        let intervalId: NodeJS.Timeout;
        if (isOpen) {
            intervalId = setInterval(fetchNotifications, 5000); // Poll every 5 seconds
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isOpen, currentUserId]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };
    
    const handleMarkAllAsRead = async () => {
        await markAllNotificationsAsRead(currentUserId);
        setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
                <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold text-sm">Notificaciones</h3>
                    <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                        <CheckCheck className="mr-2 h-4 w-4"/> Marcar todas como leídas
                    </Button>
                </div>
                <ScrollArea className="h-96">
                    {notifications.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground p-4">No tienes notificaciones.</p>
                    ) : (
                        <div className="divide-y">
                            {notifications.map(n => (
                                <div key={n.id} className={cn("p-3 hover:bg-muted/50", !n.isRead && "bg-primary/5")}>
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm pr-2">{n.message}</p>
                                        {!n.isRead && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMarkAsRead(n.id)} title="Marcar como leída">
                                                <div className="h-2 w-2 rounded-full bg-primary"></div>
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                       <span>{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: es })}</span>
                                        {n.link && <Link href={n.link} className="underline" onClick={() => setIsOpen(false)}>Ver detalle</Link>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
