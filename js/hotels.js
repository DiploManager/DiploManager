// Gestión hotelera
class HotelManager {
    constructor() {
        this.currentHotel = null;
    }

    async createHotel(hotelData) {
        try {
            const hotel = {
                ...hotelData,
                createdAt: new Date().toISOString(),
                active: true,
                totalRooms: parseInt(hotelData.totalRooms) || 0
            };

            const result = await window.hotelDB.add('hotels', hotel);
            
            // Crear habitaciones para el nuevo hotel
            if (hotel.totalRooms > 0) {
                await this.createRoomsForHotel(result, hotel.totalRooms);
            }
            
            return { success: true, hotel: { ...hotel, id: result } };
        } catch (error) {
            console.error('Error creating hotel:', error);
            return { success: false, message: 'Error al crear hotel' };
        }
    }

    async createRoomsForHotel(hotelId, totalRooms) {
        try {
            const roomTypes = ['Standard', 'Superior', 'Deluxe', 'Suite'];
            const basePrice = 150000;
            
            for (let i = 1; i <= totalRooms; i++) {
                const floor = Math.ceil(i / 10);
                const roomNumber = (floor * 100) + (i % 10 === 0 ? 10 : i % 10);
                const typeIndex = Math.floor((i - 1) / Math.ceil(totalRooms / 4));
                const roomType = roomTypes[Math.min(typeIndex, 3)];
                
                const room = {
                    hotelId: hotelId,
                    number: roomNumber.toString(),
                    type: roomType,
                    capacity: roomType === 'Suite' ? 4 : roomType === 'Deluxe' ? 3 : 2,
                    price: basePrice + (typeIndex * 50000),
                    status: 'available',
                    amenities: ['WiFi', 'TV', 'Aire Acondicionado'],
                    createdAt: new Date().toISOString()
                };
                
                await window.hotelDB.add('rooms', room);
            }
        } catch (error) {
            console.error('Error creating rooms for hotel:', error);
        }
    }
    async updateHotel(hotelId, updates) {
        try {
            const hotel = await window.hotelDB.get('hotels', hotelId);
            if (!hotel) {
                return { success: false, message: 'Hotel no encontrado' };
            }

            const updatedHotel = { ...hotel, ...updates };
            await window.hotelDB.update('hotels', updatedHotel);

            return { success: true, hotel: updatedHotel };
        } catch (error) {
            console.error('Error updating hotel:', error);
            return { success: false, message: 'Error al actualizar hotel' };
        }
    }

    async deleteHotel(hotelId) {
        try {
            // Verifique si el hotel tiene reservas activas
            const reservations = await window.hotelDB.getByIndex('reservations', 'hotelId', hotelId);
            const activeReservations = reservations.filter(r => 
                r.reservationStatus === 'confirmed' || r.reservationStatus === 'checked-in'
            );

            if (activeReservations.length > 0) {
                return { success: false, message: 'No se puede eliminar hotel con reservas activas' };
            }

            // Eliminar todas las habitaciones primero
            const rooms = await window.hotelDB.getByIndex('rooms', 'hotelId', hotelId);
            for (const room of rooms) {
                await window.hotelDB.delete('rooms', room.id);
            }

            // Eliminar hotel
            await window.hotelDB.delete('hotels', hotelId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting hotel:', error);
            return { success: false, message: 'Error al eliminar hotel' };
        }
    }
    async getHotelsByUser(user) {
        try {
            if (user.role === 'admin') {
                return await window.hotelDB.getAll('hotels');
            } else if (user.role === 'staff' && user.hotelId) {
                const hotel = await window.hotelDB.get('hotels', user.hotelId);
                return hotel ? [hotel] : [];
            }
            return [];
        } catch (error) {
            console.error('Error getting hotels:', error);
            return [];
        }
    }


    async getHotelStats(hotelId) {
        try {
            const rooms = await window.hotelDB.getByIndex('rooms', 'hotelId', hotelId);
            const reservations = await window.hotelDB.getByIndex('reservations', 'hotelId', hotelId);
            
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Calcular la ocupación
            const totalRooms = rooms.length;
            const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
            const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

            // Calcular los ingresos mensuales
            const monthlyReservations = reservations.filter(r => {
                const checkIn = new Date(r.checkIn);
                return checkIn >= startOfMonth && checkIn <= endOfMonth && r.paymentStatus === 'paid';
            });
            const monthlyRevenue = monthlyReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

            // Los check-ins de hoy en día
            const todayStr = today.toISOString().split('T')[0];
            const todayCheckIns = reservations.filter(r => 
                r.checkIn.startsWith(todayStr) && r.reservationStatus === 'confirmed'
            ).length;
            const todayCheckOuts = reservations.filter(r => 
                r.checkOut.startsWith(todayStr) && r.reservationStatus === 'checked-in'
            ).length;

            // Desglose del estado de la habitación
            const roomStatus = {
                available: rooms.filter(r => r.status === 'available').length,
                occupied: occupiedRooms,
                dirty: rooms.filter(r => r.status === 'dirty').length,
                maintenance: rooms.filter(r => r.status === 'maintenance').length
            };

            return {
                totalRooms,
                occupancyRate: Math.round(occupancyRate),
                monthlyRevenue,
                todayCheckIns,
                todayCheckOuts,
                roomStatus
            };
        } catch (error) {
            console.error('Error getting hotel stats:', error);
            return null;
        }
    }

    setCurrentHotel(hotel) {
        this.currentHotel = hotel;
        localStorage.setItem('currentHotel', JSON.stringify(hotel));
    }

    getCurrentHotel() {
        if (!this.currentHotel) {
            const hotelData = localStorage.getItem('currentHotel');
            if (hotelData) {
                this.currentHotel = JSON.parse(hotelData);
            }
        }
        return this.currentHotel;
    }

    clearCurrentHotel() {
        this.currentHotel = null;
        localStorage.removeItem('currentHotel');
    }
}
