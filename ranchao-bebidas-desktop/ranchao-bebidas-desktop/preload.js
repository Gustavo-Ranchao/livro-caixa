const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ranchaoDesktop', {
  obterEstadoAtualizacao: () => ipcRenderer.invoke('atualizacao:estado-atual'),
  verificarAtualizacao: () => ipcRenderer.invoke('atualizacao:verificar'),
  baixarAtualizacao: () => ipcRenderer.invoke('atualizacao:baixar'),
  instalarAtualizacao: () => ipcRenderer.invoke('atualizacao:instalar'),
  abrirModulo: (view, tipo) => ipcRenderer.invoke('janela:abrir-modulo', { view, tipo }),
  focarPrincipal: () => ipcRenderer.invoke('janela:focar-principal'),
  aoMudarAtualizacao: callback => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('atualizacao:estado', (_evento, estado) => callback(estado));
  }
});
