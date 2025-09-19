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
                totalRooms: 0
            };

            const result = await hotelDB.add('hotels', hotel);
            return { success: true, hotel: { ...hotel, id: result } };
        } catch (error) {
            console.error('Error creating hotel:', error);
            return { success: false, message: 'Error al crear hotel' };
        }
    }

    async updateHotel(hotelId, updates) {
        try {
            const hotel = await hotelDB.get('hotels', hotelId);
            if (!hotel) {
                return { success: false, message: 'Hotel no encontrado' };
            }

            const updatedHotel = { ...hotel, ...updates };
            await hotelDB.update('hotels', updatedHotel);

            return { success: true, hotel: updatedHotel };
        } catch (error) {
            console.error('Error updating hotel:', error);
            return { success: false, message: 'Error al actualizar hotel' };
        }
    }

    async getHotelsByUser(user) {
        try {
            if (user.role === 'admin') {
                return await hotelDB.getAll('hotels');
            } else if (user.role === 'staff' && user.hotelId) {
                const hotel = await hotelDB.get('hotels', user.hotelId);
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
            const rooms = await roomManager.getRoomsByHotel(hotelId);
            const reservations = await reservationManager.getReservationsByHotel(hotelId);
            
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
        sessionStorage.setItem('currentHotel', JSON.stringify(hotel));
    }

    getCurrentHotel() {
        if (!this.currentHotel) {
            const hotelData = sessionStorage.getItem('currentHotel');
            if (hotelData) {
                this.currentHotel = JSON.parse(hotelData);
            }
        }
        return this.currentHotel;
    }

    clearCurrentHotel() {
        this.currentHotel = null;
        sessionStorage.removeItem('currentHotel');
    }
}

// Inicializar el gerente del hotel
const hotelManager = new HotelManager();