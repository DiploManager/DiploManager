// Gestión de habitaciones
class RoomManager {
    constructor() {
        this.currentRooms = [];
        this.roomStates = {
            'available': { color: 'bg-green-500', text: 'Disponible', textColor: 'text-green-800' },
            'occupied': { color: 'bg-gray-500', text: 'Ocupada', textColor: 'text-gray-800' },
            'dirty': { color: 'bg-red-500', text: 'Sucia', textColor: 'text-red-800' },
            'maintenance': { color: 'bg-orange-500', text: 'Mantenimiento', textColor: 'text-orange-800' }
        };
    }

    async getRoomsByHotel(hotelId) {
        try {
            return await hotelDB.getByIndex('rooms', 'hotelId', hotelId);
        } catch (error) {
            console.error('Error getting rooms:', error);
            return [];
        }
    }

    async updateRoomStatus(roomId, newStatus) {
        try {
            const room = await hotelDB.get('rooms', roomId);
            if (!room) {
                return { success: false, message: 'Habitación no encontrada' };
            }

            room.status = newStatus;
            if (newStatus === 'available') {
                room.lastCleaned = new Date().toISOString();
            }

            await hotelDB.update('rooms', room);

            // Crear notificación para el estado de limpieza
            if (newStatus === 'dirty') {
                await this.createCleaningNotification(room);
            }

            return { success: true, room };
        } catch (error) {
            console.error('Error updating room status:', error);
            return { success: false, message: 'Error al actualizar estado' };
        }
    }

    async createRoom(roomData) {
        try {
            const room = {
                ...roomData,
                createdAt: new Date().toISOString(),
                status: 'available',
                lastCleaned: new Date().toISOString()
            };

            await hotelDB.add('rooms', room);
            return { success: true, room };
        } catch (error) {
            console.error('Error creating room:', error);
            return { success: false, message: 'Error al crear habitación' };
        }
    }

    async updateRoom(roomId, updates) {
        try {
            const room = await hotelDB.get('rooms', roomId);
            if (!room) {
                return { success: false, message: 'Habitación no encontrada' };
            }

            const updatedRoom = { ...room, ...updates };
            await hotelDB.update('rooms', updatedRoom);

            return { success: true, room: updatedRoom };
        } catch (error) {
            console.error('Error updating room:', error);
            return { success: false, message: 'Error al actualizar habitación' };
        }
    }

    async deleteRoom(roomId) {
        try {
            // Verifique si la habitación tiene reservas activas
            const reservations = await hotelDB.getByIndex('reservations', 'roomId', roomId);
            const activeReservations = reservations.filter(r => 
                r.reservationStatus === 'confirmed' || r.reservationStatus === 'checked-in'
            );

            if (activeReservations.length > 0) {
                return { success: false, message: 'No se puede eliminar habitación con reservas activas' };
            }

            await hotelDB.delete('rooms', roomId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting room:', error);
            return { success: false, message: 'Error al eliminar habitación' };
        }
    }

    async getRoomOccupancy(hotelId, startDate, endDate) {
        try {
            const rooms = await this.getRoomsByHotel(hotelId);
            const reservations = await hotelDB.getByIndex('reservations', 'hotelId', hotelId);

            const occupancyData = rooms.map(room => {
                const roomReservations = reservations.filter(r => 
                    r.roomId === room.id &&
                    new Date(r.checkIn) <= new Date(endDate) &&
                    new Date(r.checkOut) >= new Date(startDate) &&
                    r.reservationStatus !== 'cancelled'
                );

                return {
                    room: room,
                    reservations: roomReservations,
                    occupancyRate: this.calculateOccupancyRate(roomReservations, startDate, endDate)
                };
            });

            return occupancyData;
        } catch (error) {
            console.error('Error getting room occupancy:', error);
            return [];
        }
    }

    calculateOccupancyRate(reservations, startDate, endDate) {
        const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
        let occupiedDays = 0;

        reservations.forEach(reservation => {
            const checkIn = new Date(Math.max(new Date(reservation.checkIn), new Date(startDate)));
            const checkOut = new Date(Math.min(new Date(reservation.checkOut), new Date(endDate)));
            
            if (checkIn < checkOut) {
                occupiedDays += Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            }
        });

        return Math.min(100, (occupiedDays / totalDays) * 100);
    }

    async createCleaningNotification(room) {
        try {
            const notification = {
                type: 'cleaning_required',
                title: 'Limpieza Requerida',
                message: `La habitación ${room.number} necesita limpieza`,
                roomId: room.id,
                userId: authManager.getCurrentUser().id,
                read: false,
                createdAt: new Date().toISOString()
            };

            await hotelDB.add('notifications', notification);
        } catch (error) {
            console.error('Error creating cleaning notification:', error);
        }
    }

    getRoomStateInfo(status) {
        return this.roomStates[status] || this.roomStates.available;
    }

    async getAvailableRooms(hotelId, checkIn, checkOut) {
        try {
            const rooms = await this.getRoomsByHotel(hotelId);
            const reservations = await hotelDB.getByIndex('reservations', 'hotelId', hotelId);

            const availableRooms = rooms.filter(room => {
                // Verifique si la habitación está en mantenimiento
                if (room.status === 'maintenance') return false;

                // Verifique las reservas conflictivas
                const conflicts = reservations.filter(r => 
                    r.roomId === room.id &&
                    r.reservationStatus !== 'cancelled' &&
                    r.reservationStatus !== 'checked-out' &&
                    new Date(r.checkIn) < new Date(checkOut) &&
                    new Date(r.checkOut) > new Date(checkIn)
                );

                return conflicts.length === 0;
            });

            return availableRooms;
        } catch (error) {
            console.error('Error getting available rooms:', error);
            return [];
        }
    }
}

// Inicializar el gerente de la habitación
const roomManager = new RoomManager();