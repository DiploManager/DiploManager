// Sistema de gestión de bases de datos utilizando indexeddb
class HotelDatabase {
    constructor() {
        this.dbName = 'HotelManagementDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Mesa de usuarios
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('email', 'email', { unique: true });
                    userStore.createIndex('role', 'role', { unique: false });
                }

                // Mesa de hoteles
                if (!db.objectStoreNames.contains('hotels')) {
                    const hotelStore = db.createObjectStore('hotels', { keyPath: 'id', autoIncrement: true });
                    hotelStore.createIndex('name', 'name', { unique: false });
                }

                // Mesa de habitaciones
                if (!db.objectStoreNames.contains('rooms')) {
                    const roomStore = db.createObjectStore('rooms', { keyPath: 'id', autoIncrement: true });
                    roomStore.createIndex('hotelId', 'hotelId', { unique: false });
                    roomStore.createIndex('number', 'number', { unique: false });
                }

                // Tabla de reservas
                if (!db.objectStoreNames.contains('reservations')) {
                    const reservationStore = db.createObjectStore('reservations', { keyPath: 'id', autoIncrement: true });
                    reservationStore.createIndex('hotelId', 'hotelId', { unique: false });
                    reservationStore.createIndex('roomId', 'roomId', { unique: false });
                    reservationStore.createIndex('checkIn', 'checkIn', { unique: false });
                    reservationStore.createIndex('status', 'status', { unique: false });
                }

                // Tabla de pagos
                if (!db.objectStoreNames.contains('payments')) {
                    const paymentStore = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
                    paymentStore.createIndex('reservationId', 'reservationId', { unique: false });
                    paymentStore.createIndex('date', 'date', { unique: false });
                }

                // Tabla de configuración
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Tabla de notificaciones
                if (!db.objectStoreNames.contains('notifications')) {
                    const notificationStore = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
                    notificationStore.createIndex('userId', 'userId', { unique: false });
                    notificationStore.createIndex('read', 'read', { unique: false });
                }
            };
        });
    }

    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.add(data);
    }

    async update(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.put(data);
    }

    async get(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.get(id);
    }

    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.getAll();
    }

    async getByIndex(storeName, indexName, value) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        return index.getAll(value);
    }

    async delete(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.delete(id);
    }

    async initializeDefaultData() {
        try {
            // Compruebe si ya existe datos
            const users = await this.getAll('users');
            if (users.length > 0) return;

            // Crear usuario administrador predeterminado
            await this.add('users', {
                email: 'admin@hotel.com',
                password: 'admin123',
                name: 'Administrador Principal',
                role: 'admin',
                createdAt: new Date().toISOString(),
                active: true
            });

            // Crear hoteles predeterminados
            const hotel1 = await this.add('hotels', {
                name: 'Hotel Plaza Central',
                location: 'Centro Histórico',
                address: 'Calle 10 #15-20, Centro',
                phone: '+57 1 234 5678',
                email: 'info@plazacentral.com',
                image: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=400',
                totalRooms: 45,
                createdAt: new Date().toISOString(),
                active: true
            });

            const hotel2 = await this.add('hotels', {
                name: 'Hotel Marina Bay',
                location: 'Zona Rosa',
                address: 'Carrera 15 #85-32, Zona Rosa',
                phone: '+57 1 345 6789',
                email: 'reservas@marinabay.com',
                image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=400',
                totalRooms: 32,
                createdAt: new Date().toISOString(),
                active: true
            });

            const hotel3 = await this.add('hotels', {
                name: 'Hotel Mountain View',
                location: 'Zona Norte',
                address: 'Avenida 19 #120-45, Zona Norte',
                phone: '+57 1 456 7890',
                email: 'contacto@mountainview.com',
                image: 'https://images.pexels.com/photos/2506988/pexels-photo-2506988.jpeg?auto=compress&cs=tinysrgb&w=400',
                totalRooms: 28,
                createdAt: new Date().toISOString(),
                active: true
            });

            // Crear usuarios de personal para cada hotel
            await this.add('users', {
                email: 'staff1@hotel.com',
                password: 'staff123',
                name: 'Personal Plaza Central',
                role: 'staff',
                hotelId: 1,
                createdAt: new Date().toISOString(),
                active: true
            });

            await this.add('users', {
                email: 'staff2@hotel.com',
                password: 'staff123',
                name: 'Personal Marina Bay',
                role: 'staff',
                hotelId: 2,
                createdAt: new Date().toISOString(),
                active: true
            });

            // Crear habitaciones para cada hotel
            await this.createRoomsForHotel(1, 45, 'Plaza Central');
            await this.createRoomsForHotel(2, 32, 'Marina Bay');
            await this.createRoomsForHotel(3, 28, 'Mountain View');

            // Crear reservas de muestra
            await this.createSampleReservations();

            console.log('Default data initialized successfully');
        } catch (error) {
            console.error('Error initializing default data:', error);
        }
    }

    async createRoomsForHotel(hotelId, totalRooms, hotelName) {
        const roomTypes = ['Standard', 'Superior', 'Deluxe', 'Suite'];
        const roomStates = ['available', 'occupied', 'dirty', 'maintenance'];
        
        for (let i = 1; i <= totalRooms; i++) {
            const roomNumber = hotelId * 100 + i;
            const randomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
            const randomState = roomStates[Math.floor(Math.random() * roomStates.length)];
            
            await this.add('rooms', {
                hotelId: hotelId,
                number: roomNumber.toString(),
                type: randomType,
                status: randomState,
                capacity: randomType === 'Suite' ? 4 : randomType === 'Deluxe' ? 3 : 2,
                price: randomType === 'Suite' ? 200 : randomType === 'Deluxe' ? 150 : randomType === 'Superior' ? 100 : 80,
                amenities: ['WiFi', 'TV', 'AC', 'Minibar'],
                lastCleaned: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
        }
    }

    async createSampleReservations() {
        const guests = [
            'Juan Pérez', 'María García', 'Carlos Rodríguez', 'Ana Martínez',
            'Luis López', 'Carmen Sánchez', 'Pedro González', 'Rosa Hernández'
        ];

        const paymentStatuses = ['paid', 'pending', 'unpaid'];
        const reservationStatuses = ['confirmed', 'checked-in', 'checked-out', 'cancelled'];

        for (let i = 0; i < 10; i++) {
            const checkIn = new Date();
            checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 30) - 15);
            
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 7) + 1);

            const randomGuest = guests[Math.floor(Math.random() * guests.length)];
            const randomPaymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
            const randomReservationStatus = reservationStatuses[Math.floor(Math.random() * reservationStatuses.length)];

            await this.add('reservations', {
                hotelId: Math.floor(Math.random() * 3) + 1,
                roomId: Math.floor(Math.random() * 45) + 1,
                guestName: randomGuest,
                guestEmail: `${randomGuest.toLowerCase().replace(' ', '.')}@email.com`,
                guestPhone: `+57 30${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`,
                numberOfGuests: Math.floor(Math.random() * 4) + 1,
                checkIn: checkIn.toISOString(),
                checkOut: checkOut.toISOString(),
                roomType: 'Standard',
                totalAmount: Math.floor(Math.random() * 500) + 100,
                paymentStatus: randomPaymentStatus,
                reservationStatus: randomReservationStatus,
                preferences: ['Desayuno incluido'],
                createdAt: new Date().toISOString(),
                createdBy: 1
            });
        }
    }
}

// Inicializar la base de datos
const hotelDB = new HotelDatabase();