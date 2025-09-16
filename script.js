// Checklist Diário - JavaScript com Sistema de Cards
class ChecklistApp {
    constructor() {
        this.cards = [];
        this.currentTheme = 'light';
        this.currentEditingCard = null;
        this.currentEditingTask = null;
        this.confirmCallback = null;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.updateCurrentDate();
        this.renderCards();
        this.updateStats();
        this.loadTheme();
        this.createDefaultCards();
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botões principais
        document.getElementById('add-card-btn').addEventListener('click', () => this.openAddCardModal());
        document.getElementById('clear-completed').addEventListener('click', () => this.clearCompleted());
        document.getElementById('clear-all').addEventListener('click', () => this.clearAll());
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // Botões de backup
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-btn').addEventListener('click', () => this.importData());
        document.getElementById('import-file').addEventListener('change', (e) => this.handleFileImport(e));

        // Botões dos modais
        document.getElementById('save-card-btn').addEventListener('click', () => this.saveCard());
        document.getElementById('save-task-btn').addEventListener('click', () => this.saveTask());
        document.getElementById('confirm-action-btn').addEventListener('click', () => this.confirmAction());

        // Fechar modal clicando no overlay
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Auto-save quando sair da página
        window.addEventListener('beforeunload', () => this.saveToStorage());
    }

    // Criar cards padrão se não existirem
    createDefaultCards() {
        if (this.cards.length === 0) {
            const defaultCards =
            [

            ];
            this.cards = defaultCards;
            this.renderCards();
            this.saveToStorage();
        }
    }

