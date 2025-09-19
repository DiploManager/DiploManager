// Gestión de reservas
class ReservationManager {
    constructor() {
        this.currentReservations = [];
        this.selectedRoom = null;
    }

    async createReservation(reservationData) {
        try {
            const reservation = {
                ...reservationData,
                id: Date.now(),
                createdAt: new Date().toISOString(),
                createdBy: authManager.getCurrentUser().id,
                reservationStatus: 'confirmed',
                paymentStatus: 'pending'
            };

            await hotelDB.add('reservations', reservation);
            
            // Actualizar el estado de la sala
            if (reservationData.roomId) {
                const room = await hotelDB.get('rooms', reservationData.roomId);
                if (room) {
                    room.status = 'occupied';
                    await hotelDB.update('rooms', room);
                }
            }

            // Crear notificación
            await this.createNotification({
                type: 'reservation_created',
                title: 'Nueva Reserva',
                message: `Reserva creada para ${reservation.guestName}`,
                reservationId: reservation.id
            });

            return { success: true, reservation };
        } catch (error) {
            console.error('Error creating reservation:', error);
            return { success: false, message: 'Error al crear reserva' };
        }
    }

    async updateReservation(reservationId, updates) {
        try {
            const reservation = await hotelDB.get('reservations', reservationId);
            if (!reservation) {
                return { success: false, message: 'Reserva no encontrada' };
            }

            const updatedReservation = { ...reservation, ...updates };
            await hotelDB.update('reservations', updatedReservation);

            return { success: true, reservation: updatedReservation };
        } catch (error) {
            console.error('Error updating reservation:', error);
            return { success: false, message: 'Error al actualizar reserva' };
        }
    }

    async checkIn(reservationId) {
        try {
            const reservation = await hotelDB.get('reservations', reservationId);
            if (!reservation) {
                return { success: false, message: 'Reserva no encontrada' };
            }

            reservation.reservationStatus = 'checked-in';
            reservation.actualCheckIn = new Date().toISOString();
            await hotelDB.update('reservations', reservation);

            // Actualizar el estado de la sala
            const room = await hotelDB.get('rooms', reservation.roomId);
            if (room) {
                room.status = 'occupied';
                await hotelDB.update('rooms', room);
            }

            await this.createNotification({
                type: 'check_in',
                title: 'Check-in Realizado',
                message: `Check-in completado para ${reservation.guestName}`,
                reservationId: reservationId
            });

            return { success: true, reservation };
        } catch (error) {
            console.error('Error in check-in:', error);
            return { success: false, message: 'Error en check-in' };
        }
    }

    async checkOut(reservationId) {
        try {
            const reservation = await hotelDB.get('reservations', reservationId);
            if (!reservation) {
                return { success: false, message: 'Reserva no encontrada' };
            }

            if (reservation.paymentStatus !== 'paid') {
                return { success: false, message: 'No se puede hacer check-out sin pago completo' };
            }

            reservation.reservationStatus = 'checked-out';
            reservation.actualCheckOut = new Date().toISOString();
            await hotelDB.update('reservations', reservation);

            // Actualizar el estado de la sala a sucio
            const room = await hotelDB.get('rooms', reservation.roomId);
            if (room) {
                room.status = 'dirty';
                await hotelDB.update('rooms', room);
            }

            await this.createNotification({
                type: 'check_out',
                title: 'Check-out Realizado',
                message: `Check-out completado para ${reservation.guestName}`,
                reservationId: reservationId
            });

            return { success: true, reservation };
        } catch (error) {
            console.error('Error in check-out:', error);
            return { success: false, message: 'Error en check-out' };
        }
    }

