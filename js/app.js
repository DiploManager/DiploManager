// Sistema de gestión de hoteles -Lógica principal de aplicaciones

class HotelManagementSystem {
    constructor() {
        this.currentUser = null;
        this.selectedHotel = null;
        this.calendar = null;
        this.reservationCalendar = null;
        this.init();
    }

    init() {
        this.showLoading();
        
        // Simular el tiempo de carga
        setTimeout(() => {
            this.hideLoading();
            this.showLogin();
        }, 2000);

        this.setupEventListeners();
        this.generateMockData();
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
    }

    hideLogin() {
        document.getElementById('loginScreen').classList.add('hidden');
    }

    showHotelSelection() {
        document.getElementById('hotelSelection').classList.remove('hidden');
        this.loadHotels();
    }

    hideHotelSelection() {
        document.getElementById('hotelSelection').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('mainApp').classList.remove('hidden');
        this.initializeCalendars();
        this.loadRooms();
    }

    setupEventListeners() {
        // Formulario de inicio de sesión
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
    }

    handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Maqueta de autenticación
        const users = {
            'admin@hotel.com': { role: 'Admin', name: 'Administrador', password: 'admin123' },
            'staff@hotel.com': { role: 'Staff', name: 'Personal', password: 'staff123' }
        };

        const user = users[email];
        if (user && user.password === password) {
            this.currentUser = { email, ...user };
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userRole').textContent = user.role;
            
            this.hideLogin();
            this.showHotelSelection();
        } else {
            alert('Credenciales incorrectas');
        }
    }

    loadHotels() {
        const hotels = [
            {
                id: 1,
                name: 'Hotel Plaza Central',
                location: 'Centro Histórico',
                rooms: 45,
                image: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=400'
            },
            {
                id: 2,
                name: 'Hotel Marina Bay',
                location: 'Zona Rosa',
                rooms: 32,
                image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=400'
            },
            {
                id: 3,
                name: 'Hotel Mountain View',
                location: 'Zona Norte',
                rooms: 28,
                image: 'https://images.pexels.com/photos/2506988/pexels-photo-2506988.jpeg?auto=compress&cs=tinysrgb&w=400'
            }
        ];

        const grid = document.getElementById('hotelGrid');
        grid.innerHTML = hotels.map(hotel => `
            <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" 
                 onclick="hotelManager.selectHotel(${hotel.id})">
                <img src="${hotel.image}" alt="${hotel.name}" class="w-full h-48 object-cover">
                <div class="p-6">
                    <h3 class="text-xl font-bold text-gray-900 mb-2">${hotel.name}</h3>
                    <p class="text-gray-600 mb-4">${hotel.location}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">${hotel.rooms} habitaciones</span>
                        <button class="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                            Seleccionar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    selectHotel(hotelId) {
        const hotels = {
            1: 'Hotel Plaza Central',
            2: 'Hotel Marina Bay', 
            3: 'Hotel Mountain View'
        };

        this.selectedHotel = { id: hotelId, name: hotels[hotelId] };
        document.getElementById('selectedHotelName').textContent = hotels[hotelId];
        
        this.hideHotelSelection();
        this.showMainApp();
    }

    switchView(viewName) {
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
                events: this.generateMockReservations(),
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
                events: this.generateMockReservations(),
                eventClick: this.handleEventClick.bind(this),
                editable: true,
                droppable: true,
                eventDrop: this.handleEventDrop.bind(this),
                eventResize: this.handleEventResize.bind(this),
                height: 600,
                locale: 'es'
            });
        }
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

    handleEventClick(info) {
        const event = info.event;
        const props = event.extendedProps;
        
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

        document.getElementById('reservationDetails').innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Huésped</label>
                        <p class="text-gray-900">${props.guest}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Habitación</label>
                        <p class="text-gray-900">${props.room}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Check-in</label>
                        <p class="text-gray-900">${event.start.toLocaleDateString()}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Check-out</label>
                        <p class="text-gray-900">${event.end.toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Estado de Pago</label>
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[props.status]}">
                            ${statusTexts[props.status]}
                        </span>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Monto</label>
                        <p class="text-gray-900">$${props.amount}</p>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Teléfono</label>
                    <p class="text-gray-900">${props.phone}</p>
                </div>
                ${props.status !== 'paid' ? `
                    <div class="mt-6">
                        <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                            <i class="fas fa-credit-card mr-2"></i>Registrar Pago
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('reservationModal').classList.remove('hidden');
        document.getElementById('reservationModal').classList.add('flex');
    }

    handleEventDrop(info) {
        console.log('Reserva movida:', info.event.title, 'a', info.event.start);
        // Aquí normalmente actualizaría la base de datos
    }

    handleEventResize(info) {
        console.log('Reserva redimensionada:', info.event.title);
        // Aquí normalmente actualizaría la base de datos
    }

    loadRooms() {
        const roomsGrid = document.getElementById('roomsGrid');
        const roomStates = ['available', 'occupied', 'dirty', 'blocked'];
        const stateColors = {
            'available': 'bg-green-500',
            'occupied': 'bg-gray-500',
            'dirty': 'bg-red-500',
            'blocked': 'bg-orange-500'
        };
        const stateTexts = {
            'available': 'Disponible',
            'occupied': 'Ocupada',
            'dirty': 'Sucia',
            'blocked': 'Bloqueada'
        };

        let rooms = [];
        for (let i = 101; i <= 350; i++) {
            const state = roomStates[Math.floor(Math.random() * roomStates.length)];
            rooms.push({
                number: i,
                state: state,
                guest: state === 'occupied' ? this.getRandomGuest() : null
            });
        }

        roomsGrid.innerHTML = rooms.map(room => `
            <div class="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer p-4 relative"
                 onclick="hotelManager.showRoomDetails('${room.number}', '${room.state}', '${room.guest || ''}')">
                <div class="absolute top-2 right-2 w-3 h-3 ${stateColors[room.state]} rounded-full"></div>
                <div class="text-center">
                    <h3 class="font-bold text-gray-900 text-lg mb-1">${room.number}</h3>
                    <p class="text-sm text-gray-600 mb-2">${stateTexts[room.state]}</p>
                    ${room.guest ? `<p class="text-xs text-gray-500">${room.guest}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    getRandomGuest() {
        const guests = [
            'Juan Pérez', 'María García', 'Carlos Rodríguez', 'Ana Martínez',
            'Luis López', 'Carmen Sánchez', 'Pedro González', 'Rosa Hernández'
        ];
        return guests[Math.floor(Math.random() * guests.length)];
    }

    showRoomDetails(roomNumber, state, guest) {
        alert(`Habitación ${roomNumber}\nEstado: ${state}\n${guest ? `Huésped: ${guest}` : ''}`);
        // Aquí mostraría un modal detallado para la gestión de la habitación
    }

    generateMockData() {
        // Este método generará datos simulados para las pruebas
        console.log('Mock data generated');
    }
}

// Funciones globales
function closeReservationModal() {
    document.getElementById('reservationModal').classList.add('hidden');
    document.getElementById('reservationModal').classList.remove('flex');
}

function logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        location.reload();
    }
}

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
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);

// Inicializar la aplicación
const hotelManager = new HotelManagementSystem();