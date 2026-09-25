const { app, BrowserWindow, shell, session, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { pathToFileURL } = require('url');

const PAGINA_INICIAL = path.join(__dirname, 'index.html');
const URL_INICIAL = pathToFileURL(PAGINA_INICIAL).href;
let janelaPrincipal = null;
let estadoAtualizacao = { tipo: 'inicial', mensagem: 'Pronto para verificar atualizações.', versaoAtual: app.getVersion() };

function enviarEstadoAtualizacao(tipo, mensagem, extras = {}) {
  estadoAtualizacao = { tipo, mensagem, versaoAtual: app.getVersion(), ...extras };
  if (janelaPrincipal && !janelaPrincipal.isDestroyed()) janelaPrincipal.webContents.send('atualizacao:estado', estadoAtualizacao);
}

function configurarAtualizacoes() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => enviarEstadoAtualizacao('verificando', 'Verificando se existe uma nova versão…'));
  autoUpdater.on('update-available', info => enviarEstadoAtualizacao('disponivel', `Nova versão ${info.version} disponível.`, { novaVersao: info.version }));
  autoUpdater.on('update-not-available', info => enviarEstadoAtualizacao('atualizado', 'Seu aplicativo já está atualizado.', { novaVersao: info.version }));
  autoUpdater.on('download-progress', p => enviarEstadoAtualizacao('baixando', `Baixando atualização: ${Math.round(p.percent || 0)}%`, { percentual: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', info => enviarEstadoAtualizacao('pronta', `Versão ${info.version} pronta para instalar.`, { novaVersao: info.version }));
  autoUpdater.on('error', erro => enviarEstadoAtualizacao('erro', 'Não foi possível verificar ou baixar a atualização.', { detalhe: erro && erro.message ? erro.message : String(erro) }));

  ipcMain.handle('atualizacao:estado-atual', () => estadoAtualizacao);
  ipcMain.handle('atualizacao:verificar', async () => {
    if (!app.isPackaged) return enviarEstadoAtualizacao('desenvolvimento', 'A verificação funciona na versão instalada do aplicativo.');
    await autoUpdater.checkForUpdates();
    return estadoAtualizacao;
  });
  ipcMain.handle('atualizacao:baixar', async () => {
    if (!app.isPackaged) return estadoAtualizacao;
    await autoUpdater.downloadUpdate();
    return estadoAtualizacao;
  });
  ipcMain.handle('atualizacao:instalar', () => {
    if (app.isPackaged) setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return true;
  });
}

function criarJanela() {
  janelaPrincipal = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'Ranchão Bebidas',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#f4f7fb',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false
    }
  });

  janelaPrincipal.once('ready-to-show', () => {
    janelaPrincipal.maximize();
    janelaPrincipal.show();
    if (app.isPackaged) setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
  });

  janelaPrincipal.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  janelaPrincipal.webContents.on('will-navigate', (evento, url) => {
    if (url !== URL_INICIAL) {
      evento.preventDefault();
      if (/^https:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  janelaPrincipal.on('closed', () => { janelaPrincipal = null; });
  janelaPrincipal.loadFile(PAGINA_INICIAL);
}

app.setAppUserModelId('br.com.ranchao.bebidas');

app.whenReady().then(() => {
  configurarAtualizacoes();
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  criarJanela();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
