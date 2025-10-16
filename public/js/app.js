class WhatsAppSender {
    constructor() {
        this.init();
        this.checkStatus();
        this.loadGroups();
        this.loadContacts();
        this.loadStats();
        this.loadQueue();
        setInterval(() => this.checkStatus(), 5000);
    }

    init() {
        // Event listeners
        document.getElementById('group-form').addEventListener('submit', (e) => this.addGroup(e));
        document.getElementById('contact-form').addEventListener('submit', (e) => this.addContact(e));
        document.getElementById('edit-contact-form').addEventListener('submit', (e) => this.updateContact(e));
        document.getElementById('bulk-edit-form').addEventListener('submit', (e) => this.bulkUpdateContacts(e));
        document.getElementById('message-form').addEventListener('submit', (e) => this.sendMessage(e));
        document.getElementById('schedule-form').addEventListener('submit', (e) => this.scheduleMessage(e));
        
        // Filter listener
        document.getElementById('filter-group').addEventListener('change', (e) => this.filterContacts(e.target.value));
        
        // Radio button listeners
        document.querySelectorAll('input[name="schedule-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.toggleScheduleType(e.target.value));
        });
        
        this.allContacts = [];
        this.selectedContacts = [];
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            const indicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            const qrContainer = document.getElementById('qr-container');
            const logoutBtn = document.getElementById('logout-btn');
            
            if (data.whatsappReady) {
                indicator.className = 'status-indicator connected';
                statusText.textContent = 'Conectado';
                qrContainer.style.display = 'none';
                logoutBtn.style.display = 'inline-block';
            } else if (data.qrCode) {
                indicator.className = 'status-indicator connecting';
                statusText.textContent = 'Esperando escaneo QR';
                document.getElementById('qr-code').src = data.qrCode;
                qrContainer.style.display = 'block';
                logoutBtn.style.display = 'none';
            } else {
                indicator.className = 'status-indicator disconnected';
                statusText.textContent = 'Desconectado';
                qrContainer.style.display = 'none';
                logoutBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    }

    async loadContacts() {
        try {
            const response = await fetch('/api/contacts');
            const contacts = await response.json();
            
            this.allContacts = contacts;
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
                <div class="contact-checkbox">
                    <input type="checkbox" id="contact-${contact.id}" value="${contact.id}" onchange="app.toggleContactSelection(${contact.id})">
                </div>
                <div class="contact-info">
                    <h4>${contact.name}</h4>
                    <p>${contact.phone}</p>
                    ${contact.group_name ? `<small>Grupo: ${contact.group_name}</small>` : ''}
                </div>
                <div class="contact-actions">
                    <button class="edit-btn" onclick="app.editContact(${contact.id})">Editar</button>
                    <button class="delete-btn" onclick="app.deleteContact(${contact.id})">Eliminar</button>
                </div>
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

    async loadGroups() {
        try {
            const response = await fetch('/api/groups');
            const groups = await response.json();
            
            this.displayGroups(groups);
            this.updateGroupSelects(groups);
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    displayGroups(groups) {
        const container = document.getElementById('groups-container');
        container.innerHTML = '';
        
        groups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'contact-item';
            groupDiv.innerHTML = `
                <div class="contact-info">
                    <h4>${group.name}</h4>
                    ${group.description ? `<p>${group.description}</p>` : ''}
                </div>
            `;
            container.appendChild(groupDiv);
        });
    }

    updateGroupSelects(groups) {
        const selects = ['contact-group', 'schedule-group', 'edit-contact-group', 'filter-group', 'bulk-group'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const currentValue = select.value;
            
            if (selectId === 'contact-group' || selectId === 'edit-contact-group') {
                select.innerHTML = '<option value="">Sin grupo</option>';
            } else if (selectId === 'filter-group') {
                select.innerHTML = '<option value="">Todos los grupos</option><option value="null">Sin grupo</option>';
            } else if (selectId === 'bulk-group') {
                select.innerHTML = '<option value="">Seleccionar nuevo grupo</option><option value="null">Sin grupo</option>';
            } else {
                select.innerHTML = '<option value="">Seleccionar grupo</option>';
            }
            
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        });
    }

    async addGroup(e) {
        e.preventDefault();
        
        const name = document.getElementById('group-name').value;
        const description = document.getElementById('group-description').value;
        
        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });
            
            if (response.ok) {
                this.showAlert('Grupo creado exitosamente', 'success');
                document.getElementById('group-form').reset();
                this.loadGroups();
            } else {
                const error = await response.json();
                this.showAlert(error.error, 'error');
            }
        } catch (error) {
            this.showAlert('Error al crear grupo', 'error');
        }
    }

    togglePhoneInput(selectId, inputId) {
        const select = document.getElementById(selectId);
        const input = document.getElementById(inputId);
        
        if (select.value === 'custom') {
            input.placeholder = 'Número completo (ej: 5213511285647)';
        } else {
            input.placeholder = '3511285647';
        }
    }

    async addContact(e) {
        e.preventDefault();
        
        const name = document.getElementById('contact-name').value;
        const countryCode = document.getElementById('country-code').value;
        const phoneNumber = document.getElementById('contact-phone').value;
        const phone = countryCode === 'custom' ? phoneNumber : countryCode + phoneNumber;
        const groupId = document.getElementById('contact-group').value || null;
        
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, groupId })
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

    toggleMessageType(formType) {
        const imageInput = document.getElementById(`${formType}-image`);
        const messageType = document.querySelector(`input[name="${formType === 'message' ? 'message-type' : 'schedule-message-type'}"]:checked`).value;
        
        if (messageType === 'media') {
            imageInput.style.display = 'block';
            imageInput.required = true;
        } else {
            imageInput.style.display = 'none';
            imageInput.required = false;
        }
    }

    async sendMessage(e) {
        e.preventDefault();
        
        const contactId = document.getElementById('message-contact').value;
        const message = document.getElementById('message-text').value;
        const imageFile = document.getElementById('message-image').files[0];
        
        try {
            const formData = new FormData();
            formData.append('contactId', contactId);
            formData.append('message', message);
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            const response = await fetch('/api/send-message', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                this.showAlert('Mensaje enviado exitosamente', 'success');
                document.getElementById('message-form').reset();
                this.toggleMessageType('message');
                this.loadStats();
            } else {
                const error = await response.json();
                this.showAlert(error.error, 'error');
            }
        } catch (error) {
            this.showAlert('Error al enviar mensaje', 'error');
        }
    }

    toggleScheduleType(type) {
        const contactSelect = document.getElementById('schedule-contact');
        const groupSelect = document.getElementById('schedule-group');
        
        if (type === 'contact') {
            contactSelect.style.display = 'block';
            contactSelect.required = true;
            groupSelect.style.display = 'none';
            groupSelect.required = false;
        } else {
            contactSelect.style.display = 'none';
            contactSelect.required = false;
            groupSelect.style.display = 'block';
            groupSelect.required = true;
        }
    }

    async scheduleMessage(e) {
        e.preventDefault();
        
        const scheduleType = document.querySelector('input[name="schedule-type"]:checked').value;
        const contactId = scheduleType === 'contact' ? document.getElementById('schedule-contact').value : null;
        const groupId = scheduleType === 'group' ? document.getElementById('schedule-group').value : null;
        const message = document.getElementById('schedule-text').value;
        const scheduledTime = document.getElementById('schedule-time').value;
        const delaySeconds = parseInt(document.getElementById('message-delay').value) || 10;
        const imageFile = document.getElementById('schedule-image').files[0];
        
        try {
            const formData = new FormData();
            formData.append('contactId', contactId || '');
            formData.append('groupId', groupId || '');
            formData.append('message', message);
            formData.append('scheduledTime', scheduledTime);
            formData.append('delaySeconds', delaySeconds);
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            const response = await fetch('/api/schedule-message', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                this.showAlert('Mensaje programado exitosamente', 'success');
                document.getElementById('schedule-form').reset();
                document.getElementById('message-delay').value = 10;
                this.toggleScheduleType('contact');
                this.toggleMessageType('schedule');
                document.querySelector('input[name="schedule-type"][value="contact"]').checked = true;
                document.querySelector('input[name="schedule-message-type"][value="text"]').checked = true;
                this.loadQueue();
            } else {
                const error = await response.json();
                this.showAlert(error.error, 'error');
            }
        } catch (error) {
            this.showAlert('Error al programar mensaje', 'error');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            const container = document.getElementById('stats-container');
            container.innerHTML = '';
            
            const today = new Date().toISOString().split('T')[0];
            const todayStats = stats.find(s => s.date === today) || { messages_sent: 0 };
            
            document.getElementById('messages-today').textContent = todayStats.messages_sent;
            
            stats.forEach(stat => {
                const statDiv = document.createElement('div');
                statDiv.className = 'stat-item';
                statDiv.innerHTML = `
                    <div class="stat-date">${new Date(stat.date).toLocaleDateString()}</div>
                    <div class="stat-details">
                        <span>Mensajes: ${stat.messages_sent}</span>
                        <span>Contactos: ${stat.contacts_reached}</span>
                        <span>Grupos: ${stat.groups_messaged}</span>
                    </div>
                `;
                container.appendChild(statDiv);
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadQueue() {
        try {
            const response = await fetch('/api/queue');
            const queue = await response.json();
            
            const container = document.getElementById('queue-container');
            container.innerHTML = '';
            
            if (queue.length === 0) {
                container.innerHTML = '<p>No hay mensajes programados</p>';
                return;
            }
            
            queue.forEach(item => {
                const queueDiv = document.createElement('div');
                queueDiv.className = 'queue-item';
                
                // Convertir fecha correctamente
                let scheduledTime;
                let dateStr = item.scheduled_time;
                
                // Agregar segundos si no los tiene
                if (dateStr.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
                    dateStr += ':00';
                }
                scheduledTime = new Date(dateStr);
                
                const target = item.type === 'individual' ? item.contact_name : `Grupo: ${item.group_name}`;
                
                queueDiv.innerHTML = `
                    <div class="queue-info">
                        <h4>${target}</h4>
                        <p>${item.message}</p>
                        ${item.image_path ? '<small class="image-indicator">📷 Con imagen</small>' : ''}
                        <small>Programado para: ${scheduledTime.toLocaleString()}</small>
                    </div>
                    <div class="queue-actions">
                        <span class="queue-type">${item.type === 'individual' ? 'Individual' : 'Grupo'}</span>
                        <button class="delete-btn" onclick="app.deleteQueueItem(${item.id})">Eliminar</button>
                    </div>
                `;
                container.appendChild(queueDiv);
            });
        } catch (error) {
            console.error('Error loading queue:', error);
        }
    }

    async clearQueue() {
        if (!confirm('¿Estás seguro de eliminar todos los mensajes programados?')) return;
        
        try {
            const response = await fetch('/api/queue', { method: 'DELETE' });
            
            if (response.ok) {
                this.showAlert('Cola de mensajes limpiada exitosamente', 'success');
                this.loadQueue();
            } else {
                this.showAlert('Error al limpiar cola', 'error');
            }
        } catch (error) {
            this.showAlert('Error al limpiar cola', 'error');
        }
    }

    async deleteQueueItem(id) {
        if (!confirm('¿Estás seguro de eliminar este mensaje programado?')) return;
        
        try {
            const response = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
            
            if (response.ok) {
                this.showAlert('Mensaje eliminado exitosamente', 'success');
                this.loadQueue();
            } else {
                this.showAlert('Error al eliminar mensaje', 'error');
            }
        } catch (error) {
            this.showAlert('Error al eliminar mensaje', 'error');
        }
    }

    async importWhatsAppContacts() {
        try {
            const response = await fetch('/api/whatsapp-contacts');
            const whatsappContacts = await response.json();
            
            if (whatsappContacts.length === 0) {
                this.showAlert('No se encontraron contactos en WhatsApp', 'error');
                return;
            }
            
            const contacts = whatsappContacts
                .filter(contact => {
                    const cleanPhone = contact.number.replace(/\D/g, '');
                    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
                })
                .map(contact => ({
                    name: contact.name || contact.pushname || contact.number,
                    phone: contact.number.replace(/\D/g, ''),
                    groupId: null
                }));
            
            const importResponse = await fetch('/api/import-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts })
            });
            
            const result = await importResponse.json();
            this.showAlert(`Importados: ${result.imported} contactos. Errores: ${result.errors.length}`, 'success');
            this.loadContacts();
        } catch (error) {
            this.showAlert('Error al importar contactos de WhatsApp', 'error');
        }
    }

    async importFromExcel(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            let result;
            
            if (file.name.endsWith('.csv')) {
                const text = await file.text();
                const contacts = this.parseCSV(text);
                
                const response = await fetch('/api/import-contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contacts })
                });
                result = await response.json();
            } else {
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch('/api/import-excel', {
                    method: 'POST',
                    body: formData
                });
                result = await response.json();
            }
            
            this.showAlert(`Importados: ${result.imported} contactos. Errores: ${result.errors.length}`, 'success');
            this.loadContacts();
        } catch (error) {
            this.showAlert('Error al procesar archivo', 'error');
        }
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const contacts = [];
        
        for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
            if (columns.length >= 2) {
                contacts.push({
                    name: columns[0],
                    phone: columns[1].replace(/\D/g, ''),
                    groupId: null
                });
            }
        }
        
        return contacts;
    }

    async cleanContacts() {
        if (!confirm('¿Estás seguro de limpiar contactos? Esto eliminará duplicados y números inválidos.')) return;
        
        try {
            const response = await fetch('/api/clean-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(`Limpieza completada: ${result.cleaned} inválidos y ${result.duplicates} duplicados eliminados`, 'success');
                this.loadContacts();
            } else {
                this.showAlert(result.error || 'Error al limpiar contactos', 'error');
            }
        } catch (error) {
            this.showAlert('Error al limpiar contactos', 'error');
        }
    }

    async logout() {
        if (!confirm('¿Estás seguro de cerrar la sesión de WhatsApp?')) return;
        
        try {
            const response = await fetch('/api/logout', { method: 'POST' });
            
            if (response.ok) {
                this.showAlert('Sesión cerrada exitosamente', 'success');
                this.checkStatus();
            } else {
                const error = await response.json();
                this.showAlert(error.error, 'error');
            }
        } catch (error) {
            this.showAlert('Error al cerrar sesión', 'error');
        }
    }

    async editContact(id) {
        try {
            const response = await fetch(`/api/contacts/${id}`);
            const contact = await response.json();
            
            // Separar código de país del número
            let countryCode = 'custom';
            let phoneNumber = contact.phone;
            
            if (contact.phone.startsWith('521')) {
                countryCode = '521';
                phoneNumber = contact.phone.substring(3);
            } else if (contact.phone.startsWith('57')) {
                countryCode = '57';
                phoneNumber = contact.phone.substring(2);
            } else if (contact.phone.startsWith('34')) {
                countryCode = '34';
                phoneNumber = contact.phone.substring(2);
            } else if (contact.phone.startsWith('54')) {
                countryCode = '54';
                phoneNumber = contact.phone.substring(2);
            } else if (contact.phone.startsWith('1')) {
                countryCode = '1';
                phoneNumber = contact.phone.substring(1);
            }
            
            document.getElementById('edit-contact-id').value = contact.id;
            document.getElementById('edit-contact-name').value = contact.name;
            document.getElementById('edit-country-code').value = countryCode;
            document.getElementById('edit-contact-phone').value = phoneNumber;
            document.getElementById('edit-contact-group').value = contact.group_id || '';
            
            this.togglePhoneInput('edit-country-code', 'edit-contact-phone');
            document.getElementById('edit-contact-modal').style.display = 'block';
        } catch (error) {
            this.showAlert('Error al cargar contacto', 'error');
        }
    }

    async updateContact(e) {
        e.preventDefault();
        
        const id = document.getElementById('edit-contact-id').value;
        const name = document.getElementById('edit-contact-name').value;
        const countryCode = document.getElementById('edit-country-code').value;
        const phoneNumber = document.getElementById('edit-contact-phone').value;
        const phone = countryCode === 'custom' ? phoneNumber : countryCode + phoneNumber;
        const groupId = document.getElementById('edit-contact-group').value || null;
        
        try {
            const response = await fetch(`/api/contacts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, groupId })
            });
            
            if (response.ok) {
                this.showAlert('Contacto actualizado exitosamente', 'success');
                this.closeEditModal();
                this.loadContacts();
            } else {
                const error = await response.json();
                this.showAlert(error.error, 'error');
            }
        } catch (error) {
            this.showAlert('Error al actualizar contacto', 'error');
        }
    }

    closeEditModal() {
        document.getElementById('edit-contact-modal').style.display = 'none';
    }

    filterContacts(groupId) {
        let filteredContacts = this.allContacts;
        
        if (groupId === 'null') {
            filteredContacts = this.allContacts.filter(c => !c.group_id);
        } else if (groupId) {
            filteredContacts = this.allContacts.filter(c => c.group_id == groupId);
        }
        
        this.displayContacts(filteredContacts);
        this.selectedContacts = [];
        this.updateBulkEditButton();
    }

    toggleContactSelection(contactId) {
        const index = this.selectedContacts.indexOf(contactId);
        if (index > -1) {
            this.selectedContacts.splice(index, 1);
        } else {
            this.selectedContacts.push(contactId);
        }
        this.updateBulkEditButton();
    }

    updateBulkEditButton() {
        const button = document.getElementById('bulk-edit-btn');
        if (this.selectedContacts.length > 0) {
            button.style.display = 'inline-block';
            button.textContent = `Editar ${this.selectedContacts.length} Seleccionados`;
        } else {
            button.style.display = 'none';
        }
    }

    showBulkEdit() {
        document.getElementById('selected-count').textContent = `${this.selectedContacts.length} contactos seleccionados`;
        document.getElementById('bulk-edit-modal').style.display = 'block';
    }

    closeBulkEditModal() {
        document.getElementById('bulk-edit-modal').style.display = 'none';
    }

    async bulkUpdateContacts(e) {
        e.preventDefault();
        
        const groupId = document.getElementById('bulk-group').value;
        
        if (!groupId) {
            this.showAlert('Selecciona un grupo', 'error');
            return;
        }
        
        if (this.selectedContacts.length === 0) {
            this.showAlert('Selecciona al menos un contacto', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/contacts/bulk-update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contactIds: this.selectedContacts, 
                    groupId: groupId === 'null' ? null : groupId
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showAlert(`${result.updated || 0} contactos actualizados exitosamente`, 'success');
                this.closeBulkEditModal();
                this.selectedContacts = [];
                this.updateBulkEditButton();
                this.loadContacts();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Error al actualizar', 'error');
            }
        } catch (error) {
            this.showAlert('Error al actualizar contactos', 'error');
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