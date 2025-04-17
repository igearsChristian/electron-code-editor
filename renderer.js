// Configure Monaco Editor loader
require.config({
    paths: {
        'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.32.1/min/vs'
    }
});

let editor;
const openFiles = new Map(); // Changed to Map to store file paths
let tabs;
let fileList;

// Initialize toolbar buttons
function initializeToolbarButtons() {
    console.log('Initializing toolbar buttons...');
    const newButton = document.getElementById('toolbar-new');
    const openButton = document.getElementById('toolbar-open');
    const saveButton = document.getElementById('toolbar-save');
    const saveAsButton = document.getElementById('toolbar-save-as');

    console.log('Buttons found:', {
        new: !!newButton,
        open: !!openButton,
        save: !!saveButton,
        saveAs: !!saveAsButton
    });

    if (newButton) {
        newButton.addEventListener('click', () => {
            console.log('New button clicked');
            const newFile = {
                path: `untitled-${Date.now()}.txt`,
                content: '// New File',
                name: 'untitled.txt'
            };
            openFileContent(newFile);
        });
    }

    if (openButton) {
        openButton.addEventListener('click', () => {
            console.log('Open button clicked');
            openFileDialog();
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            console.log('Save button clicked');
            saveCurrentFile();
        });
    }

    if (saveAsButton) {
        saveAsButton.addEventListener('click', () => {
            console.log('Save As button clicked');
            saveFileAs();
        });
    }
}

// Initialize DOM elements and buttons when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    tabs = document.getElementById('tabs');
    fileList = document.getElementById('fileList');
    
    // Initialize toolbar buttons
    initializeToolbarButtons();
    
    console.log('Elements initialized:', {
        tabs: !!tabs,
        fileList: !!fileList
    });
});

// Initialize Monaco Editor
let editorInitialized = false;
require(['vs/editor/editor.main'], function () {
    console.log('Monaco editor initializing...');
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: '// Welcome to the Code Editor\n',
        language: 'javascript',
        theme: 'vs-dark',
        minimap: {
            enabled: true
        },
        automaticLayout: true
    });

    // Add keyboard shortcuts for save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveCurrentFile();
    });

    editorInitialized = true;
    console.log('Monaco editor initialized');
});

let currentFile = null;

// Handle file opening
async function openFileDialog() {
    console.log('Opening file dialog...');
    if (!editorInitialized) {
        console.log('Editor not initialized yet');
        return;
    }
    const result = await window.electron.openFileDialog();
    if (result) {
        console.log('File selected:', result.name);
        openFileContent(result);
    }
}

function openFileContent(fileData) {
    console.log('Opening file content:', fileData.name);
    if (!editorInitialized) {
        console.log('Editor not initialized yet');
        return;
    }
    const { path, content, name } = fileData;
    
    if (!openFiles.has(path)) {
        openFiles.set(path, fileData);
        createTab(fileData);
    }
    
    currentFile = path;
    const fileExtension = name.split('.').pop();
    const language = getLanguageFromExtension(fileExtension);
    
    monaco.editor.setModelLanguage(editor.getModel(), language);
    editor.setValue(content);
}

// Get language for syntax highlighting
function getLanguageFromExtension(ext) {
    const languageMap = {
        'js': 'javascript',
        'py': 'python',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'txt': 'plaintext'
    };
    return languageMap[ext] || 'plaintext';
}

// Handle file saving
async function saveCurrentFile() {
    console.log('Saving current file...');
    if (!editorInitialized) {
        console.log('Editor not initialized yet');
        return;
    }
    if (!currentFile) {
        await saveFileAs();
        return;
    }

    const content = editor.getValue();
    const success = await window.electron.saveFile({
        filePath: currentFile,
        content: content
    });

    if (success) {
        console.log('File saved successfully');
    } else {
        console.error('Error saving file');
    }
}

async function saveFileAs() {
    console.log('Save As...');
    if (!editorInitialized) {
        console.log('Editor not initialized yet');
        return;
    }
    const content = editor.getValue();
    const defaultPath = currentFile || '';
    
    const result = await window.electron.saveFileDialog({
        content: content,
        defaultPath: defaultPath
    });

    if (result.success) {
        currentFile = result.path;
        // Update tab if it exists
        const existingTab = Array.from(tabs.children).find(tab => 
            tab.dataset.path === currentFile);
        
        if (existingTab) {
            const fileName = existingTab.querySelector('span');
            fileName.textContent = result.name;
        } else {
            openFileContent({
                path: result.path,
                content: content,
                name: result.name
            });
        }
    }
}

// Create new tab
function createTab(fileData) {
    console.log('Creating new tab for:', fileData.name);
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.path = fileData.path;
    
    const icon = document.createElement('i');
    const fileExtension = fileData.name.split('.').pop();
    icon.className = getFileIcon(fileExtension);
    
    const fileName = document.createElement('span');
    fileName.textContent = fileData.name;
    
    const closeBtn = document.createElement('i');
    closeBtn.className = 'fas fa-times close-tab';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(fileData.path);
    });
    
    tab.appendChild(icon);
    tab.appendChild(fileName);
    tab.appendChild(closeBtn);
    
    tab.addEventListener('click', () => {
        activateTab(fileData.path);
    });
    
    tabs.appendChild(tab);
    activateTab(fileData.path);
}

function activateTab(filePath) {
    console.log('Activating tab:', filePath);
    if (!editorInitialized) {
        console.log('Editor not initialized yet');
        return;
    }
    const fileData = openFiles.get(filePath);
    if (!fileData) {
        console.log('No file data found for:', filePath);
        return;
    }

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tab = tabs.querySelector(`[data-path="${filePath}"]`);
    if (tab) {
        tab.classList.add('active');
        console.log('Tab activated');
    }

    currentFile = filePath;
    const fileExtension = fileData.name.split('.').pop();
    const language = getLanguageFromExtension(fileExtension);
    
    monaco.editor.setModelLanguage(editor.getModel(), language);
    editor.setValue(fileData.content);
}

function closeTab(filePath) {
    console.log('Closing tab:', filePath);
    if (!editorInitialized) {
        console.log('Editor not initialized yet');
        return;
    }
    const tab = tabs.querySelector(`[data-path="${filePath}"]`);
    if (tab) {
        tab.remove();
        openFiles.delete(filePath);
        
        if (currentFile === filePath) {
            currentFile = null;
            const remainingTabs = tabs.children;
            if (remainingTabs.length > 0) {
                const lastTab = remainingTabs[remainingTabs.length - 1];
                activateTab(lastTab.dataset.path);
            } else {
                editor.setValue('// Welcome to the Code Editor\n');
                monaco.editor.setModelLanguage(editor.getModel(), 'javascript');
            }
        }
    }
}

// Get appropriate icon for file type
function getFileIcon(type) {
    const icons = {
        'html': 'fab fa-html5',
        'css': 'fab fa-css3-alt',
        'js': 'fab fa-js',
        'json': 'far fa-file-code',
        'md': 'far fa-file-alt',
        'py': 'fab fa-python'
    };
    return icons[type] || 'far fa-file';
}

// Add this to help with debugging
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    console.log('Tabs element exists:', !!document.getElementById('tabs'));
    console.log('Editor element exists:', !!document.getElementById('editor'));
    console.log('Toolbar buttons:',
        !!document.getElementById('toolbar-new'),
        !!document.getElementById('toolbar-open'),
        !!document.getElementById('toolbar-save'),
        !!document.getElementById('toolbar-save-as')
    );
});