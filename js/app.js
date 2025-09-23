// Sistema de gestión de hoteles -Lógica principal de aplicaciones

class HotelManagementSystem {
    constructor() {
        this.currentUser = null;
        this.selectedHotel = null;
        this.calendar = null;
        this.reservationCalendar = null;
        this.weeklyCalendar = null;
        this.currentView = 'dashboard';
        this.isInitialized = false;
        this.init();
    }

    init() {
        // Inicializar la base de datos inmediatamente
        this.initializeDatabase();
    }

    async initializeDatabase() {
        if (this.isInitialized) return;
        
        console.log('Inicializando HotelManager...');
        await window.hotelDB.init();
        await window.hotelDB.initializeDefaultData();
        console.log('Base de datos inicializada');

        // Inicializar managers
        window.authManager = new AuthManager();
        await window.authManager.init();
        console.log('AuthManager inicializado');
        
        window.reservationManager = new ReservationManager();
        window.roomManager = new RoomManager();
        window.hotelManager = new HotelManager();
        window.notificationManager = new NotificationManager();
        window.reportManager = new ReportManager();

        this.isInitialized = true;
        console.log('Todos los managers inicializados');

        // Verify if there is a logo user
        const currentUser = window.authManager.getCurrentUser();
        if (currentUser) {
            console.log('Usuario ya logueado:', currentUser);
            const selectedHotel = localStorage.getItem('selectedHotel');
            if (selectedHotel) {
                this.selectedHotel = JSON.parse(selectedHotel);
                this.showView('dashboard');
            } else {
                this.showView('hotel-selection');
            }
        } else {
            console.log('No hay usuario logueado, mostrando login');
            this.showLogin();
        }

        this.setupEventListeners();
    }

    showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('hotelSelection').classList.add('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    hideLogin() {
        document.getElementById('loginScreen').classList.add('hidden');
    }

    showHotelSelection() {
        document.getElementById('hotelSelection').classList.remove('hidden');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        this.loadHotels();
    }

    hideHotelSelection() {
        document.getElementById('hotelSelection').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('hotelSelection').classList.add('hidden');
        document.getElementById('loginScreen').classList.add('hidden');
        this.loadUserInfo();
        this.initializeCalendars();
        this.loadRooms();
        this.loadNotifications();
        this.updateDashboardStats();
        // Programar actualizaciones periódicas
        setInterval(() => this.updateDashboardStats(), 30000); // Actualizar cada 30 segundos
    }

    setupEventListeners() {
        // Formulario de inicio de sesión
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Formulario de inscripción
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Formulario de creación de hotel
        document.getElementById('createHotelForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateHotel();
        });

