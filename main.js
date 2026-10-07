const { app, BrowserWindow, shell, session, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { pathToFileURL } = require('url');

const PAGINA_INICIAL = path.join(__dirname, 'index.html');
const URL_INICIAL = pathToFileURL(PAGINA_INICIAL).href;
let janelaPrincipal = null;
const janelasModulos = new Map();
let estadoAtualizacao = { tipo: 'inicial', mensagem: 'Pronto para verificar atualizações.', versaoAtual: app.getVersion() };

const MODULOS_PERMITIDOS = new Set([
  'checklist','duvidas','manutencao','agenda','contasPagar','despesasFixas','comprovantes','leituraComprovantes',
  'diferencaCaixa','fluxoCaixa','pagamentos','pagamentoCaixa','contratos','vendasComCusto','vendasDelivery',
  'orcamentos','tabelaPrecos','bancoHoras','compras','colaboradores','aniversarios','fornecedores','contasBancarias',
  'inventario','controleEstoque','contagensEstoque','combinacaoPagamentos'
]);
const TITULOS_MODULOS = {
  checklist:'Checklist',duvidas:'Dúvidas',manutencao:'Manutenção',agenda:'Agenda',contasPagar:'Contas a pagar',
  despesasFixas:'Despesas fixas',comprovantes:'Comprovantes',leituraComprovantes:'Leitura de Comprovantes',
  diferencaCaixa:'Diferença de Caixa',fluxoCaixa:'Fluxo de Caixa',pagamentos:'Pagamentos',pagamentoCaixa:'Pagamento no Caixa',
  combinacaoPagamentos:'Combinação de Pagamentos',contratos:'Contratos e Recibos',vendasComCusto:'Vendas com Custo',
  vendasDelivery:'Vendas Delivery',orcamentos:'Orçamentos',tabelaPrecos:'Tabela de Preços',compras:'Compras',
  inventario:'Inventário',controleEstoque:'Controle de Estoque',contagensEstoque:'Contagens de Estoque',
  bancoHoras:'Banco de Horas',colaboradores:'Colaboradores',aniversarios:'Aniversários',fornecedores:'Fornecedores',
  contasBancarias:'Contas Bancárias'
};

function opcoesJanela(titulo) {
  return {
    width: 1440,height: 900,minWidth:1024,minHeight:700,show:false,title:titulo,
    icon:path.join(__dirname,'assets','icon.png'),backgroundColor:'#f4f7fb',autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,spellcheck:false}
  };
}

function protegerNavegacao(janela) {
  janela.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//i.test(url))shell.openExternal(url);return {action:'deny'};});
  janela.webContents.on('will-navigate',(evento,url)=>{
    let local=false;try{const destino=new URL(url),inicial=new URL(URL_INICIAL);local=destino.protocol==='file:'&&destino.pathname===inicial.pathname;}catch(_){local=false;}
    if(!local){evento.preventDefault();if(/^https:\/\//i.test(url))shell.openExternal(url);}
  });
}

function abrirJanelaModulo(view,tipo) {
  if(!MODULOS_PERMITIDOS.has(view))return {ok:false};
  const subtipo=view==='manutencao'&&['computador','loja','veiculo'].includes(tipo)?tipo:'';
  const chave=view+(subtipo?':'+subtipo:'');
  const existente=janelasModulos.get(chave);
  if(existente&&!existente.isDestroyed()){if(existente.isMinimized())existente.restore();existente.show();existente.focus();return {ok:true,reutilizada:true};}
  const sufixo=subtipo?(' - '+({computador:'Computadores',loja:'Loja',veiculo:'Veículos'}[subtipo])):'';
  const janela=new BrowserWindow(opcoesJanela((TITULOS_MODULOS[view]||'Módulo')+sufixo+' — Ranchão Bebidas'));
  janelasModulos.set(chave,janela);protegerNavegacao(janela);
  janela.once('ready-to-show',()=>{janela.maximize();janela.show();});
  janela.on('closed',()=>janelasModulos.delete(chave));
  const query={janelaModulo:'1',view};if(subtipo)query.tipo=subtipo;
  janela.loadFile(PAGINA_INICIAL,{query});
  return {ok:true,reutilizada:false};
}

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

function criarJanela(preservarSessao = false) {
  janelaPrincipal = new BrowserWindow(opcoesJanela('Ranchão Bebidas'));

  janelaPrincipal.once('ready-to-show', () => {
    janelaPrincipal.maximize();
    janelaPrincipal.show();
    if (app.isPackaged) setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
  });

  protegerNavegacao(janelaPrincipal);

  janelaPrincipal.on('closed', () => { janelaPrincipal = null; });
  janelaPrincipal.loadFile(PAGINA_INICIAL,preservarSessao?{query:{preservarSessao:'1'}}:undefined);
}

app.setAppUserModelId('br.com.ranchao.bebidas');

app.whenReady().then(() => {
  configurarAtualizacoes();
  ipcMain.handle('janela:abrir-modulo',(_evento,dados={})=>abrirJanelaModulo(String(dados.view||''),String(dados.tipo||'')));
  ipcMain.handle('janela:focar-principal',()=>{if(janelaPrincipal&&!janelaPrincipal.isDestroyed()){if(janelaPrincipal.isMinimized())janelaPrincipal.restore();janelaPrincipal.show();janelaPrincipal.focus();return true;}criarJanela(true);return true;});
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  criarJanela();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
