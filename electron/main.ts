
import { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage, globalShortcut } from 'electron';
import path from 'path';
import { platform } from 'os';
import fs from 'fs';
import { initializeDatabase } from './database';
import { apiHandler } from './api';

declare const __dirname: string;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Initialize the database
const db = initializeDatabase(app.getPath('userData'));

// Window state persistence
interface WindowState {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized: boolean;
}

const getWindowState = (): WindowState => {
    try {
        const data = fs.readFileSync(path.join(app.getPath('userData'), 'window-state.json'), 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { width: 1400, height: 900, isMaximized: true };
    }
};

const saveWindowState = (state: WindowState) => {
    fs.writeFileSync(path.join(app.getPath('userData'), 'window-state.json'), JSON.stringify(state));
};

function createMenu() {
    const template: any[] = [
        {
            label: 'الملف',
            submenu: [
                { label: 'نسخة احتياطية الآن', click: () => mainWindow?.webContents.send('trigger-backup') },
                { type: 'separator' },
                { label: 'خروج', click: () => { isQuitting = true; app.quit(); } }
            ]
        },
        {
            label: 'تعديل',
            submenu: [
                { label: 'تراجع', role: 'undo' },
                { label: 'إعادة', role: 'redo' },
                { type: 'separator' },
                { label: 'قص', role: 'cut' },
                { label: 'نسخ', role: 'copy' },
                { label: 'لصق', role: 'paste' }
            ]
        },
        {
            label: 'عرض',
            submenu: [
                { label: 'إعادة تحميل', role: 'reload' },
                { label: 'تكبير/تصغير', role: 'togglefullscreen' },
                { type: 'separator' },
                { label: 'أدوات المطور', role: 'toggleDevTools' }
            ]
        },
        {
            label: 'مساعدة',
            submenu: [
                { label: 'عن النظام', click: () => dialog.showMessageBox({ title: 'Rentrix ERP', message: 'نظام إدارة العقارات - إصدار 1.5.0\nمشاريع جودة الإنطلاقة' }) }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createTray() {
    // Use a placeholder icon if icon.png doesn't exist
    const iconPath = path.join(__dirname, '../assets/icon.png');
    const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'فتح Rentrix', click: () => mainWindow?.show() },
        { label: 'نسخة احتياطية سريعة', click: () => mainWindow?.webContents.send('trigger-backup') },
        { type: 'separator' },
        { label: 'إغلاق تماماً', click: () => { isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('Rentrix ERP');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow?.show());
}

function createWindow() {
    const state = getWindowState();

    mainWindow = new BrowserWindow({
        width: state.width,
        height: state.height,
        x: state.x,
        y: state.y,
        minWidth: 1024,
        minHeight: 768,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        },
        title: "Rentrix ERP - إدارة العقارات",
        icon: path.join(__dirname, '../assets/icon.png')
    });

    if (state.isMaximized) {
        mainWindow.maximize();
    }

    // Load the local index.html from the dist folder
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
    } else {
        // Fallback for development if dist doesn't exist yet
        mainWindow.loadURL('http://localhost:3000');
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        } else {
            const bounds = mainWindow?.getBounds();
            saveWindowState({
                width: bounds?.width || 1400,
                height: bounds?.height || 900,
                x: bounds?.x,
                y: bounds?.y,
                isMaximized: mainWindow?.isMaximized() || false
            });
        }
    });

    createMenu();
    createTray();
    registerShortcuts();
}

function registerShortcuts() {
    // Renderer will handle most, but we can register some global ones if needed
    // For this app, we'll mostly use local shortcuts in the renderer
}

// Auto-backup logic (every 24 hours)
function setupAutoBackup() {
    const backupInterval = 24 * 60 * 60 * 1000; // 24 hours
    setInterval(() => {
        console.log('Running scheduled auto-backup...');
        mainWindow?.webContents.send('trigger-backup', { isAuto: true });
    }, backupInterval);
}

app.whenReady().then(() => {
    ipcMain.handle('api', (event, { domain, action, payload }) => {
        return apiHandler(db, domain, action, payload);
    });

    createWindow();
    setupAutoBackup();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    db.close();
    if (platform() !== 'darwin') app.quit();
});

// IPC Handlers for Native File Dialogs
ipcMain.handle('show-save-dialog', async (event, defaultPath) => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'حفظ نسخة احتياطية من قاعدة البيانات',
        defaultPath: defaultPath,
        filters: [{ name: 'Rentrix Backup', extensions: ['json'] }]
    });
    return filePath;
});

ipcMain.handle('write-file', (event, filePath, content) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('show-open-dialog', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'استعادة النظام من نسخة احتياطية',
        properties: ['openFile'],
        filters: [{ name: 'Rentrix Backup', extensions: ['json'] }]
    });
    return filePaths.length > 0 ? filePaths[0] : null;
});

ipcMain.handle('read-file', (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-app-version', () => app.getVersion());