        // Formulario de reserva
        document.getElementById('newReservationForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateReservation();
        });

        // Gestión de habitaciones
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('room-card')) {
                this.handleRoomClick(e.target);
            }
        });

        // Gestión de notificaciones
        document.getElementById('notificationBell')?.addEventListener('click', () => {
            this.toggleNotificationPanel();
        });
    }

    async handleLogin() {
        console.log('Manejando login...');
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log('Datos de login:', { email, password });

        const result = await window.authManager.login(email, password);
        
        if (result.success) {
            console.log('Login exitoso, usuario:', result.user);
            this.currentUser = result.user;
            this.hideLogin();
            this.showHotelSelection();
        } else {
            console.error('Error en login:', result.message);
            this.showAlert(result.message, 'error');
        }
    }

    async handleRegister() {
        const formData = new FormData(document.getElementById('registerForm'));
        const userData = Object.fromEntries(formData);

        const result = await window.authManager.register(userData);
        
        if (result.success) {
            this.showAlert('Usuario creado exitosamente', 'success');
            this.showLogin();
        } else {
            this.showAlert(result.message, 'error');
        }
    }

    loadUserInfo() {
        const user = window.authManager.getCurrentUser();
        if (user) {
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userRole').textContent = user.role;
        }
    }

    async loadHotels() {
        const user = window.authManager.getCurrentUser();
        const hotels = await window.hotelManager.getHotelsByUser(user);

        const grid = document.getElementById('hotelGrid');
        grid.innerHTML = hotels.map(hotel => `
            <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" 
                 onclick="window.hotelManager.selectHotel(${hotel.id})">
                <img src="${hotel.image}" alt="${hotel.name}" class="w-full h-48 object-cover">
                <div class="p-6">
                    <h3 class="text-xl font-bold text-gray-900 mb-2">${hotel.name}</h3>
                    <p class="text-gray-600 mb-4">${hotel.location}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">${hotel.totalRooms} habitaciones</span>
                        <button class="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                            Seleccionar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar botón Crear hotel para usuarios administrativos
        if (user.role === 'admin') {
            grid.innerHTML += `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border-2 border-dashed border-gray-300" 
                     onclick="window.hotelManager.showCreateHotelModal()">
                    <div class="p-6 h-full flex flex-col items-center justify-center text-center">
                        <i class="fas fa-plus text-4xl text-gray-400 mb-4"></i>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">Crear Nuevo Hotel</h3>
                        <p class="text-gray-600">Agregar un nuevo hotel al sistema</p>
                    </div>
                </div>
            `;
        }
    }

    async selectHotel(hotelId) {
        const hotel = await window.hotelDB.get('hotels', parseInt(hotelId));
        if (!hotel) {
            this.showAlert('Hotel no encontrado', 'error');
            return;
        }

        this.selectedHotel = hotel;
        window.hotelManager.setCurrentHotel(hotel);
        document.getElementById('selectedHotelName').textContent = hotel.name || 'Hotel';
        localStorage.setItem('selectedHotel', JSON.stringify(hotel));
        
        this.hideHotelSelection();
        this.showMainApp();
    }

    showBackToHotels() {
        const user = window.authManager.getCurrentUser();
        if (user.role === 'admin') {
            document.getElementById('hotelSelection').classList.remove('hidden');
            document.getElementById('mainApp').classList.add('hidden');
            this.loadHotels();
        }
    }

    switchView(viewName) {
        this.currentView = viewName;
        
        // Actualizar navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Actualizar el título de la página
        const titles = {
            'dashboard': { title: 'Dashboard', subtitle: 'Resumen general del hotel' },
            'reservations': { title: 'Reservas', subtitle: 'Gestión de reservas y calendario' },
            'rooms': { title: 'Habitaciones', subtitle: 'Estado y gestión de habitaciones' },
            'payments': { title: 'Pagos', subtitle: 'Gestión de pagos y facturación' },
            'users': { title: 'Usuarios', subtitle: 'Gestión de usuarios del sistema' },
            'reports': { title: 'Informes', subtitle: 'Análisis y reportes del hotel' },
            'integrations': { title: 'Integraciones', subtitle: 'APIs y conexiones externas' },
            'settings': { title: 'Configuración', subtitle: 'Configuración del sistema' }
        };

        document.getElementById('pageTitle').textContent = titles[viewName].title;
        document.getElementById('pageSubtitle').textContent = titles[viewName].subtitle;

        // Mostrar/ocultar vistas
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(`${viewName}View`).classList.remove('hidden');

        // Datos específicos de la vista de carga
        switch(viewName) {
            case 'reservations':
                this.loadReservationsView();
                break;
            case 'rooms':
                this.loadRoomsView();
                break;
            case 'reports':
                this.loadReportsView();
                break;
        }
    }

    showView(viewName) {
        console.log('Mostrando vista:', viewName);
        // Ocultar todas las vistas
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.style.display = 'none';
        });

        // Mostrar la vista solicitada
        const targetView = document.getElementById(viewName);
        if (targetView) {
            targetView.style.display = 'block';
            this.currentView = viewName;
            console.log('Vista mostrada:', viewName);
        } else {
            console.error('Vista no encontrada:', viewName);
        }
    }

    initializeCalendars() {
        // Calendario de tablero
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            this.calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                events: this.loadCalendarEvents.bind(this),
                eventClick: this.handleEventClick.bind(this),
                height: 'auto',
                locale: 'es'
            });
            this.calendar.render();
        }

        // Calendario de reservas
        const reservationCalendarEl = document.getElementById('reservationCalendar');
        if (reservationCalendarEl) {
            this.reservationCalendar = new FullCalendar.Calendar(reservationCalendarEl, {
                initialView: 'timeGridWeek',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                },
                events: this.loadCalendarEvents.bind(this),
                eventClick: this.handleEventClick.bind(this),
                editable: true,
                droppable: true,
                eventDrop: this.handleEventDrop.bind(this),
                eventResize: this.handleEventResize.bind(this),
                height: 600,
                locale: 'es'
            });
        }

        // Calendario de habitación semanal
        const weeklyCalendarEl = document.getElementById('weeklyCalendar');
        if (weeklyCalendarEl) {
            this.weeklyCalendar = new FullCalendar.Calendar(weeklyCalendarEl, {
                initialView: 'resourceTimeGridWeek',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'resourceTimeGridWeek,resourceTimeGridDay'
                },
                resources: this.loadRoomResources.bind(this),
                events: this.loadCalendarEvents.bind(this),
                locale: 'es'
            });
        }
    }

    async loadCalendarEvents() {
        const currentHotel = hotelManager.getCurrentHotel();
        if (!currentHotel) return [];

        const reservations = await reservationManager.getReservationsByHotel(currentHotel.id);
        const rooms = await roomManager.getRoomsByHotel(currentHotel.id);

        return reservations.map(reservation => {
            const room = rooms.find(r => r.id === reservation.roomId);
            return reservationManager.formatReservationForCalendar(reservation, room);
        });
    }

    async loadRoomResources() {
        const currentHotel = hotelManager.getCurrentHotel();
        if (!currentHotel) return [];

        const rooms = await roomManager.getRoomsByHotel(currentHotel.id);
        return rooms.map(room => ({
            id: room.id,
            title: `Hab. ${room.number}`,
            extendedProps: { room }
        }));
    }

    generateMockReservations() {
        const colors = {
            'paid': '#16a34a',      // Verde por pagado
            'pending': '#ea580c',   // Naranja para pendiente
            'unpaid': '#dc2626'     // Rojo para no pagar
        };

        const mockReservations = [
            {
                id: '1',
                title: 'Juan Pérez - Hab. 101',
                start: '2024-12-20T14:00:00',
                end: '2024-12-22T12:00:00',
                backgroundColor: colors.paid,
                extendedProps: {
                    guest: 'Juan Pérez',
                    room: '101',
                    status: 'paid',
                    amount: 250,
                    phone: '+57 300 123 4567'
                }
            },
            {
                id: '2',
                title: 'María García - Hab. 205',
                start: '2024-12-21T15:00:00',
                end: '2024-12-23T11:00:00',
                backgroundColor: colors.pending,
                extendedProps: {
                    guest: 'María García',
                    room: '205',
                    status: 'pending',
                    amount: 320,
                    phone: '+57 301 987 6543'
                }
            },
            {
                id: '3',
                title: 'Carlos Rodríguez - Hab. 301',
                start: '2024-12-22T16:00:00',
                end: '2024-12-25T10:00:00',
                backgroundColor: colors.unpaid,
                extendedProps: {
                    guest: 'Carlos Rodríguez',
                    room: '301',
                    status: 'unpaid',
                    amount: 480,
                    phone: '+57 302 456 7890'
                }
            }
        ];

        return mockReservations;
    }

    async handleEventClick(info) {
        const event = info.event;
        const reservation = event.extendedProps.reservation;
        const room = event.extendedProps.room;
        
        const statusColors = {
            'paid': 'bg-green-100 text-green-800',
            'pending': 'bg-orange-100 text-orange-800',
            'unpaid': 'bg-red-100 text-red-800'
        };

        const statusTexts = {
            'paid': 'Pagado',
            'pending': 'Pendiente',
            'unpaid': 'Sin pagar'
        };

        const reservationStatuses = {
            'confirmed': 'Confirmada',
            'checked-in': 'Check-in',
            'checked-out': 'Check-out',
            'cancelled': 'Cancelada'
        };

        document.getElementById('reservationDetails').innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Huésped</label>
                        <p class="text-gray-900">${reservation.guestName}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Habitación</label>
                        <p class="text-gray-900">${room?.number || 'N/A'}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Check-in</label>
                        <p class="text-gray-900">${new Date(reservation.checkIn).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Check-out</label>
                        <p class="text-gray-900">${new Date(reservation.checkOut).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Estado de Pago</label>
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[reservation.paymentStatus]}">
                            ${statusTexts[reservation.paymentStatus]}
                        </span>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Monto</label>
                        <p class="text-gray-900">$${reservation.totalAmount}</p>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Teléfono</label>
                    <p class="text-gray-900">${reservation.guestPhone}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Estado de Reserva</label>
                    <p class="text-gray-900">${reservationStatuses[reservation.reservationStatus]}</p>
                </div>
                <div class="mt-6 flex space-x-2">
                    ${reservation.reservationStatus === 'confirmed' ? `
                        <button onclick="hotelManager.checkIn(${reservation.id})" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                            <i class="fas fa-sign-in-alt mr-2"></i>Check-in
                        </button>
                    ` : ''}
                    ${reservation.reservationStatus === 'checked-in' && reservation.paymentStatus === 'paid' ? `
                        <button onclick="hotelManager.checkOut(${reservation.id})" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-sign-out-alt mr-2"></i>Check-out
                        </button>
                    ` : ''}
                    ${reservation.paymentStatus !== 'paid' ? `
                    <div class="mt-6">
                        <button onclick="hotelManager.processPayment(${reservation.id})" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                            <i class="fas fa-credit-card mr-2"></i>Registrar Pago
                        </button>
                    </div>
                ` : ''}
                </div>
            </div>
        `;

        document.getElementById('reservationModal').classList.remove('hidden');
        document.getElementById('reservationModal').classList.add('flex');
    }

    async checkIn(reservationId) {
        const result = await reservationManager.checkIn(reservationId);
        if (result.success) {
            this.showAlert('Check-in realizado exitosamente', 'success');
            this.refreshCalendars();
            this.closeReservationModal();
        } else {
            this.showAlert(result.message, 'error');
        }
    }

    async checkOut(reservationId) {
        const result = await reservationManager.checkOut(reservationId);
        if (result.success) {
            this.showAlert('Check-out realizado exitosamente', 'success');
            this.refreshCalendars();
            this.closeReservationModal();
        } else {
            this.showAlert(result.message, 'error');
        }
    }

    async processPayment(reservationId) {
        // Mostrar modal de pago
        const amount = prompt('Ingrese el monto del pago:');
        if (amount && !isNaN(amount)) {
            const result = await reservationManager.processPayment(reservationId, {
                amount: parseFloat(amount),
                method: 'cash'
            });
            
            if (result.success) {
                this.showAlert('Pago procesado exitosamente', 'success');
                this.refreshCalendars();
                this.closeReservationModal();
            } else {
                this.showAlert(result.message, 'error');
            }
        }
    }

    closeReservationModal() {
        document.getElementById('reservationModal').classList.add('hidden');
        document.getElementById('reservationModal').classList.remove('flex');
    }

    refreshCalendars() {
        if (this.calendar) this.calendar.refetchEvents();
        if (this.reservationCalendar) this.reservationCalendar.refetchEvents();
        if (this.weeklyCalendar) this.weeklyCalendar.refetchEvents();
    }

    handleEventDrop(info) {
        const reservation = info.event.extendedProps.reservation;
        const newStart = info.event.start.toISOString();
        const newEnd = info.event.end.toISOString();
        
        // Actualizar fechas de reserva
        reservationManager.updateReservation(reservation.id, {
            checkIn: newStart,
            checkOut: newEnd
        });
    }

    handleEventResize(info) {
        const reservation = info.event.extendedProps.reservation;
        const newEnd = info.event.end.toISOString();
        
        // Extender la reserva
        reservationManager.extendReservation(reservation.id, newEnd);
    }

    async loadRooms() {
        const currentHotel = hotelManager.getCurrentHotel();
        if (!currentHotel) return;

        const rooms = await roomManager.getRoomsByHotel(currentHotel.id);
        const roomsGrid = document.getElementById('roomsGrid');
        if (!roomsGrid) return;

        roomsGrid.innerHTML = rooms.map(room => `
            <div class="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer p-4 relative room-card"
                 data-room-id="${room.id}">
                <div class="absolute top-2 right-2 w-3 h-3 ${roomManager.getRoomStateInfo(room.status).color} rounded-full" title="${roomManager.getRoomStateInfo(room.status).text}"></div>
                <div class="text-center">
                    <h3 class="font-bold text-gray-900 text-lg mb-1">${room.number}</h3>
                    <p class="text-sm text-gray-600 mb-2">${roomManager.getRoomStateInfo(room.status).text}</p>
                    <p class="text-xs text-gray-500">${room.type}</p>
                </div>
            </div>
        `).join('');
    }

    async handleRoomClick(roomElement) {
        const roomId = parseInt(roomElement.dataset.roomId);
        const room = await hotelDB.get('rooms', roomId);
        
        if (!room) return;

        // Modal de gestión de la sala del espectáculo
        this.showRoomModal(room);
    }

    showRoomModal(room) {
        const modal = document.getElementById('roomModal');
        if (!modal) {
            console.error('Room modal not found');
            return;
        }

        document.getElementById('roomModalTitle').textContent = `Habitación ${room.number}`;
        document.getElementById('roomModalContent').innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Número</label>
                        <p class="text-gray-900">${room.number}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Tipo</label>
                        <p class="text-gray-900">${room.type}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Capacidad</label>
                        <p class="text-gray-900">${room.capacity} personas</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Precio por noche</label>
                        <p class="text-gray-900">$${room.price}</p>
                    </div>
                </div>
                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Cambiar Estado de Habitación</label>
                    <p class="text-sm text-gray-500 mb-3">Estado actual: <span class="font-medium">${roomManager.getRoomStateInfo(room.status).text}</span></p>
                    <div class="flex space-x-2">
                        <button onclick="window.hotelManager.updateRoomStatus(${room.id}, 'available')" 
                                class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                            Marcar Limpia
                        </button>
                        <button onclick="window.hotelManager.updateRoomStatus(${room.id}, 'dirty')" 
                                class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                            Marcar Sucia
                        </button>
                        <button onclick="window.hotelManager.updateRoomStatus(${room.id}, 'maintenance')" 
                                class="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700">
                            Mantenimiento
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    async updateRoomStatus(roomId, newStatus) {
        const result = await roomManager.updateRoomStatus(parseInt(roomId), newStatus);
        if (result.success) {
            this.showAlert('Estado de habitación actualizado', 'success');
            this.loadRooms();
            this.closeRoomModal();
        } else {
            this.showAlert(result.message, 'error');
        }
    }

    closeRoomModal() {
        const modal = document.getElementById('roomModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    async updateDashboardStats() {
        const currentHotel = hotelManager.getCurrentHotel();
        if (!currentHotel) return;

        const stats = await hotelManager.getHotelStats(currentHotel.id);
        if (!stats) return;

        // Actualizar tarjetas KPI
        const occupancyEl = document.querySelector('[data-stat="occupancy"]');
        if (occupancyEl) occupancyEl.textContent = `${stats.occupancyRate}%`;

        const revenueEl = document.querySelector('[data-stat="revenue"]');
        if (revenueEl) revenueEl.textContent = `$${stats.monthlyRevenue.toLocaleString()}`;

        const checkInsEl = document.querySelector('[data-stat="checkins"]');
        if (checkInsEl) checkInsEl.textContent = stats.todayCheckIns;

        const checkOutsEl = document.querySelector('[data-stat="checkouts"]');
        if (checkOutsEl) checkOutsEl.textContent = stats.todayCheckOuts;

        // Actualizar el desglose del estado de la sala
        const roomStatusEl = document.getElementById('roomStatusBreakdown');
        if (roomStatusEl) {
            roomStatusEl.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span class="text-gray-700">Disponibles</span>
                    </div>
                    <span class="font-medium">${stats.roomStatus.available}</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                        <span class="text-gray-700">Ocupadas</span>
                    </div>
                    <span class="font-medium">${stats.roomStatus.occupied}</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                        <span class="text-gray-700">Sucias</span>
                    </div>
                    <span class="font-medium">${stats.roomStatus.dirty}</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                        <span class="text-gray-700">Mantenimiento</span>
                    </div>
                    <span class="font-medium">${stats.roomStatus.maintenance}</span>
                </div>
            `;
        }
    }

    async loadNotifications() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        await notificationManager.getNotifications(user.id);
        this.updateNotificationBadge();
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = notificationManager.unreadCount;
            badge.style.display = notificationManager.unreadCount > 0 ? 'flex' : 'none';
        }
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }

    async loadReservationsView() {
        if (this.reservationCalendar && !this.reservationCalendar.isRendered) {
            this.reservationCalendar.render();
        }
    }

    async loadRoomsView() {
        await this.loadRooms();
        
        if (this.weeklyCalendar && !this.weeklyCalendar.isRendered) {
            this.weeklyCalendar.render();
        }
    }

    async loadReportsView() {
        const currentHotel = hotelManager.getCurrentHotel();
        if (!currentHotel) return;

        // Cargar informes predeterminados
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);

        const occupancyReport = await reportManager.generateOccupancyReport(
            currentHotel.id, 
            startDate.toISOString(), 
            endDate.toISOString()
        );

        const revenueReport = await reportManager.generateRevenueReport(
            currentHotel.id, 
            startDate.toISOString(), 
            endDate.toISOString()
        );

        this.displayReports(occupancyReport, revenueReport);
    }

    displayReports(occupancyReport, revenueReport) {
        const reportsContainer = document.getElementById('reportsContainer');
        if (!reportsContainer) return;

        reportsContainer.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Reporte de Ocupación</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span>Tasa de Ocupación:</span>
                            <span class="font-medium">${occupancyReport?.occupancyRate || 0}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Total Reservas:</span>
                            <span class="font-medium">${occupancyReport?.totalReservations || 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Noches Ocupadas:</span>
                            <span class="font-medium">${occupancyReport?.occupiedRoomNights || 0}</span>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Reporte de Ingresos</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span>Ingresos Totales:</span>
                            <span class="font-medium">$${revenueReport?.totalRevenue?.toLocaleString() || 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Ingresos Pendientes:</span>
                            <span class="font-medium">$${revenueReport?.pendingRevenue?.toLocaleString() || 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Valor Promedio:</span>
                            <span class="font-medium">$${Math.round(revenueReport?.averageReservationValue || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer') || this.createAlertContainer();
        
        const alertColors = {
            'success': 'bg-green-100 border-green-400 text-green-700',
            'error': 'bg-red-100 border-red-400 text-red-700',
            'warning': 'bg-yellow-100 border-yellow-400 text-yellow-700',
            'info': 'bg-blue-100 border-blue-400 text-blue-700'
        };

        const alert = document.createElement('div');
        alert.className = `border px-4 py-3 rounded mb-4 ${alertColors[type]} alert-message`;
        alert.innerHTML = `
            <span class="block sm:inline">${message}</span>
            <button class="float-right ml-4" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        alertContainer.appendChild(alert);

        // Auto eliminar después de 5 segundos
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    createAlertContainer() {
        const container = document.createElement('div');
        container.id = 'alertContainer';
        container.className = 'fixed top-4 right-4 z-50 max-w-sm';
        document.body.appendChild(container);
        return container;
    }

    logout() {
        authManager.logout();
    }
}

// Funciones globales
function closeReservationModal() {
    window.hotelManager.closeReservationModal();
}

function logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        window.hotelManager.logout();
    }
}

// Extender el sistema de gestión hotelera con métodos adicionales
HotelManagementSystem.prototype.selectHotel = function(hotelId) {
    this.selectHotel(hotelId);
};

HotelManagementSystem.prototype.showCreateHotelModal = function() {
    const modal = document.getElementById('createHotelModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

HotelManagementSystem.prototype.handleCreateHotel = async function() {
    const formData = new FormData(document.getElementById('createHotelForm'));
    const hotelData = Object.fromEntries(formData);

    const result = await window.hotelManager.createHotel(hotelData);
    if (result.success) {
        this.showAlert('Hotel creado exitosamente', 'success');
        this.loadHotels();
        this.closeCreateHotelModal();
    } else {
        this.showAlert(result.message, 'error');
    }
};

HotelManagementSystem.prototype.closeCreateHotelModal = function() {
    const modal = document.getElementById('createHotelModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// Estilos CSS para navegación y componentes
const additionalStyles = `
<style>
.nav-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 16px;
    text-decoration: none;
    color: #64748b;
    border-radius: 8px;
    margin-bottom: 4px;
    transition: all 0.2s;
}

.nav-item:hover {
    background-color: #f1f5f9;
    color: #334155;
}

.nav-item.active {
    background-color: #2563eb;
    color: white;
}

.fc-event {
    border: none !important;
    border-radius: 6px !important;
    padding: 2px 4px !important;
    font-size: 12px !important;
}

.fc-daygrid-event {
    border-radius: 4px !important;
    margin: 1px 0 !important;
}

.fc-toolbar-title {
    font-size: 1.5rem !important;
    font-weight: 600 !important;
}

.fc-button {
    border-radius: 6px !important;
    border: 1px solid #d1d5db !important;
    background: white !important;
    color: #374151 !important;
}

.fc-button-primary {
    background-color: #2563eb !important;
    border-color: #2563eb !important;
    color: white !important;
}

.fc-button-active {
    background-color: #2563eb !important;
    border-color: #2563eb !important;
    color: white !important;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.view-content {
    animation: fadeIn 0.3s ease-out;
}

/* Room grid responsive adjustments */
@media (max-width: 768px) {
    #roomsGrid {
        grid-template-columns: repeat(3, 1fr) !important;
    }
}

@media (max-width: 480px) {
    #roomsGrid {
        grid-template-columns: repeat(2, 1fr) !important;
    }
}

.alert-message {
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: #dc2626;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM cargado, inicializando aplicación...');
    window.hotelManager = new HotelManagementSystem();
    await window.hotelManager.init();
    console.log('Aplicación inicializada completamente');
});