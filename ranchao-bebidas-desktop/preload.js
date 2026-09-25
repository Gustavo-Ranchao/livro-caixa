const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ranchaoDesktop', {
  obterEstadoAtualizacao: () => ipcRenderer.invoke('atualizacao:estado-atual'),
  verificarAtualizacao: () => ipcRenderer.invoke('atualizacao:verificar'),
  baixarAtualizacao: () => ipcRenderer.invoke('atualizacao:baixar'),
  instalarAtualizacao: () => ipcRenderer.invoke('atualizacao:instalar'),
  aoMudarAtualizacao: callback => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('atualizacao:estado', (_evento, estado) => callback(estado));
  }
});
