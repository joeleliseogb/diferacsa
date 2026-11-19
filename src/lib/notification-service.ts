
'use client';

import { getUsers, type UserRole } from "./user-service";

export interface Notification {
    id: string;
    timestamp: any;
    userId?: string; // For specific user
    role?: UserRole; // For role-based notifications
    message: string;
    link?: string; // e.g., /orders/PED-001
    isRead: boolean;
}

// In-memory data store for notifications
let memoryNotifications: Notification[] = [
    {
        id: "notif-1",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        role: "Bodeguero",
        message: "Nuevo encargo #EN-001 para 'Taladro Percutor Bosch'. Verificar existencias.",
        link: "/reservations",
        isRead: false
    },
    {
        id: "notif-2",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        role: "Compras",
        message: "Falta de stock para el producto SKU-XYZ solicitado en el encargo #EN-001. Se requiere orden de compra.",
        link: "/purchases/new",
        isRead: false
    },
    {
        id: "notif-3",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        role: "Vendedor",
        message: "La mercancía para el encargo #EN-001 de Ana López ha sido recibida. Notificar al cliente.",
        link: "/reservations",
        isRead: true
    }
];

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    const users = await getUsers();
    const currentUser = users.find(u => u.id === userId);
    if (!currentUser) return [];

    const userNotifications = memoryNotifications.filter(n => 
        (n.userId === userId || n.role === currentUser.role)
    );

    return JSON.parse(JSON.stringify(userNotifications)).sort((a: Notification, b: Notification) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
    const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isRead: false,
    };
    memoryNotifications.push(newNotification);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = memoryNotifications.find(n => n.id === notificationId);
    if (notification) {
        notification.isRead = true;
    }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
    const users = await getUsers();
    const currentUser = users.find(u => u.id === userId);
    if (!currentUser) return;

    memoryNotifications.forEach(n => {
        if (n.userId === userId || n.role === currentUser.role) {
            n.isRead = true;
        }
    });
}
