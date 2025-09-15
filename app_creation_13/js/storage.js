// Storage management for R1 Chat
// Handles both R1 Creation Storage API and localStorage fallback

class StorageManager {
    constructor() {
        this.isR1Mode = typeof window.creationStorage !== 'undefined';
        this.storagePrefix = 'r1_chat_';
    }

    // Generic storage methods
    async setItem(key, value) {
        try {
            if (this.isR1Mode) {
                // Use R1 Creation Storage API
                await window.creationStorage.plain.setItem(key, btoa(JSON.stringify(value)));
            } else {
                // Fallback to localStorage
                localStorage.setItem(this.storagePrefix + key, JSON.stringify(value));
            }
            return true;
        } catch (error) {
            console.error('Error setting storage item:', error);
            return false;
        }
    }

    async getItem(key) {
        try {
            if (this.isR1Mode) {
                // Use R1 Creation Storage API
                const stored = await window.creationStorage.plain.getItem(key);
                if (stored) {
                    return JSON.parse(atob(stored));
                }
                return null;
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem(this.storagePrefix + key);
                return stored ? JSON.parse(stored) : null;
            }
        } catch (error) {
            console.error('Error getting storage item:', error);
            return null;
        }
    }

    async removeItem(key) {
        try {
            if (this.isR1Mode) {
                // Use R1 Creation Storage API
                await window.creationStorage.plain.removeItem(key);
            } else {
                // Fallback to localStorage
                localStorage.removeItem(this.storagePrefix + key);
            }
            return true;
        } catch (error) {
            console.error('Error removing storage item:', error);
            return false;
        }
    }

    async clear() {
        try {
            if (this.isR1Mode) {
                // Use R1 Creation Storage API
                await window.creationStorage.plain.clear();
            } else {
                // Clear all localStorage items with our prefix
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(this.storagePrefix)) {
                        localStorage.removeItem(key);
                    }
                });
            }
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    // Specific storage methods for chat app
    async saveUserSettings(settings) {
        return await this.setItem('user_settings', settings);
    }

    async loadUserSettings() {
        const defaultSettings = {
            nickname: 'User',
            textColor: '#ffff00',
            bubbleColor: '#ffff00'
        };
        
        const settings = await this.getItem('user_settings');
        return settings ? { ...defaultSettings, ...settings } : defaultSettings;
    }

    async saveRooms(rooms) {
        return await this.setItem('chat_rooms', rooms);
    }

    async loadRooms() {
        const rooms = await this.getItem('chat_rooms');
        return rooms || [];
    }

    async saveMessages(messages) {
        return await this.setItem('chat_messages', messages);
    }

    async loadMessages() {
        const messages = await this.getItem('chat_messages');
        return messages || [];
    }

    async saveCurrentRoom(room) {
        return await this.setItem('current_room', room);
    }

    async loadCurrentRoom() {
        return await this.getItem('current_room');
    }

    // Export/Import functionality
    async exportData() {
        try {
            const data = {
                settings: await this.loadUserSettings(),
                rooms: await this.loadRooms(),
                messages: await this.loadMessages(),
                currentRoom: await this.loadCurrentRoom(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.version !== '1.0') {
                throw new Error('Unsupported data format version');
            }
            
            // Import each data type
            if (data.settings) {
                await this.saveUserSettings(data.settings);
            }
            
            if (data.rooms) {
                await this.saveRooms(data.rooms);
            }
            
            if (data.messages) {
                await this.saveMessages(data.messages);
            }
            
            if (data.currentRoom) {
                await this.saveCurrentRoom(data.currentRoom);
            }
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Storage statistics
    async getStorageStats() {
        try {
            if (this.isR1Mode) {
                // R1 storage doesn't provide size info easily
                return {
                    mode: 'R1 Creation Storage',
                    available: true
                };
            } else {
                // Calculate localStorage usage
                let totalSize = 0;
                const keys = Object.keys(localStorage);
                
                keys.forEach(key => {
                    if (key.startsWith(this.storagePrefix)) {
                        totalSize += localStorage.getItem(key).length;
                    }
                });
                
                return {
                    mode: 'localStorage',
                    used: totalSize,
                    available: true
                };
            }
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                mode: 'unknown',
                available: false,
                error: error.message
            };
        }
    }

    // Backup and restore
    async createBackup() {
        const data = await this.exportData();
        if (data) {
            // Create downloadable backup
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `r1_chat_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        }
        return false;
    }

    async restoreFromFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const success = await this.importData(e.target.result);
                resolve(success);
            };
            reader.onerror = () => resolve(false);
            reader.readAsText(file);
        });
    }
}

// Create global storage manager instance
window.StorageManager = new StorageManager();

// Convenience functions for backward compatibility
window.saveToStorage = async (key, value) => {
    return await window.StorageManager.setItem(key, value);
};

window.loadFromStorage = async (key) => {
    return await window.StorageManager.getItem(key);
};

// Initialize storage on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check storage availability
    const stats = await window.StorageManager.getStorageStats();
    console.log('Storage stats:', stats);
    
    if (!stats.available) {
        console.warn('Storage not available, some features may not work');
    }
});