    // Atualizar data atual
    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateString = now.toLocaleDateString('pt-BR', options);
        document.getElementById('current-date').textContent = dateString;
    }

    // === MODAIS ===
    
    // Abrir modal para adicionar card
    openAddCardModal() {
        this.currentEditingCard = null;
        document.getElementById('card-modal-title').textContent = 'Adicionar Card';
        document.getElementById('card-title-input').value = '';
        document.getElementById('card-color-select').value = 'blue';
        this.showModal('card-modal');
    }

    // Abrir modal para editar card
    openEditCardModal(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        this.currentEditingCard = cardId;
        document.getElementById('card-modal-title').textContent = 'Editar Card';
        document.getElementById('card-title-input').value = card.title;
        document.getElementById('card-color-select').value = card.color;
        this.showModal('card-modal');
    }

    // Abrir modal para adicionar tarefa
    openAddTaskModal(cardId) {
        this.currentEditingCard = cardId;
        this.currentEditingTask = null;
        document.getElementById('task-modal-title').textContent = 'Adicionar Tarefa';
        document.getElementById('task-text-input').value = '';
        document.getElementById('task-description-input').value = '';
        document.getElementById('task-priority-select').value = 'media';
        this.showModal('task-modal');
    }

    // Abrir modal para editar tarefa
    openEditTaskModal(cardId, taskId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;
        
        const task = card.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentEditingCard = cardId;
        this.currentEditingTask = taskId;
        document.getElementById('task-modal-title').textContent = 'Editar Tarefa';
        document.getElementById('task-text-input').value = task.text;
        document.getElementById('task-description-input').value = task.description || '';
        document.getElementById('task-priority-select').value = task.priority;
        this.showModal('task-modal');
    }

    // Abrir modal para visualizar descrição
    openDescriptionModal(cardId, taskId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;
        
        const task = card.tasks.find(t => t.id === taskId);
        if (!task || !task.description) return;

        document.getElementById('description-task-title').textContent = task.text;
        document.getElementById('description-task-content').textContent = task.description;
        this.showModal('description-modal');
    }

    // Mostrar modal
    showModal(modalId) {
        document.getElementById('modal-overlay').classList.add('active');
        document.getElementById(modalId).classList.add('active');
    }

    // Fechar modal
    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.currentEditingCard = null;
        this.currentEditingTask = null;
        this.confirmCallback = null;
    }

    // === AÇÕES DOS CARDS E TAREFAS ===

    // Salvar card (adicionar ou editar)
    saveCard() {
        const title = document.getElementById('card-title-input').value.trim();
        const color = document.getElementById('card-color-select').value;

        if (!title) {
            this.showNotification('Por favor, digite um título para o card!', 'warning');
            return;
        }

        if (this.currentEditingCard) {
            // Editar card existente
            const card = this.cards.find(c => c.id === this.currentEditingCard);
            if (card) {
                card.title = title;
                card.color = color;
                this.showNotification('Card editado com sucesso!', 'success');
            }
        } else {
            // Adicionar novo card
            const newCard = {
                id: Date.now().toString(),
                title: title,
                color: color,
                tasks: []
            };
            this.cards.push(newCard);
            this.showNotification('Card adicionado com sucesso!', 'success');
        }

        this.renderCards();
        this.updateStats();
        this.saveToStorage();
        this.closeModal();
    }

    // Salvar tarefa (adicionar ou editar)
    saveTask() {
        const text = document.getElementById('task-text-input').value.trim();
        const description = document.getElementById('task-description-input').value.trim();
        const priority = document.getElementById('task-priority-select').value;

        if (!text) {
            this.showNotification('Por favor, digite um título para a tarefa!', 'warning');
            return;
        }

        const card = this.cards.find(c => c.id === this.currentEditingCard);
        if (!card) return;

        if (this.currentEditingTask) {
            // Editar tarefa existente
            const task = card.tasks.find(t => t.id === this.currentEditingTask);
            if (task) {
                task.text = text;
                task.description = description;
                task.priority = priority;
                this.showNotification('Tarefa editada com sucesso!', 'success');
            }
        } else {
            // Adicionar nova tarefa
            const newTask = {
                id: Date.now().toString(),
                text: text,
                description: description,
                priority: priority,
                completed: false,
                createdAt: new Date().toISOString()
            };
            card.tasks.unshift(newTask);
            this.showNotification('Tarefa adicionada com sucesso!', 'success');
        }

        this.renderCards();
        this.updateStats();
        this.saveToStorage();
        this.closeModal();
    }

    // Alternar status da tarefa
    toggleTask(cardId, taskId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        const task = card.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.renderCards();
            this.updateStats();
            this.saveToStorage();
            
            const message = task.completed ? 'Tarefa concluída!' : 'Tarefa reaberta!';
            this.showNotification(message, 'success');
        }
    }

    // Excluir tarefa com modal customizado
    deleteTask(cardId, taskId) {
        this.showConfirmModal(
            'Excluir Tarefa',
            'Tem certeza que deseja excluir esta tarefa?',
            () => {
                const card = this.cards.find(c => c.id === cardId);
                if (!card) return;

                const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
                if (taskElement) {
                    taskElement.classList.add('removing');
                    setTimeout(() => {
                        card.tasks = card.tasks.filter(t => t.id !== taskId);
                        this.renderCards();
                        this.updateStats();
                        this.saveToStorage();
                        this.showNotification('Tarefa excluída!', 'success');
                    }, 300);
                }
            }
        );
    }

    // Excluir card com modal customizado
    deleteCard(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        this.showConfirmModal(
            'Excluir Card',
            `Tem certeza que deseja excluir o card "${card.title}" e todas as suas tarefas?`,
            () => {
                const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
                if (cardElement) {
                    cardElement.classList.add('removing');
                    setTimeout(() => {
                        this.cards = this.cards.filter(c => c.id !== cardId);
                        this.renderCards();
                        this.updateStats();
                        this.saveToStorage();
                        this.showNotification('Card excluído!', 'success');
                    }, 300);
                }
            }
        );
    }

    // Limpar tarefas concluídas com modal customizado
    clearCompleted() {
        const completedTasks = [];
        this.cards.forEach(card => {
            card.tasks.forEach(task => {
                if (task.completed) completedTasks.push(task);
            });
        });
        
        if (completedTasks.length === 0) {
            this.showNotification('Nenhuma tarefa concluída para limpar!', 'info');
            return;
        }

        this.showConfirmModal(
            'Limpar Concluídas',
            `Excluir ${completedTasks.length} tarefa(s) concluída(s)?`,
            () => {
                this.cards.forEach(card => {
                    card.tasks = card.tasks.filter(t => !t.completed);
                });
                this.renderCards();
                this.updateStats();
                this.saveToStorage();
                this.showNotification(`${completedTasks.length} tarefa(s) excluída(s)!`, 'success');
            }
        );
    }

    // Limpar todas as tarefas com modal customizado
    clearAll() {
        const totalTasks = this.cards.reduce((total, card) => total + card.tasks.length, 0);
        
        if (totalTasks === 0) {
            this.showNotification('Nenhuma tarefa para limpar!', 'info');
            return;
        }

        this.showConfirmModal(
            'Limpar Todas',
            'Excluir TODAS as tarefas? Esta ação não pode ser desfeita!',
            () => {
                this.cards.forEach(card => {
                    card.tasks = [];
                });
                this.renderCards();
                this.updateStats();
                this.saveToStorage();
                this.showNotification('Todas as tarefas foram excluídas!', 'success');
            }
        );
    }

    // Mostrar modal de confirmação customizado
    showConfirmModal(title, message, callback) {
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-message').textContent = message;
        this.confirmCallback = callback;
        this.showModal('confirm-modal');
    }

    // Confirmar ação do modal
    confirmAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
            this.confirmCallback = null;
        }
        this.closeModal();
    }

    // === RENDERIZAÇÃO ===

    // Renderizar cards na tela
    renderCards() {
        const container = document.getElementById('cards-container');
        const emptyState = document.getElementById('empty-state');

        if (this.cards.length === 0) {
            container.innerHTML = '';
            container.appendChild(emptyState);
            return;
        }

        // Remover estado vazio se existir
        if (container.contains(emptyState)) {
            container.removeChild(emptyState);
        }

        container.innerHTML = this.cards.map(card => this.createCardHTML(card)).join('');
    }

    // Criar HTML de um card
    createCardHTML(card) {
        const completedTasks = card.tasks.filter(t => t.completed).length;
        const totalTasks = card.tasks.length;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return `
            <div class="period-card" data-card-id="${card.id}">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-color-indicator ${card.color}"></div>
                        ${this.escapeHtml(card.title)}
                    </div>
                    <div class="card-actions">
                        <button class="card-action-btn add-task-card-btn" 
                                onclick="app.openAddTaskModal('${card.id}')"
                                title="Adicionar tarefa">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="card-action-btn edit-card-btn" 
                                onclick="app.openEditCardModal('${card.id}')"
                                title="Editar card">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="card-action-btn delete-card-btn" 
                                onclick="app.deleteCard('${card.id}')"
                                title="Excluir card">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${totalTasks > 0 ? `
                        <div class="card-progress">
                            <div class="card-progress-text">${completedTasks} de ${totalTasks} tarefas concluídas</div>
                            <div class="card-progress-bar">
                                <div class="card-progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="card-tasks">
                        ${card.tasks.length > 0 ? 
                            card.tasks.map(task => this.createTaskHTML(card.id, task)).join('') :
                            `<div class="card-empty-state">
                                <i class="fas fa-clipboard-list"></i>
                                <p>Nenhuma tarefa ainda</p>
                            </div>`
                        }
                    </div>
                </div>
            </div>
        `;
    }

    // Criar HTML de uma tarefa
    createTaskHTML(cardId, task) {
        const priorityIcons = {
            'alta': 'fas fa-exclamation-circle',
            'media': 'fas fa-minus-circle',
            'baixa': 'fas fa-check-circle'
        };

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="app.toggleTask('${cardId}', '${task.id}')">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                
                <div class="task-content">
                    <div class="task-text">${this.escapeHtml(task.text)}</div>
                    <div class="task-priority ${task.priority}">
                        <i class="${priorityIcons[task.priority]}"></i>
                        ${task.priority.toUpperCase()}
                    </div>
                </div>
                
                <div class="task-actions">
                    ${task.description ? `
                        <button class="task-action-btn view-btn" 
                                onclick="app.openDescriptionModal('${cardId}', '${task.id}')"
                                title="Ver descrição">
                            <i class="fas fa-eye"></i>
                        </button>
                    ` : ''}
                    <button class="task-action-btn edit-btn" 
                            onclick="app.openEditTaskModal('${cardId}', '${task.id}')"
                            title="Editar tarefa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn delete-btn" 
                            onclick="app.deleteTask('${cardId}', '${task.id}')"
                            title="Excluir tarefa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Atualizar estatísticas
    updateStats() {
        let total = 0;
        let completed = 0;
        
        this.cards.forEach(card => {
            total += card.tasks.length;
            completed += card.tasks.filter(t => t.completed).length;
        });
        
        const pending = total - completed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Atualizar elementos do DOM
        document.getElementById('total-tasks').textContent = total;
        document.getElementById('completed-tasks').textContent = completed;
        document.getElementById('pending-tasks').textContent = pending;
        document.getElementById('progress-stats').textContent = `${completed} de ${total} tarefas`;
        document.getElementById('progress-percentage').textContent = `${percentage}%`;

        // Atualizar barra de progresso
        const progressFill = document.getElementById('progress-fill');
        progressFill.style.width = `${percentage}%`;

        // Celebrar quando completar todas as tarefas
        if (total > 0 && completed === total) {
            setTimeout(() => {
                this.showNotification('🎉 Parabéns! Todas as tarefas concluídas!', 'success');
            }, 500);
        }
    }

    // === PERSISTÊNCIA E TEMA ===

    // Alternar tema claro/escuro
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        const themeIcon = document.querySelector('#theme-toggle i');
        themeIcon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        
        localStorage.setItem('checklist-theme', this.currentTheme);
        this.showNotification(`Tema ${this.currentTheme === 'light' ? 'claro' : 'escuro'} ativado!`, 'info');
    }

    // Carregar tema salvo
    loadTheme() {
        const savedTheme = localStorage.getItem('checklist-theme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
            document.documentElement.setAttribute('data-theme', this.currentTheme);
            
            const themeIcon = document.querySelector('#theme-toggle i');
            themeIcon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    // Salvar no localStorage
    saveToStorage() {
        try {
            const data = {
                cards: this.cards,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem('checklist-cards-data', JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.showNotification('Erro ao salvar dados!', 'error');
        }
    }

    // Carregar do localStorage
    loadFromStorage() {
        try {
            const data = localStorage.getItem('checklist-cards-data');
            if (data) {
                const parsed = JSON.parse(data);
                this.cards = parsed.cards || [];
                
                // Verificar se é um novo dia e limpar tarefas se necessário
                this.checkNewDay(parsed.lastSaved);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.cards = [];
        }
    }

    // Verificar se é um novo dia
    checkNewDay(lastSaved) {
        if (!lastSaved) return;
        
        const lastDate = new Date(lastSaved).toDateString();
        const today = new Date().toDateString();
        
        if (lastDate !== today) {
            // Novo dia - perguntar se quer manter tarefas pendentes
            let pendingCount = 0;
            this.cards.forEach(card => {
                pendingCount += card.tasks.filter(t => !t.completed).length;
            });
            
            if (pendingCount > 0) {
                setTimeout(() => {
                    this.showConfirmModal(
                        'Novo Dia!',
                        `Você tem ${pendingCount} tarefa(s) pendente(s). Deseja mantê-las?`,
                        () => {
                            // Manter tarefas pendentes - não fazer nada
                        },
                        () => {
                            // Limpar todas as tarefas
                            this.cards.forEach(card => {
                                card.tasks = [];
                            });
                            this.renderCards();
                            this.updateStats();
                            this.saveToStorage();
                        }
                    );
                }, 1000);
            }
        }
    }

    // === UTILITÁRIOS ===

    // Mostrar notificação
    showNotification(message, type = 'info') {
        // Remover notificação existente
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Criar nova notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Adicionar estilos da notificação
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 16px 20px;
            border-radius: var(--border-radius-sm);
            box-shadow: var(--shadow-lg);
            border-left: 4px solid ${this.getNotificationColor(type)};
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Ícones para notificações
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Cores para notificações
    getNotificationColor(type) {
        const colors = {
            'success': 'var(--success-color)',
            'error': 'var(--danger-color)',
            'warning': 'var(--warning-color)',
            'info': 'var(--primary-color)'
        };
        return colors[type] || colors.info;
    }

    // Escapar HTML para segurança
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // === BACKUP E RESTORE ===

    // Exportar dados para arquivo JSON
    exportData() {
        try {
            const data = {
                cards: this.cards,
                exportDate: new Date().toISOString(),
                version: '2.0',
                appName: 'Checklist Diário'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `checklist-diario-backup-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showNotification('📥 Backup exportado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            this.showNotification('Erro ao exportar dados!', 'error');
        }
    }

    // Importar dados de arquivo JSON
    importData() {
        document.getElementById('import-file').click();
    }

    // Processar arquivo importado
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            this.showNotification('Por favor, selecione um arquivo JSON válido!', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validar estrutura do arquivo
                if (!data.cards || !Array.isArray(data.cards)) {
                    throw new Error('Formato de arquivo inválido');
                }

                // Confirmar importação
                this.showConfirmModal(
                    'Importar Dados',
                    `Importar ${data.cards.length} card(s)? Isso substituirá todos os dados atuais.`,
                    () => {
                        this.cards = data.cards;
                        this.renderCards();
                        this.updateStats();
                        this.saveToStorage();
                        this.showNotification('📤 Dados importados com sucesso!', 'success');
                    }
                );

            } catch (error) {
                console.error('Erro ao importar dados:', error);
                this.showNotification('Erro ao importar arquivo! Verifique se é um backup válido.', 'error');
            }
        };

        reader.readAsText(file);
        // Limpar input para permitir reimportar o mesmo arquivo
        event.target.value = '';
    }
}

// Adicionar estilos para notificações
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-content i {
        font-size: 1.1rem;
    }
`;
document.head.appendChild(notificationStyles);

// Inicializar aplicação quando DOM estiver carregado
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ChecklistApp();
});

// Atalhos de teclado
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + A para adicionar card
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (app) app.openAddCardModal();
    }
    
    // Ctrl/Cmd + D para alternar tema
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (app) app.toggleTheme();
    }
    
    // Ctrl/Cmd + Shift + C para limpar concluídas
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        if (app) app.clearCompleted();
    }
});
