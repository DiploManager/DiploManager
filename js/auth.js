// Gestión de autenticación
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'hotelManagementSession';
    }

    async login(email, password) {
        try {
            const users = await hotelDB.getByIndex('users', 'email', email);
            const user = users.find(u => u.password === password && u.active);

            if (user) {
                this.currentUser = user;
                sessionStorage.setItem(this.sessionKey, JSON.stringify(user));
                return { success: true, user };
            } else {
                return { success: false, message: 'Credenciales incorrectas' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Error en el sistema' };
        }
    }

    async register(userData) {
        try {
            // Compruebe si el correo electrónico ya existe
            const existingUsers = await hotelDB.getByIndex('users', 'email', userData.email);
            if (existingUsers.length > 0) {
                return { success: false, message: 'El email ya está registrado' };
            }

            const newUser = {
                ...userData,
                createdAt: new Date().toISOString(),
                active: true
            };

            await hotelDB.add('users', newUser);
            return { success: true, message: 'Usuario creado exitosamente' };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Error al crear usuario' };
        }
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem(this.sessionKey);
        location.reload();
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const sessionData = sessionStorage.getItem(this.sessionKey);
            if (sessionData) {
                this.currentUser = JSON.parse(sessionData);
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