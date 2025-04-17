require('electron')

// Import the 'app', 'BrowserWindow', 'ipcMain', and 'dialog' modules from the electron package
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
// path is a built-in Node.js module, not a package
// The path module provides utilities for working with file and directory paths
// It can:
// - Join path segments using path.join()
// - Resolve absolute paths using path.resolve()
// - Get directory name using path.dirname()
// - Get file extension using path.extname()
// - Get file name using path.basename()
// - Normalize paths using path.normalize()
const path = require('path')
const fs = require('fs').promises

let mainWindow;

// Define a function that creates the main application window
const createWindow = () => {
    // Create a new browser window with specified dimensions
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // Set Content-Security-Policy
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com"]
            }
        })
    });

    mainWindow.loadFile('index.html')
    mainWindow.webContents.openDevTools()
}
        
// Wait for the app to be ready, then create the window
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// Handle opening files
ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Text Files', extensions: ['txt', 'js', 'py', 'html', 'css', 'json', 'md'] }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const content = await fs.readFile(filePath, 'utf8');
        return {
            path: filePath,
            content: content,
            name: path.basename(filePath)
        };
    }
    return null;
});

// Handle saving files
ipcMain.handle('save-file', async (event, { filePath, content }) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        return false;
    }
});

// Handle save as dialog
ipcMain.handle('save-file-dialog', async (event, { content, defaultPath }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultPath,
        filters: [
            { name: 'Text Files', extensions: ['txt', 'js', 'py', 'html', 'css', 'json', 'md'] }
        ]
    });
    
    if (!result.canceled && result.filePath) {
        try {
            await fs.writeFile(result.filePath, content, 'utf8');
            return {
                success: true,
                path: result.filePath,
                name: path.basename(result.filePath)
            };
        } catch (error) {
            console.error('Error saving file:', error);
            return { success: false };
        }
    }
    return { success: false };
});

