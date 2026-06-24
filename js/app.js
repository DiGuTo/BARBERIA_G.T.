const STORAGE_KEY = 'barberiaSchedule';
const SESSION_KEY = 'barberiaUser';
const SLOT_MIN_HOUR = 7;
const SLOT_MAX_HOUR = 21;
const SLOT_INTERVAL_MINUTES = 30;

function getStoredSchedule() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
}

function saveStoredSchedule(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getUserSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
}

function setUserSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

function buildTimeSlots() {
    const slots = [];
    let hour = SLOT_MIN_HOUR;
    let minute = 0;

    while (hour < SLOT_MAX_HOUR || (hour === SLOT_MAX_HOUR && minute === 0)) {
        const hourString = String(hour).padStart(2, '0');
        const minuteString = String(minute).padStart(2, '0');
        slots.push(`${hourString}:${minuteString}`);

        minute += SLOT_INTERVAL_MINUTES;
        if (minute >= 60) {
            minute = 0;
            hour += 1;
        }
    }

    return slots;
}

function formatSlotLabel(slot) {
    const [hour, minute] = slot.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = ((hour + 11) % 12) + 1;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function getDateKey(dateValue) {
    if (!dateValue) return null;
    return dateValue;
}

function ensureDateSchedule(dateKey) {
    const schedule = getStoredSchedule();
    if (!schedule[dateKey]) {
        schedule[dateKey] = {};
        buildTimeSlots().forEach(slot => {
            schedule[dateKey][slot] = 'occupied';
        });
        saveStoredSchedule(schedule);
    }
    return schedule[dateKey];
}

function updateWelcomeText(user) {
    const welcomeText = document.getElementById('welcomeText');
    if (!welcomeText) return;
    const roleNames = {
        administrator: 'Administrador',
        employee: 'Empleado',
        client: 'Cliente'
    };
    welcomeText.textContent = `Has ingresado como ${roleNames[user.role] || 'usuario'}.`;
}

function renderEmployeeSlots(dateKey) {
    const container = document.getElementById('employeeSlots');
    if (!container || !dateKey) return;
    const scheduleRoot = getStoredSchedule();
    const schedule = ensureDateSchedule(dateKey);
    container.innerHTML = '';
    buildTimeSlots().forEach(slot => {
        const slotButton = document.createElement('button');
        slotButton.type = 'button';
        slotButton.className = `slot-item ${schedule[slot] === 'available' ? 'available' : 'occupied'}`;
        slotButton.textContent = `${formatSlotLabel(slot)} ${schedule[slot] === 'available' ? 'Disponible' : 'Ocupado'}`;
        slotButton.addEventListener('click', () => {
            schedule[slot] = schedule[slot] === 'available' ? 'occupied' : 'available';
            scheduleRoot[dateKey] = schedule;
            saveStoredSchedule(scheduleRoot);
            renderEmployeeSlots(dateKey);
            updateAdminSummary();
        });
        container.appendChild(slotButton);
    });
}

function renderClientSlots(dateKey) {
    const container = document.getElementById('clientSlots');
    if (!container || !dateKey) return;
    const schedule = ensureDateSchedule(dateKey);
    container.innerHTML = '';
    const availableSlots = buildTimeSlots().filter(slot => schedule[slot] === 'available');
    if (availableSlots.length === 0) {
        const message = document.createElement('p');
        message.className = 'empty-message';
        message.textContent = 'No hay horarios disponibles para esta fecha. Pide al empleado que marque slots disponibles.';
        container.appendChild(message);
        return;
    }

    availableSlots.forEach(slot => {
        const slotButton = document.createElement('button');
        slotButton.type = 'button';
        slotButton.className = 'slot-item available';
        slotButton.textContent = `${formatSlotLabel(slot)} - Reservar`;
        slotButton.addEventListener('click', () => {
            if (!confirm(`Reservar la cita para ${formatSlotLabel(slot)}?`)) {
                return;
            }
            schedule[slot] = 'occupied';
            saveStoredSchedule(getStoredSchedule());
            renderClientSlots(dateKey);
            updateAdminSummary();
        });
        container.appendChild(slotButton);
    });
}

function populateAdminSummary() {
    const schedule = getStoredSchedule();
    const dates = Object.keys(schedule).sort();
    const availableCount = dates.reduce((total, date) => {
        return total + Object.values(schedule[date]).filter(value => value === 'available').length;
    }, 0);
    const occupiedCount = dates.reduce((total, date) => {
        return total + Object.values(schedule[date]).filter(value => value === 'occupied').length;
    }, 0);

    document.getElementById('adminDatesCount').textContent = dates.length;
    document.getElementById('adminAvailableCount').textContent = availableCount;
    document.getElementById('adminOccupiedCount').textContent = occupiedCount;

    const listContainer = document.getElementById('adminDateList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (dates.length === 0) {
        const message = document.createElement('p');
        message.className = 'empty-message';
        message.textContent = 'No hay fechas registradas todavía.';
        listContainer.appendChild(message);
        return;
    }

    dates.forEach(date => {
        const dateItem = document.createElement('div');
        dateItem.className = 'admin-list-item';
        const values = Object.values(schedule[date]);
        const available = values.filter(value => value === 'available').length;
        const occupied = values.filter(value => value === 'occupied').length;
        dateItem.innerHTML = `<strong>${date}</strong><span>Disponible: ${available}</span><span>Ocupado: ${occupied}</span>`;
        listContainer.appendChild(dateItem);
    });
}

function updateAdminSummary() {
    const adminPanel = document.getElementById('adminPanel');
    if (!adminPanel || adminPanel.classList.contains('hidden')) {
        return;
    }
    populateAdminSummary();
}

function showRolePanel(user) {
    const noSession = document.getElementById('noSession');
    const adminPanel = document.getElementById('adminPanel');
    const employeePanel = document.getElementById('employeePanel');
    const clientPanel = document.getElementById('clientPanel');

    const allPanels = [adminPanel, employeePanel, clientPanel];
    allPanels.forEach(panel => panel && panel.classList.add('hidden'));

    if (!user) {
        noSession.classList.remove('hidden');
        return;
    }

    noSession.classList.add('hidden');
    updateWelcomeText(user);

    if (user.role === 'administrator') {
        adminPanel.classList.remove('hidden');
        populateAdminSummary();
        return;
    }

    if (user.role === 'employee') {
        employeePanel.classList.remove('hidden');
        const dateInput = document.getElementById('employeeDate');
        const dateValue = dateInput.value || new Date().toISOString().slice(0, 10);
        dateInput.value = dateValue;
        renderEmployeeSlots(dateValue);
        return;
    }

    if (user.role === 'client') {
        clientPanel.classList.remove('hidden');
        const dateInput = document.getElementById('clientDate');
        const dateValue = dateInput.value || new Date().toISOString().slice(0, 10);
        dateInput.value = dateValue;
        renderClientSlots(dateValue);
    }
}

function setupSchedulePage() {
    const user = getUserSession();
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            clearSession();
            window.location.href = 'login.html';
        });
    }

    const employeeDate = document.getElementById('employeeDate');
    if (employeeDate) {
        employeeDate.addEventListener('change', () => {
            const dateKey = getDateKey(employeeDate.value);
            if (dateKey) renderEmployeeSlots(dateKey);
        });
    }

    const clientDate = document.getElementById('clientDate');
    if (clientDate) {
        clientDate.addEventListener('change', () => {
            const dateKey = getDateKey(clientDate.value);
            if (dateKey) renderClientSlots(dateKey);
        });
    }

    const adminReset = document.getElementById('adminReset');
    if (adminReset) {
        adminReset.addEventListener('click', () => {
            if (!confirm('¿Deseas borrar toda la agenda y los horarios guardados?')) {
                return;
            }
            localStorage.removeItem(STORAGE_KEY);
            populateAdminSummary();
        });
    }

    showRolePanel(user);
}

function setupLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', event => {
        event.preventDefault();
        const username = document.getElementById('username').value.trim();
        const role = document.getElementById('role').value;
        const password = document.getElementById('password').value;

        if (!username || !role) {
            alert('Completa usuario y rol para continuar.');
            return;
        }

        setUserSession({ username, role, password });
        window.location.href = 'schedule.html';
    });
}

function initApp() {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('login.html')) {
        setupLoginPage();
    }
    if (path.endsWith('schedule.html')) {
        setupSchedulePage();
    }
}

initApp();
