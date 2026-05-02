
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // Main API bridge for business logic
    invoke: (channel: string, data: any) => {
        let validChannels = ['api']; // Whitelist of valid channels
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    },

    // File operation bridges
    saveBackup: async (defaultPath: string, content: string) => {
        const filePath = await ipcRenderer.invoke('show-save-dialog', defaultPath);
        if (filePath) {
            return await ipcRenderer.invoke('write-file', filePath, content);
        }
        return { success: false, error: 'Save cancelled by user.' };
    },
    loadBackup: async () => {
        const filePath = await ipcRenderer.invoke('show-open-dialog');
        if (filePath) {
            return await ipcRenderer.invoke('read-file', filePath);
        }
        return { success: false, error: 'Open cancelled by user.' };
    },
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onBackupTriggered: (callback: (data: any) => void) => {
        ipcRenderer.on('trigger-backup', (event, data) => callback(data));
    }
});
