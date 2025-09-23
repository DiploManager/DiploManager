// Gestión de autenticación
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'hotelManagementSession';
        this.db = null;
    }
    
    async init() {
        this.db = window.hotelDB;
    }

    async login(email, password) {
        console.log('Intentando login con:', email);
        
        try {
            await this.init();
            const user = await this.db.getUserByEmail(email);
            
            console.log('Usuario encontrado en DB:', user);
            
            if (!user) {
                console.log('Usuario no encontrado');
                return { success: false, message: 'Usuario no encontrado' };
            }

            console.log('Verificando contraseña:', password, 'vs', user.password);
            if (user.password !== password) {
                console.log('Contraseña incorrecta');
                return { success: false, message: 'Contraseña incorrecta' };
            }

            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            console.log('Login exitoso:', user);
            return { success: true, user: user };
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error en el sistema' };
        }
    }

    async register(userData) {
        try {
            await this.init();
            // Verify if the user already exists
            const existingUser = await this.db.getUserByEmail(userData.email);
            if (existingUser) {
                return { success: false, message: 'El usuario ya existe' };
            }

            // Create new user
            const userId = await this.db.createUser(userData);
            const newUser = { ...userData, id: userId };
            
            this.currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            
            return { success: true, user: newUser };
        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, message: 'Error al crear usuario' };
        }
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem(this.sessionKey);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('selectedHotel');
        location.reload();
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }

    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }

    async resetPassword(email) {
        try {
            const users = await hotelDB.getByIndex('users', 'email', email);
            if (users.length === 0) {
                return { success: false, message: 'Email no encontrado' };
            }

            // En una aplicación real, enviaría un correo electrónico aquí
            // Para fines de demostración, solo generaremos un token
            const resetToken = Math.random().toString(36).substring(2, 15);
            
            // Token de reinicio de almacenamiento (en una aplicación real, esto estaría en la base de datos con vencimiento)
            localStorage.setItem(`reset_${email}`, resetToken);
            
            return { 
                success: true, 
                message: 'Se ha enviado un enlace de recuperación a tu email',
                token: resetToken // Solo para la demostración
            };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, message: 'Error en el sistema' };
        }
    }

    async changePassword(email, newPassword, token) {
        try {
            const storedToken = localStorage.getItem(`reset_${email}`);
            if (storedToken !== token) {
                return { success: false, message: 'Token inválido' };
            }

            const users = await hotelDB.getByIndex('users', 'email', email);
            if (users.length === 0) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            const user = users[0];
            user.password = newPassword;
            await hotelDB.update('users', user);

            // Eliminar el token de reinicio
            localStorage.removeItem(`reset_${email}`);

            return { success: true, message: 'Contraseña actualizada exitosamente' };
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, message: 'Error al cambiar contraseña' };
        }
    }
}

// Inicializar Auth Manager
const authManager = new AuthManager();