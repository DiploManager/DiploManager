// Informes y análisis
class ReportManager {
    constructor() {
        this.reportTypes = {
            'occupancy': 'Ocupación',
            'revenue': 'Ingresos',
            'payments': 'Pagos',
            'rooms': 'Habitaciones'
        };
    }

    async generateOccupancyReport(hotelId, startDate, endDate) {
        try {
            const rooms = await roomManager.getRoomsByHotel(hotelId);
            const reservations = await reservationManager.getReservationsByHotel(hotelId);

            const filteredReservations = reservations.filter(r => {
                const checkIn = new Date(r.checkIn);
                const checkOut = new Date(r.checkOut);
                return checkIn <= new Date(endDate) && checkOut >= new Date(startDate) && 
                       r.reservationStatus !== 'cancelled';
            });

            const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
            const totalRoomNights = rooms.length * totalDays;
            
            let occupiedRoomNights = 0;
            filteredReservations.forEach(reservation => {
                const checkIn = new Date(Math.max(new Date(reservation.checkIn), new Date(startDate)));
                const checkOut = new Date(Math.min(new Date(reservation.checkOut), new Date(endDate)));
                
                if (checkIn < checkOut) {
                    occupiedRoomNights += Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                }
            });

            const occupancyRate = totalRoomNights > 0 ? (occupiedRoomNights / totalRoomNights) * 100 : 0;

            // Desglose de ocupación diaria
            const dailyOccupancy = [];
            for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const dayReservations = filteredReservations.filter(r => 
                    new Date(r.checkIn) <= d && new Date(r.checkOut) > d
                );
                
                dailyOccupancy.push({
                    date: dayStr,
                    occupiedRooms: dayReservations.length,
                    totalRooms: rooms.length,
                    occupancyRate: rooms.length > 0 ? (dayReservations.length / rooms.length) * 100 : 0
                });
            }

            return {
                totalRooms: rooms.length,
                totalDays,
                totalRoomNights,
                occupiedRoomNights,
                occupancyRate: Math.round(occupancyRate * 100) / 100,
                dailyOccupancy,
                totalReservations: filteredReservations.length
            };
        } catch (error) {
            console.error('Error generating occupancy report:', error);
            return null;
        }
    }

    async generateRevenueReport(hotelId, startDate, endDate) {
        try {
            const reservations = await reservationManager.getReservationsByHotel(hotelId);
            const payments = await hotelDB.getAll('payments');

            const filteredReservations = reservations.filter(r => {
                const checkIn = new Date(r.checkIn);
                return checkIn >= new Date(startDate) && checkIn <= new Date(endDate);
            });

            const paidReservations = filteredReservations.filter(r => r.paymentStatus === 'paid');
            const pendingReservations = filteredReservations.filter(r => r.paymentStatus === 'pending');
            const unpaidReservations = filteredReservations.filter(r => r.paymentStatus === 'unpaid');

            const totalRevenue = paidReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
            const pendingRevenue = pendingReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
            const potentialRevenue = unpaidReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

            // Desglose de ingresos diarios
            const dailyRevenue = [];
            for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const dayReservations = paidReservations.filter(r => 
                    r.checkIn.startsWith(dayStr)
                );
                
                const dayTotal = dayReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
                
                dailyRevenue.push({
                    date: dayStr,
                    revenue: dayTotal,
                    reservations: dayReservations.length
                });
            }

            // Ingresos por tipo de habitación
            const revenueByRoomType = {};
            for (const reservation of paidReservations) {
                const roomType = reservation.roomType || 'Standard';
                if (!revenueByRoomType[roomType]) {
                    revenueByRoomType[roomType] = { revenue: 0, count: 0 };
                }
                revenueByRoomType[roomType].revenue += reservation.totalAmount || 0;
                revenueByRoomType[roomType].count += 1;
            }

            return {
                totalRevenue,
                pendingRevenue,
                potentialRevenue,
                totalReservations: filteredReservations.length,
                paidReservations: paidReservations.length,
                pendingReservations: pendingReservations.length,
                unpaidReservations: unpaidReservations.length,
                averageReservationValue: paidReservations.length > 0 ? totalRevenue / paidReservations.length : 0,
                dailyRevenue,
                revenueByRoomType
            };
        } catch (error) {
            console.error('Error generating revenue report:', error);
            return null;
        }
    }

    async generateRoomPerformanceReport(hotelId, startDate, endDate) {
        try {
            const rooms = await roomManager.getRoomsByHotel(hotelId);
            const reservations = await reservationManager.getReservationsByHotel(hotelId);

            const roomPerformance = [];

            for (const room of rooms) {
                const roomReservations = reservations.filter(r => 
                    r.roomId === room.id &&
                    new Date(r.checkIn) >= new Date(startDate) &&
                    new Date(r.checkIn) <= new Date(endDate) &&
                    r.reservationStatus !== 'cancelled'
                );

                const paidReservations = roomReservations.filter(r => r.paymentStatus === 'paid');
                const totalRevenue = paidReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
                
                const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
                let occupiedDays = 0;

                roomReservations.forEach(reservation => {
                    const checkIn = new Date(Math.max(new Date(reservation.checkIn), new Date(startDate)));
                    const checkOut = new Date(Math.min(new Date(reservation.checkOut), new Date(endDate)));
                    
                    if (checkIn < checkOut) {
                        occupiedDays += Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                    }
                });

                const occupancyRate = totalDays > 0 ? (occupiedDays / totalDays) * 100 : 0;

                roomPerformance.push({
                    room: room,
                    totalReservations: roomReservations.length,
                    totalRevenue,
                    occupancyRate: Math.round(occupancyRate * 100) / 100,
                    averageRate: paidReservations.length > 0 ? totalRevenue / occupiedDays : 0,
                    occupiedDays
                });
            }

            // Ordenar por métricas de rendimiento
            roomPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);

            return {
                roomPerformance,
                totalRooms: rooms.length,
                averageOccupancy: roomPerformance.reduce((sum, r) => sum + r.occupancyRate, 0) / rooms.length,
                totalRevenue: roomPerformance.reduce((sum, r) => sum + r.totalRevenue, 0)
            };
        } catch (error) {
            console.error('Error generating room performance report:', error);
            return null;
        }
    }

    async generatePaymentReport(hotelId, startDate, endDate) {
        try {
            const reservations = await reservationManager.getReservationsByHotel(hotelId);
            const payments = await hotelDB.getAll('payments');

            const hotelReservationIds = reservations.map(r => r.id);
            const hotelPayments = payments.filter(p => 
                hotelReservationIds.includes(p.reservationId) &&
                new Date(p.date) >= new Date(startDate) &&
                new Date(p.date) <= new Date(endDate)
            );

            const paymentsByMethod = {};
            let totalPayments = 0;

            hotelPayments.forEach(payment => {
                const method = payment.method || 'cash';
                if (!paymentsByMethod[method]) {
                    paymentsByMethod[method] = { amount: 0, count: 0 };
                }
                paymentsByMethod[method].amount += payment.amount || 0;
                paymentsByMethod[method].count += 1;
                totalPayments += payment.amount || 0;
            });

            // Pagos diarios
            const dailyPayments = [];
            for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const dayPayments = hotelPayments.filter(p => 
                    p.date.startsWith(dayStr)
                );
                
                const dayTotal = dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                
                dailyPayments.push({
                    date: dayStr,
                    amount: dayTotal,
                    count: dayPayments.length
                });
            }

            return {
                totalPayments,
                totalTransactions: hotelPayments.length,
                averageTransaction: hotelPayments.length > 0 ? totalPayments / hotelPayments.length : 0,
                paymentsByMethod,
                dailyPayments
            };
        } catch (error) {
            console.error('Error generating payment report:', error);
            return null;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    }

    formatPercentage(value) {
        return `${Math.round(value * 100) / 100}%`;
    }

    exportToCSV(data, filename) {
        const csvContent = this.convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }
}

// Inicializar el administrador de informes
const reportManager = new ReportManager();