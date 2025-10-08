class WhatsAppSender {
    constructor() {
        this.init();
        this.checkStatus();
        this.loadContacts();
        this.loadHistory();
        setInterval(() => this.checkStatus(), 5000);
    }

    init() {
        // Event listeners
        document.getElementById('contact-form').addEventListener('submit', (e) => this.addContact(e));
        document.getElementById('message-form').addEventListener('submit', (e) => this.sendMessage(e));
        document.getElementById('schedule-form').addEventListener('submit', (e) => this.scheduleMessage(e));
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            const indicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            const qrContainer = document.getElementById('qr-container');
            
            if (data.whatsappReady) {
                indicator.className = 'status-indicator connected';
                statusText.textContent = 'Conectado';
                qrContainer.style.display = 'none';
            } else if (data.qrCode) {
                indicator.className = 'status-indicator connecting';
                statusText.textContent = 'Esperando escaneo QR';
                document.getElementById('qr-code').src = data.qrCode;
                qrContainer.style.display = 'block';
            } else {
                indicator.className = 'status-indicator disconnected';
                statusText.textContent = 'Desconectado';
                qrContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    }

    async loadContacts() {
        try {
            const response = await fetch('/api/contacts');
            const contacts = await response.json();
            
            this.displayContacts(contacts);
            this.updateContactSelects(contacts);
            document.getElementById('total-contacts').textContent = contacts.length;
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }

    displayContacts(contacts) {
        const container = document.getElementById('contacts-container');
        container.innerHTML = '';
        
        contacts.forEach(contact => {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'contact-item';
            contactDiv.innerHTML = `
                <div class="contact-info">
                    <h4>${contact.name}</h4>
                    <p>${contact.phone}</p>
                </div>
                <button class="delete-btn" onclick="app.deleteContact(${contact.id})">Eliminar</button>
            `;
            container.appendChild(contactDiv);
        });
    }

    updateContactSelects(contacts) {
        const selects = ['message-contact', 'schedule-contact'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Seleccionar contacto</option>';
            
            contacts.forEach(contact => {
                const option = document.createElement('option');
                option.value = contact.id;
                option.textContent = `${contact.name} (${contact.phone})`;
                select.appendChild(option);
            });
        });
    }

    async addContact(e) {
        e.preventDefault();
        
        const name = document.getElementById('contact-name').value;
        const phone = document.getElementById('contact-phone').value;
        
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone })
            });
            
            if (response.ok) {
                this.showAlert('Contacto agregado exitosamente', 'success');
                document.getElementById('contact-form').reset();
                this.loadContacts();
            } else {
                const error = await response.json();
                this.showAlert(error.error, 'error');
            }
        } catch (error) {
            this.showAlert('Error al agregar contacto', 'error');
        }
    }

    async deleteContact(id) {
        if (!confirm('¿Estás seguro de eliminar este contacto?')) return;
        
        try {
            const response = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
            
            if (response.ok) {
                this.showAlert('Contacto eliminado exitosamente', 'success');
                this.loadContacts();
            } else {
                this.showAlert('Error al eliminar contacto', 'error');
            }
        } catch (error) {
            this.showAlert('Error al eliminar contacto', 'error');
        }
    }

    async sendMessage(e) {
        e.preventDefault();
        
        const contactId = document.getElementById('message-contact').value;
        const message = document.getElementById('message-text').value;
        
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId, message })
            });
            
            if (response.ok) {
                this.showAlert('Mensaje enviado exitosamente', 'success');
                document.getElementById('message-form').reset();
                this.loadHistory();
            } else {
                const error = await response.json();
                this.showAlert(error.error, 'error');
            }
        } catch (error) {
            this.showAlert('Error al enviar mensaje', 'error');
        }
    }

    async scheduleMessage(e) {
        e.preventDefault();
        
        const contactId = document.getElementById('schedule-contact').value;
        const message = document.getElementById('schedule-text').value;
        const scheduledTime = document.getElementById('schedule-time').value;
        
        try {
            const response = await fetch('/api/schedule-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId, message, scheduledTime })
            });
            
            if (response.ok) {
                this.showAlert('Mensaje programado exitosamente', 'success');
                document.getElementById('schedule-form').reset();
            } else {
                const error = await response.json();
                this.showAlert(error.error, 'error');
            }
        } catch (error) {
            this.showAlert('Error al programar mensaje', 'error');
        }
    }

    async loadHistory() {
        try {
            const response = await fetch('/api/history');
            const history = await response.json();
            
            const container = document.getElementById('history-container');
            container.innerHTML = '';
            
            const today = new Date().toDateString();
            let messagesToday = 0;
            
            history.forEach(item => {
                const itemDate = new Date(item.sent_at).toDateString();
                if (itemDate === today) messagesToday++;
                
                const historyDiv = document.createElement('div');
                historyDiv.className = 'history-item';
                historyDiv.innerHTML = `
                    <h4>${item.name}</h4>
                    <p>${item.message}</p>
                    <small>${new Date(item.sent_at).toLocaleString()}</small>
                `;
                container.appendChild(historyDiv);
            });
            
            document.getElementById('messages-today').textContent = messagesToday;
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.textContent = message;
        
        document.querySelector('.main-content').insertBefore(alert, document.querySelector('.main-content').firstChild);
        
        setTimeout(() => alert.remove(), 5000);
    }
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover clase active de todos los links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    document.getElementById(sectionId).classList.add('active');
    
    // Agregar clase active al link correspondiente
    event.target.classList.add('active');
}

// Inicializar aplicación
const app = new WhatsAppSender();