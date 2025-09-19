// Gestión de notificaciones
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
    }

    async getNotifications(userId) {
        try {
            const notifications = await hotelDB.getByIndex('notifications', 'userId', userId);
            this.notifications = notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            this.updateUnreadCount();
            return this.notifications;
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    async markAsRead(notificationId) {
        try {
            const notification = await hotelDB.get('notifications', notificationId);
            if (notification) {
                notification.read = true;
                await hotelDB.update('notifications', notification);
                this.updateUnreadCount();
                return { success: true };
            }
            return { success: false, message: 'Notificación no encontrada' };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, message: 'Error al marcar como leída' };
        }
    }

    async markAllAsRead(userId) {
        try {
            const notifications = await hotelDB.getByIndex('notifications', 'userId', userId);
            const unreadNotifications = notifications.filter(n => !n.read);
            
            for (const notification of unreadNotifications) {
                notification.read = true;
                await hotelDB.update('notifications', notification);
            }
            
            this.updateUnreadCount();
            return { success: true };
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return { success: false, message: 'Error al marcar todas como leídas' };
        }
    }

    async createNotification(notificationData) {
        try {
            const notification = {
                ...notificationData,
                read: false,
                createdAt: new Date().toISOString()
            };

            await hotelDB.add('notifications', notification);
            this.updateUnreadCount();
            return { success: true, notification };
        } catch (error) {
            console.error('Error creating notification:', error);
            return { success: false, message: 'Error al crear notificación' };
        }
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateNotificationBadge();
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'reservation_created': 'fas fa-calendar-plus',
            'check_in': 'fas fa-sign-in-alt',
            'check_out': 'fas fa-sign-out-alt',
            'payment_received': 'fas fa-credit-card',
            'cleaning_required': 'fas fa-broom',
            'maintenance_required': 'fas fa-tools',
            'system': 'fas fa-cog'
        };
        return icons[type] || 'fas fa-bell';
    }

    formatNotificationTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Ahora';
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
        return `${Math.floor(diffInMinutes / 1440)}d`;
    }

    async scheduleCheckInReminders() {
        try {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const currentUser = authManager.getCurrentUser();
            const currentHotel = hotelManager.getCurrentHotel();
            
            if (!currentHotel) return;

            const reservations = await reservationManager.getReservationsByHotel(currentHotel.id);
            const tomorrowCheckIns = reservations.filter(r => 
                r.checkIn.startsWith(tomorrowStr) && r.reservationStatus === 'confirmed'
            );

            for (const reservation of tomorrowCheckIns) {
                await this.createNotification({
                    type: 'check_in_reminder',
                    title: 'Recordatorio Check-in',
                    message: `Check-in mañana: ${reservation.guestName}`,
                    userId: currentUser.id,
                    reservationId: reservation.id
                });
            }
        } catch (error) {
            console.error('Error scheduling check-in reminders:', error);
        }
    }
}

// Inicializar el administrador de notificaciones
const notificationManager = new NotificationManager();