    async processPayment(reservationId, paymentData) {
        try {
            const reservation = await hotelDB.get('reservations', reservationId);
            if (!reservation) {
                return { success: false, message: 'Reserva no encontrada' };
            }

            // Crear registro de pago
            const payment = {
                reservationId: reservationId,
                amount: paymentData.amount,
                method: paymentData.method || 'cash',
                date: new Date().toISOString(),
                processedBy: authManager.getCurrentUser().id,
                status: 'completed'
            };

            await hotelDB.add('payments', payment);

            // Actualizar el estado de pago de la reserva
            reservation.paymentStatus = 'paid';
            await hotelDB.update('reservations', reservation);

            await this.createNotification({
                type: 'payment_received',
                title: 'Pago Recibido',
                message: `Pago de $${paymentData.amount} procesado para ${reservation.guestName}`,
                reservationId: reservationId
            });

            return { success: true, payment, reservation };
        } catch (error) {
            console.error('Error processing payment:', error);
            return { success: false, message: 'Error al procesar pago' };
        }
    }

    async getReservationsByHotel(hotelId) {
        try {
            return await hotelDB.getByIndex('reservations', 'hotelId', hotelId);
        } catch (error) {
            console.error('Error getting reservations:', error);
            return [];
        }
    }

    async moveReservation(reservationId, newRoomId) {
        try {
            const reservation = await hotelDB.get('reservations', reservationId);
            if (!reservation) {
                return { success: false, message: 'Reserva no encontrada' };
            }

            const oldRoomId = reservation.roomId;
            reservation.roomId = newRoomId;
            await hotelDB.update('reservations', reservation);

            // Actualizar el estado de la habitación antigua
            if (oldRoomId) {
                const oldRoom = await hotelDB.get('rooms', oldRoomId);
                if (oldRoom) {
                    oldRoom.status = 'available';
                    await hotelDB.update('rooms', oldRoom);
                }
            }

            // Actualizar el nuevo estado de la habitación
            const newRoom = await hotelDB.get('rooms', newRoomId);
            if (newRoom) {
                newRoom.status = 'occupied';
                await hotelDB.update('rooms', newRoom);
            }

            return { success: true, reservation };
        } catch (error) {
            console.error('Error moving reservation:', error);
            return { success: false, message: 'Error al mover reserva' };
        }
    }

    async extendReservation(reservationId, newCheckOut) {
        try {
            const reservation = await hotelDB.get('reservations', reservationId);
            if (!reservation) {
                return { success: false, message: 'Reserva no encontrada' };
            }

            reservation.checkOut = newCheckOut;
            // Recalcular la cantidad total basada en nuevas fechas
            const nights = Math.ceil((new Date(newCheckOut) - new Date(reservation.checkIn)) / (1000 * 60 * 60 * 24));
            const room = await hotelDB.get('rooms', reservation.roomId);
            if (room) {
                reservation.totalAmount = nights * room.price;
            }

            await hotelDB.update('reservations', reservation);

            return { success: true, reservation };
        } catch (error) {
            console.error('Error extending reservation:', error);
            return { success: false, message: 'Error al extender reserva' };
        }
    }

    async createNotification(notificationData) {
        try {
            const notification = {
                ...notificationData,
                userId: authManager.getCurrentUser().id,
                read: false,
                createdAt: new Date().toISOString()
            };

            await hotelDB.add('notifications', notification);
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    formatReservationForCalendar(reservation, room) {
        const colors = {
            'paid': '#16a34a',      // Verde
            'pending': '#ea580c',   // Naranja
            'unpaid': '#dc2626'     // Rojo
        };

        return {
            id: reservation.id,
            title: `${reservation.guestName} - Hab. ${room?.number || 'N/A'}`,
            start: reservation.checkIn,
            end: reservation.checkOut,
            backgroundColor: colors[reservation.paymentStatus] || colors.unpaid,
            borderColor: colors[reservation.paymentStatus] || colors.unpaid,
            extendedProps: {
                reservation: reservation,
                room: room
            }
        };
    }
}

// Inicializar el gerente de reserva
const reservationManager = new ReservationManager();