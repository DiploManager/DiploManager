// Sistema de gestión de bases de datos
class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbName = 'HotelManagementDB';
        this.version = 4;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Tienda de usuarios
                if (!db.objectStoreNames.contains('users')) {
                    const store = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('email', 'email', { unique: true });
                }

                // Tienda de hoteles  
                if (!db.objectStoreNames.contains('hotels')) {
                    const store = db.createObjectStore('hotels', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('name', 'name');
                    store.createIndex('location', 'location');
                }

                // Tienda de habitaciones
                if (!db.objectStoreNames.contains('rooms')) {
                    const store = db.createObjectStore('rooms', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('hotelId', 'hotelId');
                    store.createIndex('number', 'number');
                }

                // Tienda de reservas
                if (!db.objectStoreNames.contains('reservations')) {
                    const store = db.createObjectStore('reservations', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('hotelId', 'hotelId');
                    store.createIndex('roomId', 'roomId');
                    store.createIndex('guestEmail', 'guestEmail');
                }

                // Tienda de pagos
                if (!db.objectStoreNames.contains('payments')) {
                    const store = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('reservationId', 'reservationId');
                }

                // Tienda de notificaciones
                if (!db.objectStoreNames.contains('notifications')) {
                    const store = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('userId', 'userId');
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Base de datos inicializada correctamente');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('Error inicializando base de datos:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getUserByEmail(email) {
        try {
            const users = await this.getByIndex('users', 'email', email);
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('Error getting user by email:', error);
            return null;
        }
    }

    async createUser(userData) {
        try {
            return await this.add('users', userData);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async initializeDefaultData() {
        try {
            console.log('Inicializando datos por defecto...');
            
            // Compruebe si los usuarios ya existen
            const existingUsers = await this.getAll('users');
            if (existingUsers.length > 0) {
                console.log('Datos ya existen, saltando inicialización');
                return;
            }

            // Crear usuarios predeterminados
            const defaultUsers = [
                {
                    name: 'Administrador',
                    email: 'admin@hotel.com',
                    password: 'admin123',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                },
                {
                    name: 'Staff Hotel Plaza',
                    email: 'staff@hotel.com',
                    password: 'staff123',
                    role: 'staff',
                    hotelId: 1,
                    createdAt: new Date().toISOString()
                }
            ];

            for (const user of defaultUsers) {
                await this.add('users', user);
                console.log(`Usuario creado: ${user.email}`);
            }

            // Crear hoteles predeterminados
            const defaultHotels = [
                {
                    name: 'Hotel Plaza Central',
                    location: 'Centro Histórico',
                    address: 'Calle 10 #15-20, Centro',
                    phone: '+57 1 234 5678',
                    email: 'info@plazacentral.com',
                    image: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800',
                    totalRooms: 12,
                    active: true,
                    createdAt: new Date().toISOString()
                },
                {
                    name: 'Hotel Marina Bay',
                    location: 'Zona Rosa',
                    address: 'Carrera 15 #85-40, Zona Rosa',
                    phone: '+57 1 345 6789',
                    email: 'info@marinabay.com',
                    image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
                    totalRooms: 8,
                    active: true,
                    createdAt: new Date().toISOString()
                }
            ];

            for (const hotel of defaultHotels) {
                await this.add('hotels', hotel);
                console.log(`Hotel creado: ${hotel.name}`);
            }

            // Crear habitaciones predeterminadas para Hotel Plaza Central (ID: 1)
            const plazaRooms = [];
            for (let i = 1; i <= 12; i++) {
                const roomNumber = 100 + i;
                plazaRooms.push({
                    hotelId: 1,
                    number: roomNumber.toString(),
                    type: i <= 6 ? 'Standard' : i <= 10 ? 'Superior' : 'Suite',
                    capacity: i <= 8 ? 2 : i <= 10 ? 3 : 4,
                    price: i <= 6 ? 150000 : i <= 10 ? 200000 : 300000,
                    status: i <= 8 ? 'available' : i <= 10 ? 'occupied' : 'dirty',
                    amenities: ['WiFi', 'TV', 'Aire Acondicionado'],
                    createdAt: new Date().toISOString()
                });
            }

            // Crear habitaciones predeterminadas para Hotel Marina Bay (ID: 2)
            const marinaRooms = [];
            for (let i = 1; i <= 8; i++) {
                const roomNumber = 200 + i;
                marinaRooms.push({
                    hotelId: 2,
                    number: roomNumber.toString(),
                    type: i <= 4 ? 'Standard' : i <= 6 ? 'Superior' : 'Suite',
                    capacity: i <= 5 ? 2 : 3,
                    price: i <= 4 ? 180000 : i <= 6 ? 250000 : 350000,
                    status: i <= 5 ? 'available' : i <= 6 ? 'occupied' : 'maintenance',
                    amenities: ['WiFi', 'TV', 'Aire Acondicionado', 'Minibar'],
                    createdAt: new Date().toISOString()
                });
            }

            // Agregar todas las habitaciones
            for (const room of [...plazaRooms, ...marinaRooms]) {
                await this.add('rooms', room);
            }

            console.log('Datos por defecto inicializados correctamente');
        } catch (error) {
            console.error('Error inicializando datos por defecto:', error);
        }
    }
}

// Inicializar Global Database Manager
window.hotelDB = new DatabaseManager();