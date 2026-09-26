const SUPABASE_URL = 'https://qgpkswienjhfkbipiwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFncGtzd2llbmpoZmtiaXBpd2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDc5MzAsImV4cCI6MjA5ODY4MzkzMH0._y0hAaadVIyNHCN3wQRnNRyr62BgBKkyy29OSYvQ8Go';

let sb = null;
let lancamentos = [];
let tipoAtual = 'pagar';
let filtroReceber = 'todos';
let lojaAtual = localStorage.getItem('lojaAtual') || 'loja1';
let buscaTexto = '';
let mesAtual = new Date().toISOString().slice(0,7);

const NOMES_MES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function mudarMes(v){
  mesAtual = v;
  render();
}

function popularFiltroMes(){
  const sel = document.getElementById('filtroMes');
  const anteriorSelecionado = mesAtual;
  const chaves = new Set(lancamentosDaLoja().map(x=>x.vencimento.slice(0,7)));
  const hoje = new Date();
  chaves.add(hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0'));
  const lista = Array.from(chaves).sort().reverse();
  sel.innerHTML = '<option value="todos">Todos os meses</option>' + lista.map(chave=>{
    const [ano, mes] = chave.split('-');
    const rotulo = NOMES_MES[parseInt(mes,10)-1] + ' ' + ano;
    return `<option value="${chave}">${rotulo}</option>`;
  }).join('');
  if(lista.includes(anteriorSelecionado) || anteriorSelecionado==='todos'){
    sel.value = anteriorSelecionado;
  }else{
    sel.value = 'todos';
    mesAtual = 'todos';
  }
}

function itemCorresponde(it, texto){
  if(!texto) return true;
  const nome = (it.contato || it.descricao || '').toLowerCase();
  const valorFmt = brl(it.valor).toLowerCase();
  const valorCru = String(it.valor);
  const dataFmt = fmtData(it.vencimento);
  const dataCru = it.vencimento;
  return nome.includes(texto) || valorFmt.includes(texto) || valorCru.includes(texto) || dataFmt.includes(texto) || dataCru.includes(texto);
}

function lancamentosDaLoja(){
  return lancamentos.filter(x=>x.loja===lojaAtual);
}

let caixaIniciais = { loja1: 0, loja2: 0 };

function trocarLoja(l){
  lojaAtual = l;
  try{ localStorage.setItem('lojaAtual', l); }catch(e){}
  const campoCodigoLoja = document.getElementById('codigoLojaModulo');
  if(campoCodigoLoja) campoCodigoLoja.value = l==='loja2' ? '02' : '01';
  const nomeLoja = document.getElementById('nomeLojaSelecionada');
  if(nomeLoja) nomeLoja.textContent = l==='loja2' ? 'Loja 02' : 'Loja 01';
  document.getElementById('caixaInicial').value = formatarCampoMoeda(caixaIniciais[l] || 0);
  render();

  bhCarregado = false;
  bhFuncionarioAtualId = null;
  bhRegistros = [];
  document.getElementById('bhSemFuncionario').style.display = 'block';
  document.getElementById('bhConteudo').style.display = 'none';
  if(viewAtual === 'bancoHoras'){
    carregarFuncionarios();
  }
  if(viewAtual === 'aniversarios'){
    renderAniversarios();
  }
  if(viewAtual === 'contasPagar' || viewAtual === 'fornecedores'){
    carregarFornecedores();
  }
  if(viewAtual === 'checklist'){
    carregarChecklist();
  }
  if(viewAtual === 'despesasFixas'){
    abrirFixas();
  }
  if(viewAtual === 'comprovantes'){
    carregarComprovantes();
  }
  if(viewAtual === 'leituraComprovantes'){
    limparLoteLeituras();
    carregarHistoricoLeituras();
  }
  if(viewAtual === 'diferencaCaixa'){
    abrirDiferencaCaixa();
  }
  if(viewAtual === 'vendasComCusto'){
    popularFiltroMesVendas().then(()=>{
      const mesAtual = new Date().toISOString().slice(0,7);
      document.getElementById('vendasFiltroMes').value = mesAtual;
      mudarMesVendas(mesAtual);
    });
    atualizarUltimoDiaVendas();
  }
  if(viewAtual === 'vendasDelivery'){
    abrirVendasDelivery();
  }
  if(viewAtual === 'orcamentos'){
    novoOrcamento();
    abrirOrcamentos();
  }
  if(viewAtual === 'fluxoCaixa'){
    sb.from('fluxo_caixa_contas').select('*').eq('loja', lojaAtual).order('ordem').order('nome').then(async ({data, error})=>{
      fluxoContasCache = error ? [] : (data || []);
      const temDadosSemConta = await existeDadoSemContaFluxo();
      renderFluxoContaTabs(temDadosSemConta || fluxoContasCache.length===0);
      let contaAlvo = fluxoContasCache.length>0 ? fluxoContasCache[0].id : CONTA_SEM_ID;
      if(contaAlvo === CONTA_SEM_ID && !temDadosSemConta && fluxoContasCache.length>0) contaAlvo = fluxoContasCache[0].id;
      mudarSubAbaFluxo(contaAlvo);
      popularFiltroMesFluxo().then(()=>{
        const mesAtual = new Date().toISOString().slice(0,7);
        document.getElementById('fluxoFiltroMes').value = mesAtual;
        mudarMesFluxo(mesAtual);
      });
    });
    if(projecaoJaCarregada) carregarProjecao();
  }
  if(viewAtual === 'compras'){
    carregarCompras();
  }
  if(viewAtual === 'contasBancarias'){
    carregarContasBancarias();
  }
  if(viewAtual === 'inventario'){
    abrirInventario();
  }
  if(viewAtual === 'controleEstoque'){
    carregarControleEstoque();
  }
  if(viewAtual === 'contratos'){
    abrirContratos();
  }
  if(viewAtual === 'contagensEstoque'){
    abrirContagensEstoque();
  }
  if(viewAtual === 'pagamentos'){
    abrirPagamentos();
  }
  if(viewAtual === 'pagamentoCaixa'){
    abrirPagamentoCaixa();
  }
  if(viewAtual === 'combinacaoPagamentos'){
    abrirCombinacaoPagamentos();
  }
  if(viewAtual === 'manutencao'){
    carregarManutencoes();
  }
}

function selecionarLojaPorCodigo(valor){
  const digitado = String(valor || '').trim();
  const codigo = digitado==='1' ? '01' : (digitado==='2' ? '02' : digitado);
  if(codigo==='01'){
    trocarLoja('loja1');
  }else if(codigo==='02'){
    trocarLoja('loja2');
  }else{
    const campo = document.getElementById('codigoLojaModulo');
    if(campo){
      campo.value = '';
      campo.focus();
    }
    document.getElementById('nomeLojaSelecionada').textContent = '—';
    alert('Informe o código 01 ou 02.');
  }
}

function abrirListaLojas(){
  document.getElementById('listaLojasPopup').classList.toggle('open');
}

function escolherLojaLista(codigo){
  document.getElementById('listaLojasPopup').classList.remove('open');
  document.getElementById('codigoLojaModulo').value = codigo;
  selecionarLojaPorCodigo(codigo);
}

function atalhoCodigoLoja(event){
  if(event.key==='Insert'){
    event.preventDefault();
    abrirListaLojas();
  }else if(event.key==='Enter'){
    event.preventDefault();
    event.currentTarget.blur();
  }else if(event.key==='Escape'){
    document.getElementById('listaLojasPopup').classList.remove('open');
  }
}

const brl = v => 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
const todayStr = () => new Date().toISOString().slice(0,10);
const fmtData = d => { const [y,m,day] = d.split('-'); return day+'/'+m+'/'+y; };

const NOMES_LOJA = { loja1: 'Loja 01', loja2: 'Loja 02' };

function exportarExcelPagar(){
  if(!window.XLSX){
    alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.');
    return;
  }
  const itens = obterItensPagarFiltrados();
  if(itens.length===0){
    alert('Não há lançamentos para exportar com os filtros atuais.');
    return;
  }
  const linhas = itens.map(it=>({
    'Fornecedor': it.contato || it.descricao || '',
    'Vencimento': fmtData(it.vencimento),
    'Valor': Number(it.valor),
    'Forma de pagamento': it.forma_pagamento==='dinheiro' ? 'Dinheiro' : (it.forma_pagamento==='cartao' ? 'Cartão' : ''),
    'Status': statusEfetivo(it)
  }));
  const somaTotal = itens.reduce((s,x)=>s+Number(x.valor),0);
  linhas.push({ 'Fornecedor': '', 'Vencimento': '', 'Valor': '', 'Forma de pagamento': '', 'Status': '' });
  linhas.push({ 'Fornecedor': 'TOTAL', 'Vencimento': '', 'Valor': somaTotal, 'Forma de pagamento': '', 'Status': '' });

  const planilha = XLSX.utils.json_to_sheet(linhas);
  planilha['!cols'] = [{wch:26},{wch:14},{wch:14},{wch:18},{wch:12}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Contas a pagar');

  const dataArquivo = new Date().toISOString().slice(0,10);
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  XLSX.writeFile(livro, 'contas-a-pagar-' + nomeLoja + '-' + dataArquivo + '.xlsx');
}

function exportarPdfPagar(){
  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.');
    return;
  }
  const itens = obterItensPagarFiltrados();
  if(itens.length===0){
    alert('Não há lançamentos para exportar com os filtros atuais.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const nomeLoja = NOMES_LOJA[lojaAtual] || '';
  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);

  doc.setFontSize(16);
  doc.text('Contas a pagar — ' + nomeLoja, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Gerado em ' + dataHora, 14, 25);

  const linhas = itens.map(it=>[
    it.contato || it.descricao || '',
    fmtData(it.vencimento),
    brl(it.valor),
    it.forma_pagamento==='dinheiro' ? 'Dinheiro' : (it.forma_pagamento==='cartao' ? 'Cartão' : '—'),
    statusEfetivo(it)
  ]);
  const somaTotal = itens.reduce((s,x)=>s+Number(x.valor),0);

  doc.autoTable({
    startY: 32,
    head: [['Fornecedor', 'Vencimento', 'Valor', 'Pagto', 'Status']],
    body: linhas,
    foot: [['TOTAL', '', brl(somaTotal), '', '']],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [38, 51, 43] },
    footStyles: { fillColor: [233, 225, 203], textColor: 20, fontStyle: 'bold' }
  });

  const dataArquivo = agora.toISOString().slice(0,10);
  doc.save('contas-a-pagar-' + nomeLoja.toLowerCase().replace(' ','') + '-' + dataArquivo + '.pdf');
}

async function exportarImagem(painelId, rotulo){
  const el = document.getElementById(painelId);
  if(!window.html2canvas){
    alert('Não foi possível carregar o recurso de imagem. Recarregue a página e tente de novo.');
    return;
  }
  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);
  el.setAttribute('data-gerado-em', dataHora + ' — ' + (NOMES_LOJA[lojaAtual] || ''));
  el.classList.add('capturando');
  try{
    if(document.fonts && document.fonts.ready){
      await document.fonts.ready;
    }
  }catch(e){}
  await new Promise(r=>setTimeout(r, 120));
  try{
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: Math.max(3, window.devicePixelRatio || 1),
      useCORS: true,
      imageTimeout: 15000
    });
    const link = document.createElement('a');
    const dataArquivo = agora.toISOString().slice(0,10);
    link.download = 'contas-' + rotulo + '-' + (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','') + '-' + dataArquivo + '.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }catch(e){
    alert('Não foi possível gerar a imagem: ' + (e && e.message ? e.message : e));
  }finally{
    el.classList.remove('capturando');
  }
}

function withTimeout(promise, ms){
  return new Promise((resolve)=>{
    let done = false;
    const timer = setTimeout(()=>{
      if(!done){ done = true; resolve({ timedOut: true }); }
    }, ms);
    Promise.resolve(promise).then(res=>{
      if(!done){ done = true; clearTimeout(timer); resolve(res); }
    }).catch(err=>{
      if(!done){ done = true; clearTimeout(timer); resolve({ error: err }); }
    });
  });
}

function limparSessaoLocalEForcarReload(){
  try{
    Object.keys(localStorage).forEach(k=>{
      if(k.startsWith('sb-') && k.includes('-auth-token')) localStorage.removeItem(k);
    });
  }catch(e){}
  location.reload();
}

function initSupabase(){
  if(!window.supabase){
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('li_err').textContent = 'Não foi possível carregar a biblioteca de conexão. Recarregue a página.';
    document.getElementById('li_err').style.display = 'block';
    return false;
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
  return true;
}

function toggleSenha(){
  const campo = document.getElementById('li_senha');
  const btn = document.getElementById('olhoBtn');
  if(campo.type === 'password'){
    campo.type = 'text';
    btn.textContent = '🙈';
  }else{
    campo.type = 'password';
    btn.textContent = '👁';
  }
}

document.getElementById('li_email').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    document.getElementById('li_senha').focus();
  }
});
document.getElementById('li_senha').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    fazerLogin();
  }
});

async function fazerLogin(){
  const email = document.getElementById('li_email').value.trim();
  const senha = document.getElementById('li_senha').value;
  const err = document.getElementById('li_err');
  const btn = document.getElementById('li_btn');
  err.style.display = 'none';
  if(!email || !senha){
    err.textContent = 'Preencha e-mail e senha.';
    err.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  try{
    if(!sb) throw new Error('sem-conexao');
    const resultado = await withTimeout(sb.auth.signInWithPassword({ email, password: senha }), 8000);
    if(resultado && resultado.timedOut){
      err.textContent = 'A conexão travou. Recarregue a página e tente de novo.';
      err.style.display = 'block';
    }else if(resultado.error){
      err.textContent = resultado.error.message.includes('Invalid login') ? 'E-mail ou senha incorretos.' : ('Erro: ' + resultado.error.message);
      err.style.display = 'block';
    }
  }catch(e){
    err.textContent = 'Não foi possível conectar ao banco de dados. Verifique sua internet e recarregue a página.';
    err.style.display = 'block';
  }finally{
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

async function fazerLogout(){
  const btn = document.getElementById('logoutBtn');
  btn.disabled = true;
  btn.textContent = 'Saindo…';
  const resultado = await withTimeout(sb.auth.signOut({ scope: 'local' }), 3500);
  if(resultado && resultado.timedOut){
    limparSessaoLocalEForcarReload();
    return;
  }
  btn.disabled = false;
  btn.textContent = 'Sair';
}

function toggleMenuPerfil(){
  document.getElementById('perfilMenu').classList.toggle('open');
}

const BACKUP_TABELAS = [
  'configuracoes','recibos_configuracoes','bh_funcionarios','compras_empresas','compras_marcas','fornecedores','compras_produtos',
  'pagamentos_caixa_tipos','despesas_fixas','despesas_fixas_puladas','lancamentos','comprovantes','fluxo_caixa_contas',
  'fluxo_caixa_saldos','fluxo_caixa_lancamentos','caixa_diferencas','checklist_itens','checklist_execucoes','bh_registros',
  'bh_atestados','vendas_delivery','vendas_itens','controle_estoque_mensal','estoque_inventarios','contagens_estoque',
  'contagens_estoque_itens','comb_pag_compras','comb_pag_pagamentos','pagamentos_caixa','pagamentos_caixa_memoria',
  'recibos','contracheques','orcamentos','duvidas','manutencoes','leituras_comprovantes','historico_alteracoes'
];
const BACKUP_ARQUIVOS = [
  {tabela:'comprovantes',campo:'caminho_storage',bucket:'comprovantes'},
  {tabela:'bh_atestados',campo:'caminho_storage',bucket:'comprovantes'},
  {tabela:'leituras_comprovantes',campo:'caminho_storage',bucket:'comprovantes'},
  {tabela:'manutencoes',campo:'caminho_storage',bucket:'manutencoes'},
  {tabela:'compras_produtos',campo:'foto_caminho',bucket:'compras-produtos'}
];
let backupZipSelecionado=null;
let backupEmAndamento=false;

function abrirBackupModal(){
  document.getElementById('perfilMenu').classList.remove('open');
  document.getElementById('backupModal').style.display='flex';
  limparEstadoBackup();
}
function fecharBackupModal(){
  if(backupEmAndamento)return;
  document.getElementById('backupModal').style.display='none';
}
function limparEstadoBackup(){
  backupZipSelecionado=null;
  const arq=document.getElementById('backupArquivoInput');if(arq)arq.value='';
  const conf=document.getElementById('backupConfirmacao');if(conf)conf.value='';
  document.getElementById('backupConfirmacaoWrap').style.display='none';
  document.getElementById('backupProgresso').style.display='none';
  document.getElementById('backupErro').style.display='none';
  atualizarBotaoRestauracao();
}
function informarProgressoBackup(texto,tipo='normal'){
  const el=document.getElementById('backupProgresso');
  el.style.display='block';el.textContent=texto;
  el.style.background=tipo==='sucesso'?'#ecfdf3':tipo==='aviso'?'#fff8e6':'#eef4ff';
  el.style.color=tipo==='sucesso'?'#176b3a':tipo==='aviso'?'#835d12':'#24436e';
}
function informarErroBackup(texto){const el=document.getElementById('backupErro');el.textContent=texto;el.style.display='block';}
function nomeSeguroBackup(valor){return String(valor||'arquivo').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_');}
function baixarBlobBackup(blob,nome){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nome;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}

async function buscarTabelaCompletaBackup(tabela){
  const registros=[];const tamanho=1000;
  for(let inicio=0;;inicio+=tamanho){
    const {data,error}=await sb.from(tabela).select('*').range(inicio,inicio+tamanho-1);
    if(error)throw error;
    registros.push(...(data||[]));
    if(!data||data.length<tamanho)break;
  }
  return registros;
}

async function gerarBackupCompleto(){
  if(backupEmAndamento)return;
  if(!window.JSZip){informarErroBackup('O recurso de compactação não carregou. Reabra o sistema e tente novamente.');return;}
  backupEmAndamento=true;
  const btn=document.getElementById('backupGerarBtn'),fechar=document.getElementById('backupFecharBtn');
  btn.disabled=true;btn.textContent='Preparando…';fechar.disabled=true;document.getElementById('backupErro').style.display='none';
  const zip=new JSZip(),dados={},avisos=[];
  const manifesto={formato:'ranchao-bebidas-backup',versao:1,criado_em:new Date().toISOString(),origem:'Ranchão Bebidas',tabelas:{},arquivos:[],avisos};
  try{
    for(let i=0;i<BACKUP_TABELAS.length;i++){
      const tabela=BACKUP_TABELAS[i];informarProgressoBackup(`Copiando dados: ${i+1} de ${BACKUP_TABELAS.length} — ${tabela}`);
      try{dados[tabela]=await buscarTabelaCompletaBackup(tabela);manifesto.tabelas[tabela]=dados[tabela].length;zip.file(`dados/${tabela}.json`,JSON.stringify(dados[tabela],null,2));}
      catch(e){dados[tabela]=[];avisos.push(`Tabela ${tabela}: ${e.message||e}`);}
    }
    const caminhos=new Map();
    BACKUP_ARQUIVOS.forEach(cfg=>(dados[cfg.tabela]||[]).forEach(reg=>{const caminho=reg&&reg[cfg.campo];if(caminho)caminhos.set(`${cfg.bucket}|${caminho}`,{bucket:cfg.bucket,caminho:String(caminho)});}));
    const lista=[...caminhos.values()];
    for(let i=0;i<lista.length;i++){
      const item=lista[i];informarProgressoBackup(`Copiando anexos: ${i+1} de ${lista.length}`);
      try{
        const {data,error}=await sb.storage.from(item.bucket).createSignedUrl(item.caminho,120);
        if(error||!data?.signedUrl)throw error||new Error('URL indisponível');
        const resposta=await fetch(data.signedUrl);if(!resposta.ok)throw new Error(`HTTP ${resposta.status}`);
        const conteudo=await resposta.blob();zip.file(`arquivos/${item.bucket}/${item.caminho}`,conteudo);
        manifesto.arquivos.push({bucket:item.bucket,caminho:item.caminho,tamanho:conteudo.size});
      }catch(e){avisos.push(`Arquivo ${item.bucket}/${item.caminho}: ${e?.message||e}`);}
    }
    zip.file('manifesto.json',JSON.stringify(manifesto,null,2));
    zip.file('LEIA-ME.txt','Backup do sistema Ranchão Bebidas.\r\nGuarde este arquivo em local seguro. Ele pode conter dados pessoais e financeiros.\r\nUse a opção Backup e recuperação dentro do próprio sistema para restaurá-lo.');
    informarProgressoBackup('Compactando o arquivo…');
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},meta=>{if(meta.percent)informarProgressoBackup(`Compactando: ${Math.round(meta.percent)}%`);});
    const agora=new Date(),data=`${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;
    baixarBlobBackup(blob,`backup-ranchao-bebidas-${data}.zip`);
    const resumo=`Backup concluído: ${Object.values(manifesto.tabelas).reduce((a,b)=>a+b,0)} registros e ${manifesto.arquivos.length} arquivos.${avisos.length?` ${avisos.length} item(ns) não puderam ser copiados.`:''}`;
    informarProgressoBackup(resumo,avisos.length?'aviso':'sucesso');
  }catch(e){console.error(e);informarErroBackup('Não foi possível concluir o backup: '+(e?.message||e));}
  finally{backupEmAndamento=false;btn.disabled=false;btn.textContent='💾 Gerar e baixar backup';fechar.disabled=false;}
}

async function prepararRestauracaoBackup(files){
  backupZipSelecionado=null;document.getElementById('backupConfirmacaoWrap').style.display='none';document.getElementById('backupErro').style.display='none';
  const arquivo=files&&files[0];if(!arquivo)return;
  if(!window.JSZip){informarErroBackup('O recurso de compactação não carregou.');return;}
  try{
    informarProgressoBackup('Verificando o arquivo de backup…');
    const zip=await JSZip.loadAsync(arquivo),entrada=zip.file('manifesto.json');
    if(!entrada)throw new Error('O manifesto do backup não foi encontrado.');
    const manifesto=JSON.parse(await entrada.async('text'));
    if(manifesto.formato!=='ranchao-bebidas-backup'||manifesto.versao!==1)throw new Error('Este arquivo não é um backup compatível do Ranchão Bebidas.');
    backupZipSelecionado={zip,manifesto,nome:arquivo.name};
    document.getElementById('backupConfirmacaoWrap').style.display='block';
    informarProgressoBackup(`Backup reconhecido, criado em ${new Date(manifesto.criado_em).toLocaleString('pt-BR')}. Revise e confirme a restauração.`,'aviso');
  }catch(e){informarErroBackup('Arquivo inválido: '+(e?.message||e));informarProgressoBackup('Não foi possível validar o arquivo.','aviso');}
}
function atualizarBotaoRestauracao(){const btn=document.getElementById('backupRestaurarBtn'),campo=document.getElementById('backupConfirmacao');if(btn)btn.disabled=!(backupZipSelecionado&&campo&&campo.value.trim().toUpperCase()==='RESTAURAR');}

async function restaurarBackupSelecionado(){
  if(backupEmAndamento||!backupZipSelecionado)return;
  if(document.getElementById('backupConfirmacao').value.trim().toUpperCase()!=='RESTAURAR')return;
  backupEmAndamento=true;
  const btn=document.getElementById('backupRestaurarBtn'),fechar=document.getElementById('backupFecharBtn');btn.disabled=true;btn.textContent='Restaurando…';fechar.disabled=true;document.getElementById('backupErro').style.display='none';
  const {zip,manifesto}=backupZipSelecionado,erros=[];let registros=0,arquivos=0;
  try{
    const listaArquivos=Array.isArray(manifesto.arquivos)?manifesto.arquivos:[];
    for(let i=0;i<listaArquivos.length;i++){
      const item=listaArquivos[i],entrada=zip.file(`arquivos/${item.bucket}/${item.caminho}`);if(!entrada){erros.push(`Arquivo ausente: ${item.caminho}`);continue;}
      informarProgressoBackup(`Restaurando anexos: ${i+1} de ${listaArquivos.length}`);
      try{const blob=await entrada.async('blob');const {error}=await sb.storage.from(item.bucket).upload(item.caminho,blob,{upsert:true});if(error)throw error;arquivos++;}catch(e){erros.push(`${item.bucket}/${item.caminho}: ${e?.message||e}`);}
    }
    for(let i=0;i<BACKUP_TABELAS.length;i++){
      const tabela=BACKUP_TABELAS[i],entrada=zip.file(`dados/${tabela}.json`);if(!entrada)continue;
      informarProgressoBackup(`Restaurando dados: ${i+1} de ${BACKUP_TABELAS.length} — ${tabela}`);
      try{
        const linhas=JSON.parse(await entrada.async('text'));if(!Array.isArray(linhas))throw new Error('Conteúdo inválido');
        for(let p=0;p<linhas.length;p+=200){const lote=linhas.slice(p,p+200);if(!lote.length)continue;const {error}=await sb.from(tabela).upsert(lote);if(error)throw error;registros+=lote.length;}
      }catch(e){erros.push(`Tabela ${tabela}: ${e?.message||e}`);}
    }
    informarProgressoBackup(`Restauração concluída: ${registros} registros e ${arquivos} arquivos.${erros.length?` ${erros.length} item(ns) apresentaram erro.`:' Reabra o sistema para carregar todos os dados.'}`,erros.length?'aviso':'sucesso');
    if(erros.length)console.warn('Itens não restaurados:',erros);
    document.getElementById('backupConfirmacaoWrap').style.display='none';
  }catch(e){console.error(e);informarErroBackup('Não foi possível concluir a restauração: '+(e?.message||e));}
  finally{backupEmAndamento=false;btn.textContent='Restaurar backup';fechar.disabled=false;atualizarBotaoRestauracao();}
}

const HISTORICO_TABELAS_NOMES={
  configuracoes:'Configurações',recibos_configuracoes:'Dados da empresa',bh_funcionarios:'Colaboradores',bh_registros:'Banco de horas',bh_atestados:'Atestados',
  lancamentos:'Contas a pagar e receber',comprovantes:'Comprovantes',fluxo_caixa_contas:'Contas do fluxo de caixa',fluxo_caixa_saldos:'Saldos do fluxo de caixa',fluxo_caixa_lancamentos:'Fluxo de caixa',
  caixa_diferencas:'Diferença de caixa',checklist_itens:'Itens do checklist',checklist_execucoes:'Checklist',compras_empresas:'Empresas de compras',compras_marcas:'Marcas',fornecedores:'Fornecedores',
  compras_produtos:'Produtos de compras',controle_estoque_mensal:'Controle de estoque',estoque_inventarios:'Inventário de estoque',contagens_estoque:'Contagens de estoque',contagens_estoque_itens:'Itens da contagem',
  comb_pag_compras:'Compras combinadas',comb_pag_pagamentos:'Pagamentos combinados',pagamentos_caixa:'Pagamentos de caixa',pagamentos_caixa_memoria:'Memória de pagamentos',pagamentos_caixa_tipos:'Tipos de pagamento',
  vendas_delivery:'Vendas Delivery',vendas_itens:'Vendas com custo',orcamentos:'Orçamentos',recibos:'Recibos',contracheques:'Contracheques',duvidas:'Dúvidas',manutencoes:'Manutenções',leituras_comprovantes:'Leitura de comprovantes',
  despesas_fixas:'Despesas fixas',despesas_fixas_puladas:'Despesas fixas ignoradas'
};
let historicoCache=[];

function abrirHistoricoModal(){
  document.getElementById('perfilMenu').classList.remove('open');
  const hoje=new Date(),inicio=new Date(hoje.getFullYear(),hoje.getMonth(),1);
  document.getElementById('histDe').value=dataLocalIso(inicio);
  document.getElementById('histAte').value=dataLocalIso(hoje);
  document.getElementById('histLoja').value='';document.getElementById('histAcao').value='';document.getElementById('histBusca').value='';
  document.getElementById('historicoModal').style.display='flex';carregarHistorico();
}
function fecharHistoricoModal(){document.getElementById('historicoModal').style.display='none';}
function fecharDetalheHistorico(){document.getElementById('historicoDetalheModal').style.display='none';}
function dataLocalIso(data){return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;}
function rotuloAcaoHistorico(acao){return acao==='inseriu'?'Incluiu':acao==='alterou'?'Alterou':acao==='excluiu'?'Excluiu':acao||'—';}
function corAcaoHistorico(acao){return acao==='inseriu'?'#176b3a':acao==='alterou'?'#295eb5':acao==='excluiu'?'#b4233a':'#64748b';}
function nomeTabelaHistorico(tabela){return HISTORICO_TABELAS_NOMES[tabela]||String(tabela||'').replaceAll('_',' ');}
function nomeLojaHistorico(loja){return loja==='loja1'?'Loja 01':loja==='loja2'?'Loja 02':loja||'Geral';}

async function carregarHistorico(){
  const body=document.getElementById('historicoBody'),aviso=document.getElementById('historicoAviso');
  body.innerHTML='<tr><td colspan="7" style="padding:30px;text-align:center;color:#64748b;">Carregando histórico…</td></tr>';aviso.style.display='none';
  const de=document.getElementById('histDe').value,ate=document.getElementById('histAte').value,loja=document.getElementById('histLoja').value,acao=document.getElementById('histAcao').value;
  let consulta=sb.from('historico_alteracoes').select('*').order('criado_em',{ascending:false}).limit(500);
  if(de)consulta=consulta.gte('criado_em',new Date(de+'T00:00:00').toISOString());
  if(ate){const fim=new Date(ate+'T00:00:00');fim.setDate(fim.getDate()+1);consulta=consulta.lt('criado_em',fim.toISOString());}
  if(loja)consulta=consulta.eq('loja',loja);if(acao)consulta=consulta.eq('acao',acao);
  const {data,error}=await consulta;
  if(error){historicoCache=[];body.innerHTML='';aviso.textContent='Não foi possível carregar o histórico. Execute no Supabase o arquivo SQL da etapa 2 e tente novamente.';aviso.style.display='block';document.getElementById('historicoResumo').textContent='';console.error(error);return;}
  historicoCache=data||[];renderHistorico();
}

function renderHistorico(){
  const busca=(document.getElementById('histBusca')?.value||'').trim().toLowerCase();
  const lista=!busca?historicoCache:historicoCache.filter(x=>[x.usuario_email,nomeTabelaHistorico(x.tabela),x.loja,x.registro_id,JSON.stringify(x.dados_anteriores||{}),JSON.stringify(x.dados_novos||{})].join(' ').toLowerCase().includes(busca));
  const body=document.getElementById('historicoBody');
  if(!lista.length){body.innerHTML='<tr><td colspan="7" style="padding:34px;text-align:center;color:#64748b;">Nenhuma alteração encontrada neste período.</td></tr>';document.getElementById('historicoResumo').textContent='0 registros';return;}
  body.innerHTML=lista.map(x=>`<tr style="border-top:1px solid #e5ebf3;"><td style="padding:10px;white-space:nowrap;">${new Date(x.criado_em).toLocaleString('pt-BR')}</td><td style="padding:10px;">${escapeHtml(x.usuario_email||'Usuário autenticado')}</td><td style="padding:10px;"><span style="display:inline-block;padding:4px 8px;border-radius:999px;background:${corAcaoHistorico(x.acao)}15;color:${corAcaoHistorico(x.acao)};font-weight:700;">${rotuloAcaoHistorico(x.acao)}</span></td><td style="padding:10px;">${escapeHtml(nomeTabelaHistorico(x.tabela))}</td><td style="padding:10px;white-space:nowrap;">${escapeHtml(nomeLojaHistorico(x.loja))}</td><td style="padding:10px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(x.registro_id||'')}">${escapeHtml(x.registro_id||'—')}</td><td style="padding:10px;text-align:right;"><button class="filter-btn" onclick="abrirDetalheHistorico(${Number(x.id)})">Ver</button></td></tr>`).join('');
  document.getElementById('historicoResumo').textContent=`${lista.length} registro(s) exibido(s)${historicoCache.length>=500?' — limite de 500 por consulta':''}`;
}

function valorHistorico(valor){if(valor===null||valor===undefined||valor==='')return '—';if(typeof valor==='boolean')return valor?'Sim':'Não';if(typeof valor==='object')return JSON.stringify(valor);return String(valor);}
function rotuloCampoHistorico(campo){return String(campo||'').replaceAll('_',' ').replace(/\b\w/g,l=>l.toUpperCase());}
function linhaDetalheHistorico(campo,antes,depois,mostrarAntes){
  return `<div style="display:grid;grid-template-columns:minmax(130px,0.7fr) minmax(0,1.6fr);gap:12px;padding:9px 4px;border-bottom:1px solid #edf1f6;"><strong style="font-size:11px;color:#5b6b82;">${escapeHtml(rotuloCampoHistorico(campo))}</strong><div style="font-size:12px;color:#17233c;overflow-wrap:anywhere;">${mostrarAntes?`<div style="color:#8b2635;text-decoration:line-through;margin-bottom:3px;">${escapeHtml(valorHistorico(antes))}</div><div style="color:#176b3a;">${escapeHtml(valorHistorico(depois))}</div>`:escapeHtml(valorHistorico(depois))}</div></div>`;
}
function abrirDetalheHistorico(id){
  const item=historicoCache.find(x=>Number(x.id)===Number(id));if(!item)return;
  const antes=item.dados_anteriores||{},depois=item.dados_novos||{};let campos=[];
  if(item.acao==='alterou')campos=(item.campos_alterados||[]).filter(c=>!['updated_at','atualizado_em'].includes(c));
  else campos=Object.keys(item.acao==='excluiu'?antes:depois).filter(c=>!['created_at','updated_at','criado_em','atualizado_em'].includes(c));
  document.getElementById('histDetalheTitulo').textContent=`${rotuloAcaoHistorico(item.acao)} — ${nomeTabelaHistorico(item.tabela)}`;
  document.getElementById('histDetalheSub').textContent=`${new Date(item.criado_em).toLocaleString('pt-BR')} • ${item.usuario_email||'Usuário autenticado'} • ${nomeLojaHistorico(item.loja)}`;
  const destino=document.getElementById('histDetalheConteudo');
  destino.innerHTML=campos.length?campos.map(c=>linhaDetalheHistorico(c,antes[c],item.acao==='excluiu'?antes[c]:depois[c],item.acao==='alterou')).join(''):'<div style="padding:20px;color:#64748b;text-align:center;">Nenhum campo relevante para exibir.</div>';
  document.getElementById('historicoDetalheModal').style.display='flex';
}

let estadoAtualizacaoDesktop=null;
function abrirAtualizacaoModal(){document.getElementById('perfilMenu').classList.remove('open');document.getElementById('atualizacaoModal').style.display='flex';if(window.ranchaoDesktop)window.ranchaoDesktop.obterEstadoAtualizacao().then(aplicarEstadoAtualizacaoDesktop).catch(()=>{});}
function fecharAtualizacaoModal(){document.getElementById('atualizacaoModal').style.display='none';}
function aplicarEstadoAtualizacaoDesktop(estado){
  if(!estado)return;estadoAtualizacaoDesktop=estado;
  document.getElementById('atualizacaoVersaoAtual').textContent=estado.versaoAtual||'—';
  document.getElementById('atualizacaoMensagem').textContent=estado.mensagem||'Pronto para verificar atualizações.';
  const detalhe=document.getElementById('atualizacaoDetalhe');detalhe.textContent=estado.detalhe||'';detalhe.style.display=estado.detalhe?'block':'none';
  const progressoWrap=document.getElementById('atualizacaoProgressoWrap'),progresso=document.getElementById('atualizacaoProgresso');
  progressoWrap.style.display=estado.tipo==='baixando'?'block':'none';progresso.style.width=`${Math.max(0,Math.min(100,Number(estado.percentual)||0))}%`;
  const verificar=document.getElementById('atualizacaoVerificarBtn'),acao=document.getElementById('atualizacaoAcaoBtn');
  verificar.disabled=['verificando','baixando'].includes(estado.tipo);verificar.textContent=estado.tipo==='verificando'?'Verificando…':'Verificar agora';
  if(estado.tipo==='disponivel'){acao.style.display='inline-block';acao.disabled=false;acao.textContent='Baixar atualização';}
  else if(estado.tipo==='baixando'){acao.style.display='inline-block';acao.disabled=true;acao.textContent='Baixando…';}
  else if(estado.tipo==='pronta'){acao.style.display='inline-block';acao.disabled=false;acao.textContent='Reiniciar e atualizar';}
  else acao.style.display='none';
  if(estado.tipo==='disponivel'||estado.tipo==='pronta')document.getElementById('atualizacaoModal').style.display='flex';
}
async function verificarAtualizacaoDesktop(){if(!window.ranchaoDesktop)return;try{aplicarEstadoAtualizacaoDesktop(await window.ranchaoDesktop.verificarAtualizacao());}catch(e){aplicarEstadoAtualizacaoDesktop({tipo:'erro',mensagem:'Não foi possível verificar a atualização.',detalhe:e?.message||String(e),versaoAtual:estadoAtualizacaoDesktop?.versaoAtual});}}
async function executarAcaoAtualizacao(){
  if(!window.ranchaoDesktop||!estadoAtualizacaoDesktop)return;
  try{
    if(estadoAtualizacaoDesktop.tipo==='disponivel')aplicarEstadoAtualizacaoDesktop(await window.ranchaoDesktop.baixarAtualizacao());
    else if(estadoAtualizacaoDesktop.tipo==='pronta')await window.ranchaoDesktop.instalarAtualizacao();
  }catch(e){aplicarEstadoAtualizacaoDesktop({tipo:'erro',mensagem:'Não foi possível concluir a atualização.',detalhe:e?.message||String(e),versaoAtual:estadoAtualizacaoDesktop?.versaoAtual});}
}
function inicializarAtualizacoesDesktop(){
  if(!window.ranchaoDesktop)return;
  document.getElementById('atualizacaoMenuBtn').style.display='block';
  window.ranchaoDesktop.aoMudarAtualizacao(aplicarEstadoAtualizacaoDesktop);
  window.ranchaoDesktop.obterEstadoAtualizacao().then(aplicarEstadoAtualizacaoDesktop).catch(()=>{});
}

document.addEventListener('click', (e)=>{
  const wrap = document.getElementById('perfilWrap');
  if(wrap && !wrap.contains(e.target)){
    document.getElementById('perfilMenu').classList.remove('open');
  }
  const contextoLoja = document.getElementById('moduleContextBar');
  if(contextoLoja && !contextoLoja.contains(e.target)){
    document.getElementById('listaLojasPopup').classList.remove('open');
  }
});

function setTipo(t){
  tipoAtual = t;
  document.querySelectorAll('.tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipo===t));
  document.getElementById('f_contato_label').textContent = t==='pagar' ? 'Fornecedor' : 'Cliente';
  document.getElementById('f_contato').placeholder = t==='pagar' ? 'Nome do fornecedor' : 'Nome do cliente';
}

let filtrosPagarAtivos = new Set();

function atualizarBotoesFiltroPagar(){
  document.querySelectorAll('#filtPagar .filter-btn:not(.foto-btn)').forEach(btn=>{
    const f = btn.dataset.f;
    if(f==='todos'){
      btn.classList.toggle('active', filtrosPagarAtivos.size===0);
    }else{
      btn.classList.toggle('active', filtrosPagarAtivos.has(f));
    }
  });
}

document.querySelectorAll('#filtPagar .filter-btn:not(.foto-btn)').forEach(b=>{
  b.addEventListener('click', ()=>{
    const f = b.dataset.f;
    if(f==='todos'){
      filtrosPagarAtivos.clear();
    }else{
      if(filtrosPagarAtivos.has(f)) filtrosPagarAtivos.delete(f);
      else filtrosPagarAtivos.add(f);
    }
    atualizarBotoesFiltroPagar();
    render();
  });
});

document.getElementById('buscaGlobal').addEventListener('input', (e)=>{
  buscaTexto = e.target.value.trim().toLowerCase();
  render();
});

async function carregarDados(){
  const resultado = await withTimeout(
    sb.from('lancamentos').select('*').order('vencimento'),
    8000
  );

  if(resultado && resultado.timedOut){
    mostrarErroCarregamento('A conexão travou depois de um tempo parado. Clique para reconectar.');
    return;
  }

  const { data: lanc, error: e1 } = resultado;
  if(e1){
    mostrarErroCarregamento('Erro ao carregar: ' + e1.message);
    console.error('Erro ao carregar lançamentos:', e1);
    return;
  }

  lancamentos = lanc || [];

  try{
    await gerarLancamentosFixos();
  }catch(e){
    console.error('Erro ao gerar despesas fixas do mês:', e);
  }

  const { data: cfg } = await sb.from('configuracoes').select('*').eq('chave','empresa_nome').maybeSingle();
  if(cfg) document.getElementById('empresaNome').value = cfg.valor;

  const { data: cfgsCaixa } = await sb.from('configuracoes').select('*').in('chave', ['caixa_dinheiro_loja1','caixa_dinheiro_loja2']);
  if(cfgsCaixa){
    cfgsCaixa.forEach(c=>{
      if(c.chave === 'caixa_dinheiro_loja1') caixaIniciais.loja1 = parseFloat(c.valor) || 0;
      if(c.chave === 'caixa_dinheiro_loja2') caixaIniciais.loja2 = parseFloat(c.valor) || 0;
    });
  }
  document.getElementById('caixaInicial').value = formatarCampoMoeda(caixaIniciais[lojaAtual] || 0);

  render();
}

function mostrarErroCarregamento(msg){
  const html = escapeHtml(msg) + '<br><button class="addbtn" style="margin-top:12px;width:auto;padding:8px 16px;" onclick="limparSessaoLocalEForcarReload()">Reconectar</button>';
  document.getElementById('emptyPagar').innerHTML = html;
  document.getElementById('emptyPagar').style.display = 'block';
  document.getElementById('bodyPagar').innerHTML = '';
}

document.getElementById('empresaNome').addEventListener('change', async (e)=>{
  await sb.from('configuracoes').upsert({ chave: 'empresa_nome', valor: e.target.value });
});

async function addLancamento(){
  const btnTravado = document.getElementById('addbtn');
  if(btnTravado.disabled) return; // trava contra chamada dupla (duplo clique, handler duplicado, etc.)
  const contato = document.getElementById('f_contato').value.trim();
  const valor = parseFloat(document.getElementById('f_valor').value);
  const venc = document.getElementById('f_venc').value;
  const err = document.getElementById('formerr');
  if(!contato || !venc || isNaN(valor) || valor<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  const btn = document.getElementById('addbtn');
  btn.disabled = true;
  const { data, error } = await sb.from('lancamentos').insert({
    tipo: tipoAtual, descricao: contato, contato: contato, valor: valor,
    vencimento: venc, status: 'pendente', loja: lojaAtual
  }).select().single();
  btn.disabled = false;
  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }
  lancamentos.push(data);
  document.getElementById('f_contato').value = '';
  document.getElementById('f_valor').value = '';
  document.getElementById('f_venc').value = '';
  document.getElementById('f_contato').focus();
  render();
}

async function togglePago(id){
  const it = lancamentos.find(x=>x.id===id);
  if(!it) return;
  const novoStatus = it.status === 'pago' ? 'pendente' : 'pago';
  const novaData = novoStatus === 'pago' ? todayStr() : null;
  const { error } = await sb.from('lancamentos').update({ status: novoStatus, data_pagamento: novaData }).eq('id', id);
  if(!error){
    it.status = novoStatus;
    it.data_pagamento = novaData;
    render();
    if(novoStatus==='pago' && it.forma_pagamento==='dinheiro'){
      await sincronizarPagamentoDinheiro(it);
    }else if(novoStatus==='pendente'){
      await sb.from('fluxo_caixa_lancamentos').delete().eq('lancamento_origem_id', id);
    }
  }
}

async function sincronizarPagamentoDinheiro(item){
  const { data: existente } = await sb.from('fluxo_caixa_lancamentos').select('id').eq('lancamento_origem_id', item.id).maybeSingle();
  if(existente) return;
  await sb.from('fluxo_caixa_lancamentos').insert({
    loja: item.loja,
    data: item.data_pagamento || todayStr(),
    tipo: 'Dinheiro',
    descricao: item.contato || item.descricao,
    valor: -Math.abs(Number(item.valor)),
    lancamento_origem_id: item.id
  });
}

// versão em lote — usada ao confirmar várias contas de uma vez (ex: "Já paguei essas contas").
// faz só 2 idas ao banco no total (1 select + 1 insert), não importa quantas contas tenham
// sido confirmadas, em vez de ficar indo e voltando uma conta de cada vez (o que deixava a
// tela travada por muito tempo com listas grandes)
async function sincronizarPagamentosDinheiroEmLote(itens){
  if(itens.length===0) return;
  const idsOrigem = itens.map(it=>it.id);
  const { data: existentes } = await sb.from('fluxo_caixa_lancamentos')
    .select('lancamento_origem_id')
    .in('lancamento_origem_id', idsOrigem);
  const jaSincronizados = new Set((existentes||[]).map(e=>e.lancamento_origem_id));

  const novos = itens
    .filter(it=>!jaSincronizados.has(it.id))
    .map(it=>({
      loja: it.loja,
      data: it.data_pagamento || todayStr(),
      tipo: 'Dinheiro',
      descricao: it.contato || it.descricao,
      valor: -Math.abs(Number(it.valor)),
      lancamento_origem_id: it.id
    }));

  if(novos.length>0){
    await sb.from('fluxo_caixa_lancamentos').insert(novos);
  }
}

async function setFormaPagamento(id, forma){
  const it = lancamentos.find(x=>x.id===id);
  if(!it) return;
  const novaForma = (it.forma_pagamento === forma) ? null : forma;
  const agora = novaForma ? new Date().toISOString() : null;
  const { error } = await sb.from('lancamentos').update({ forma_pagamento: novaForma, forma_pagamento_em: agora }).eq('id', id);
  if(!error){
    it.forma_pagamento = novaForma;
    it.forma_pagamento_em = agora;
    render();
  }
}

async function removerLancamento(id){
  const it = lancamentos.find(x=>x.id===id);
  const { error } = await sb.from('lancamentos').delete().eq('id', id);
  if(!error){
    lancamentos = lancamentos.filter(x=>x.id!==id);
    if(it && it.despesa_fixa_id){
      const mes = it.vencimento.slice(0,7);
      await sb.from('despesas_fixas_puladas').upsert({ despesa_fixa_id: it.despesa_fixa_id, mes: mes }, { onConflict: 'despesa_fixa_id,mes' });
    }
    render();
  }
}

let excluindoId = null;

function confirmarExclusao(id){
  excluindoId = id;
  document.getElementById('confirmModal').style.display = 'flex';
}

function fecharConfirmacao(){
  document.getElementById('confirmModal').style.display = 'none';
  excluindoId = null;
}

async function confirmarExclusaoOk(){
  if(!excluindoId) return;
  await removerLancamento(excluindoId);
  fecharConfirmacao();
}

let editandoId = null;

function abrirEditar(id){
  const it = lancamentos.find(x=>x.id===id);
  if(!it) return;
  editandoId = id;
  document.getElementById('e_contato_label').textContent = it.tipo==='pagar' ? 'Fornecedor' : 'Cliente';
  document.getElementById('e_contato').value = it.contato || it.descricao || '';
  document.getElementById('e_valor').value = it.valor;
  document.getElementById('e_venc').value = it.vencimento;
  document.getElementById('editErr').style.display = 'none';
  document.getElementById('editModal').style.display = 'flex';
}

function fecharEditar(){
  document.getElementById('editModal').style.display = 'none';
  editandoId = null;
}

async function salvarEdicao(){
  const contato = document.getElementById('e_contato').value.trim();
  const valor = parseFloat(document.getElementById('e_valor').value);
  const venc = document.getElementById('e_venc').value;
  const err = document.getElementById('editErr');
  if(!contato || !venc || isNaN(valor) || valor<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  const btn = document.getElementById('editSalvarBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando…';
  try{
    const { data, error } = await sb.from('lancamentos').update({
      contato: contato, descricao: contato, valor: valor, vencimento: venc
    }).eq('id', editandoId).select().single();
    if(error){
      err.textContent = 'Erro ao salvar: ' + error.message;
      err.style.display = 'block';
      return;
    }
    const idx = lancamentos.findIndex(x=>x.id===editandoId);
    if(idx>-1) lancamentos[idx] = data;
    render();
    fecharEditar();
  }catch(e){
    err.textContent = 'Não foi possível salvar. Verifique sua internet e tente de novo.';
    err.style.display = 'block';
  }finally{
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
}

function statusEfetivo(it){
  if(it.status === 'pago') return 'pago';
  if(it.vencimento < todayStr()) return 'vencido';
  return 'pendente';
}

function escapeHtml(s){
  if(!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const LIMITE_DOCUMENTO_BYTES = 15 * 1024 * 1024;
const LIMITE_PLANILHA_BYTES = 20 * 1024 * 1024;

function extensaoArquivo(nome){
  const partes = String(nome || '').toLowerCase().split('.');
  return partes.length > 1 ? '.' + partes.pop() : '';
}

function nomeArquivoSeguro(nome){
  const original = String(nome || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const partes = original.split('.');
  const ext = partes.length > 1 ? '.' + partes.pop().replace(/[^a-zA-Z0-9]/g, '').slice(0,10) : '';
  const base = partes.join('_').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0,100) || 'arquivo';
  return base + ext.toLowerCase();
}

function validarArquivoLocal(arquivo, categoria){
  if(!arquivo) return 'Nenhum arquivo foi selecionado.';
  const ext = extensaoArquivo(arquivo.name);
  const permitidas = categoria === 'planilha' ? ['.xlsx', '.xls', '.csv'] : ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const limite = categoria === 'planilha' ? LIMITE_PLANILHA_BYTES : LIMITE_DOCUMENTO_BYTES;
  if(!permitidas.includes(ext)) return 'Tipo de arquivo não permitido: ' + arquivo.name;
  if(arquivo.size <= 0) return 'O arquivo está vazio: ' + arquivo.name;
  if(arquivo.size > limite) return 'O arquivo "' + arquivo.name + '" excede o limite de ' + Math.round(limite / 1024 / 1024) + ' MB.';
  const tipo = String(arquivo.type || '').toLowerCase();
  if(tipo.includes('svg') || tipo.includes('html') || tipo.includes('javascript')) return 'Conteúdo de arquivo não permitido: ' + arquivo.name;
  return '';
}

function validarListaArquivos(fileList, categoria){
  for(const arquivo of Array.from(fileList || [])){
    const erro = validarArquivoLocal(arquivo, categoria);
    if(erro) return erro;
  }
  return '';
}

function obterItensPagarFiltrados(){
  let itens = lancamentosDaLoja().filter(x=>x.tipo==='pagar');
  if(filtrosPagarAtivos && filtrosPagarAtivos.size>0) itens = itens.filter(x=>filtrosPagarAtivos.has(statusEfetivo(x)));
  if(buscaTexto) itens = itens.filter(x=>itemCorresponde(x, buscaTexto));
  if(mesAtual !== 'todos') itens = itens.filter(x=>x.vencimento.slice(0,7)===mesAtual);
  itens.sort((a,b)=> a.vencimento.localeCompare(b.vencimento));
  return itens;
}

function renderTabela(tipo, filtros){
  const body = document.getElementById(tipo==='pagar' ? 'bodyPagar' : 'bodyReceber');
  const empty = document.getElementById(tipo==='pagar' ? 'emptyPagar' : 'emptyReceber');
  const totalEl = document.getElementById(tipo==='pagar' ? 'totalPagarPainel' : 'totalReceberPainel');
  const itens = obterItensPagarFiltrados();

  const somaTotal = itens.reduce((s,x)=>s+Number(x.valor),0);
  const rotuloFiltro = (!filtros || filtros.size===0) ? 'Total' : ('Total (' + Array.from(filtros).join(' + ') + ')');
  if(totalEl){
    totalEl.innerHTML = `<span>${rotuloFiltro} · ${itens.length} ${itens.length===1?'lançamento':'lançamentos'}</span><span class="valor-total">${brl(somaTotal)}</span>`;
  }

  if(itens.length===0){ body.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display = 'none';

  body.innerHTML = itens.map(it=>{
    const st = statusEfetivo(it);
    const rowClass = st==='vencido' ? 'vencido' : '';
    const formaCell = tipo==='pagar' ? `<td><div class="forma-toggle">
        <button class="forma-btn ${it.forma_pagamento==='dinheiro'?'active-dinheiro':''}" onclick="setFormaPagamento('${it.id}','dinheiro')" title="Pagar em dinheiro">💵</button>
        <button class="forma-btn ${it.forma_pagamento==='cartao'?'active-cartao':''}" onclick="setFormaPagamento('${it.id}','cartao')" title="Pagar em cartão">💳</button>
      </div></td>` : '';
    return `<tr class="${rowClass}">
      <td class="contato">${escapeHtml(it.contato) || escapeHtml(it.descricao) || '—'}</td>
      <td class="data">${fmtData(it.vencimento)}</td>
      <td class="valor">${brl(it.valor)}</td>
      ${formaCell}
      <td><span class="stamp ${st}">${st}</span></td>
      <td><div class="rowactions">
        <button class="iconbtn edit" title="Editar" onclick="abrirEditar('${it.id}')">✎</button>
        <button class="iconbtn pay" title="${it.status==='pago' ? 'Reabrir' : 'Pagar'}" onclick="togglePago('${it.id}')">${it.status==='pago' ? '↺' : '✓'}</button>
        <button class="iconbtn del" title="Excluir" onclick="confirmarExclusao('${it.id}')">✕</button>
      </div></td>
    </tr>`;
  }).join('');
}

function render(){
  popularFiltroMes();
  const dados = lancamentosDaLoja();
  const pendPagar = dados.filter(x=>x.tipo==='pagar' && x.status!=='pago');
  const totPagar = pendPagar.reduce((s,x)=>s+Number(x.valor),0);
  document.getElementById('totalPagar').textContent = brl(totPagar);
  document.getElementById('subPagar').textContent = pendPagar.length + (pendPagar.length===1?' lançamento':' lançamentos');
  renderTabela('pagar', filtrosPagarAtivos);
  renderCaixaDoDia();
}

function formatarCampoMoeda(valor){
  return 'R$ ' + Number(valor).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

let _caixaInicialTimeout = null;

function onInputCaixaInicial(el){
  const digitos = el.value.replace(/\D/g,'');
  const valor = digitos ? (parseInt(digitos,10)/100) : 0;
  el.value = formatarCampoMoeda(valor);
  clearTimeout(_caixaInicialTimeout);
  _caixaInicialTimeout = setTimeout(()=>{ salvarCaixaInicial(valor); }, 500);
}

async function salvarCaixaInicial(valor){
  const v = parseFloat(valor) || 0;
  caixaIniciais[lojaAtual] = v;
  await sb.from('configuracoes').upsert({ chave: 'caixa_dinheiro_' + lojaAtual, valor: String(v) });
  renderCaixaDoDia();
}

let formaPagamentoCaixaPendente = null;

function confirmarPagamentoCaixa(forma){
  const dados = lancamentosDaLoja().filter(x=>x.tipo==='pagar' && x.status!=='pago' && x.forma_pagamento===forma);
  if(dados.length===0) return;
  formaPagamentoCaixaPendente = forma;
  const total = dados.reduce((s,x)=>s+Number(x.valor),0);
  const rotulo = forma==='dinheiro' ? 'dinheiro' : 'cartão';
  document.getElementById('confirmPagamentoCaixaTexto').textContent =
    `Isso vai marcar ${dados.length} ${dados.length===1?'conta':'contas'} (${brl(total)}) como paga${dados.length===1?'':'s'} em ${rotulo}, dando baixa em "Contas a pagar".`;
  document.getElementById('confirmPagamentoCaixaModal').style.display = 'flex';
}

function fecharConfirmacaoPagamentoCaixa(){
  document.getElementById('confirmPagamentoCaixaModal').style.display = 'none';
  formaPagamentoCaixaPendente = null;
}

async function confirmarPagamentoCaixaOk(){
  const btn = document.getElementById('confirmPagamentoCaixaBtn');
  if(btn.disabled) return; // trava contra clique duplo
  const forma = formaPagamentoCaixaPendente;
  if(!forma) return;
  const dados = lancamentosDaLoja().filter(x=>x.tipo==='pagar' && x.status!=='pago' && x.forma_pagamento===forma);
  const ids = dados.map(x=>x.id);
  if(ids.length===0){ fecharConfirmacaoPagamentoCaixa(); return; }

  btn.disabled = true;
  btn.textContent = 'Confirmando…';

  const hoje = todayStr();
  const { data: atualizados, error } = await sb.from('lancamentos')
    .update({ status: 'pago', data_pagamento: hoje })
    .in('id', ids)
    .select();

  if(!error && atualizados){
    atualizados.forEach(upd=>{
      const idx = lancamentos.findIndex(l=>l.id===upd.id);
      if(idx>-1) lancamentos[idx] = upd;
    });
    render();
    if(forma==='dinheiro'){
      await sincronizarPagamentosDinheiroEmLote(atualizados);
    }
  }

  btn.disabled = false;
  btn.textContent = 'Confirmar';
  fecharConfirmacaoPagamentoCaixa();
}

function renderCaixaDoDia(){
  const dados = lancamentosDaLoja().filter(x=>x.tipo==='pagar' && x.status!=='pago');

  const porMaisRecente = (a,b) => (a.forma_pagamento_em||a.criado_em||'').localeCompare(b.forma_pagamento_em||b.criado_em||'');
  const itensDinheiro = dados.filter(x=>x.forma_pagamento==='dinheiro').sort(porMaisRecente);
  const itensCartao = dados.filter(x=>x.forma_pagamento==='cartao').sort(porMaisRecente);

  const somaDinheiro = itensDinheiro.reduce((s,x)=>s+Number(x.valor),0);
  const somaCartao = itensCartao.reduce((s,x)=>s+Number(x.valor),0);

  const bodyDinheiro = document.getElementById('bodyCaixaDinheiro');
  const emptyDinheiro = document.getElementById('emptyCaixaDinheiro');
  if(itensDinheiro.length===0){
    bodyDinheiro.innerHTML = '';
    emptyDinheiro.style.display = 'block';
  }else{
    emptyDinheiro.style.display = 'none';
    bodyDinheiro.innerHTML = itensDinheiro.map(it=>`
      <tr><td class="contato">${escapeHtml(it.contato) || escapeHtml(it.descricao) || '—'}</td><td class="valor">${brl(it.valor)}</td></tr>
    `).join('');
  }
  document.getElementById('totalCaixaDinheiro').innerHTML = `<span>Total pago em dinheiro · ${itensDinheiro.length}</span><span class="valor-total">${brl(somaDinheiro)}</span>`;

  const bodyCartao = document.getElementById('bodyCaixaCartao');
  const emptyCartao = document.getElementById('emptyCaixaCartao');
  if(itensCartao.length===0){
    bodyCartao.innerHTML = '';
    emptyCartao.style.display = 'block';
  }else{
    emptyCartao.style.display = 'none';
    bodyCartao.innerHTML = itensCartao.map(it=>`
      <tr><td class="contato">${escapeHtml(it.contato) || escapeHtml(it.descricao) || '—'}</td><td class="valor">${brl(it.valor)}</td></tr>
    `).join('');
  }
  document.getElementById('totalCaixaCartao').innerHTML = `<span>Total pago em cartão · ${itensCartao.length}</span><span class="valor-total">${brl(somaCartao)}</span>`;

  const caixaHoje = caixaIniciais[lojaAtual] || 0;
  const saldo = caixaHoje - somaDinheiro;
  const saldoEl = document.getElementById('saldoCaixaDinheiro');
  saldoEl.innerHTML = `<span>Saldo restante</span><span class="valor-saldo">${brl(saldo)}</span>`;
  saldoEl.classList.toggle('negativo', saldo < 0);
}

let fixaTipo = 'pagar';
let fixasCache = [];

function setFixaTipo(t){
  fixaTipo = t;
  document.querySelectorAll('#fixaTipoToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipo===t));
  document.getElementById('fixaContatoLabel').textContent = t==='pagar' ? 'Fornecedor' : 'Cliente';
  document.getElementById('fixa_contato').placeholder = t==='pagar' ? 'Ex: Aluguel' : 'Ex: Assinatura mensal';
}

async function abrirFixas(){
  document.getElementById('fixasLojaNome').textContent = NOMES_LOJA[lojaAtual] || '';
  await carregarFixas();
}

async function carregarFixas(){
  const { data, error } = await sb.from('despesas_fixas').select('*').eq('loja', lojaAtual).eq('ativo', true).order('dia_vencimento');
  if(error){
    document.getElementById('fixasBody').innerHTML = '';
    document.getElementById('fixasEmpty').textContent = 'Erro ao carregar: ' + error.message;
    document.getElementById('fixasEmpty').style.display = 'block';
    return;
  }
  fixasCache = data || [];
  renderFixasTable();
}

function renderFixasTable(){
  const body = document.getElementById('fixasBody');
  const empty = document.getElementById('fixasEmpty');
  atualizarTotaisFixas();
  if(fixasCache.length===0){
    body.innerHTML = '';
    empty.textContent = 'Nenhuma despesa fixa cadastrada ainda.';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  body.innerHTML = fixasCache.map(f=>`
    <tr>
      <td>${escapeHtml(f.contato)}</td>
      <td><input class="fixa-valor-input" type="number" step="0.01" min="0" value="${f.valor}" onchange="atualizarValorFixa('${f.id}', this.value)"></td>
      <td>dia ${f.dia_vencimento}</td>
      <td>${f.tipo==='pagar' ? 'A pagar' : 'A receber'}</td>
      <td><div class="rowactions">
        <button class="iconbtn edit" title="Editar" onclick="abrirEditarFixa('${f.id}')">✎</button>
        <button class="iconbtn del" title="Remover" onclick="excluirFixa('${f.id}')">✕</button>
      </div></td>
    </tr>
  `).join('');
}

let fixaEditandoId = null;

function abrirEditarFixa(id){
  const f = fixasCache.find(x=>x.id===id);
  if(!f) return;
  fixaEditandoId = id;
  document.getElementById('fixa_edit_nome').value = f.contato;
  document.getElementById('fixa_edit_dia').value = f.dia_vencimento;
  document.getElementById('fixaEditErr').style.display = 'none';
  document.getElementById('editarFixaModal').style.display = 'flex';
}

function fecharEditarFixa(){
  document.getElementById('editarFixaModal').style.display = 'none';
  fixaEditandoId = null;
}

async function salvarEdicaoFixa(){
  const nome = document.getElementById('fixa_edit_nome').value.trim();
  const dia = parseInt(document.getElementById('fixa_edit_dia').value, 10);
  const err = document.getElementById('fixaEditErr');

  if(!nome || isNaN(dia) || dia<1 || dia>31){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const btn = document.getElementById('fixaEditSalvarBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const { error } = await sb.from('despesas_fixas').update({ contato: nome, dia_vencimento: dia }).eq('id', fixaEditandoId);

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Salvar';
    return;
  }

  const f = fixasCache.find(x=>x.id===fixaEditandoId);
  if(f){ f.contato = nome; f.dia_vencimento = dia; }

  const hoje = new Date();
  const ultimoDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).getDate();
  const diaReal = Math.min(dia, ultimoDiaDoMes);
  const anoMes = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0');
  const novoVencimento = anoMes + '-' + String(diaReal).padStart(2,'0');

  const { data: atualizados, error: e2 } = await sb.from('lancamentos')
    .update({ contato: nome, descricao: nome, vencimento: novoVencimento })
    .eq('despesa_fixa_id', fixaEditandoId)
    .eq('status', 'pendente')
    .select();

  if(!e2 && atualizados){
    atualizados.forEach(upd=>{
      const idx = lancamentos.findIndex(l=>l.id===upd.id);
      if(idx>-1) lancamentos[idx] = upd;
    });
    render();
  }

  renderFixasTable();
  btn.disabled = false;
  btn.textContent = 'Salvar';
  fecharEditarFixa();
}

function atualizarTotaisFixas(){
  const totalPagar = fixasCache.filter(f=>f.tipo==='pagar').reduce((s,f)=>s+Number(f.valor),0);
  document.getElementById('fixasTotais').innerHTML = `
    <div class="chip pagar"><div class="lbl">Total fixo a pagar/mês</div><div class="val">${brl(totalPagar)}</div></div>
  `;
}

async function adicionarFixa(){
  const contato = document.getElementById('fixa_contato').value.trim();
  const valor = parseFloat(document.getElementById('fixa_valor').value);
  const dia = parseInt(document.getElementById('fixa_dia').value, 10);
  const err = document.getElementById('fixaErr');
  if(!contato || isNaN(valor) || valor<=0 || isNaN(dia) || dia<1 || dia>31){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  const { data, error } = await sb.from('despesas_fixas').insert({
    loja: lojaAtual, tipo: fixaTipo, contato: contato, valor: valor, dia_vencimento: dia, ativo: true
  }).select().single();
  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }
  fixasCache.push(data);
  renderFixasTable();
  document.getElementById('fixa_contato').value = '';
  document.getElementById('fixa_valor').value = '';
  document.getElementById('fixa_dia').value = '';
}

async function atualizarValorFixa(id, novoValor){
  const valor = parseFloat(novoValor);
  if(isNaN(valor) || valor<=0) return;
  const { error } = await sb.from('despesas_fixas').update({ valor: valor }).eq('id', id);
  if(!error){
    const f = fixasCache.find(x=>x.id===id);
    if(f) f.valor = valor;

    const { data: atualizados, error: e2 } = await sb.from('lancamentos')
      .update({ valor: valor })
      .eq('despesa_fixa_id', id)
      .eq('status', 'pendente')
      .select();
    if(!e2 && atualizados && atualizados.length>0){
      atualizados.forEach(upd=>{
        const idx = lancamentos.findIndex(l=>l.id===upd.id);
        if(idx>-1) lancamentos[idx] = upd;
      });
      render();
    }
  }
}

async function excluirFixa(id){
  const { error } = await sb.from('despesas_fixas').update({ ativo: false }).eq('id', id);
  if(!error){
    fixasCache = fixasCache.filter(x=>x.id!==id);
    renderFixasTable();
  }
}

function parseDiaFixo(s){
  s = (s||'').trim();
  let m = s.match(/^(\d{1,2})$/);
  if(m){
    const d = parseInt(m[1],10);
    return (d>=1 && d<=31) ? d : null;
  }
  const dataConvertida = parseDataBR(s);
  if(dataConvertida){
    const d = parseInt(dataConvertida.slice(8,10),10);
    return (d>=1 && d<=31) ? d : null;
  }
  return null;
}

let fixaImportParsed = [];

function toggleFixaImport(){
  const area = document.getElementById('fixaImportArea');
  area.style.display = (area.style.display === 'none') ? 'block' : 'none';
}

function cancelarFixaImport(){
  document.getElementById('fixaImportArea').style.display = 'none';
  document.getElementById('fixaImportText').value = '';
  document.getElementById('fixaImportPreviewWrap').style.display = 'none';
  fixaImportParsed = [];
}

function analisarFixaImport(){
  const raw = document.getElementById('fixaImportText').value;
  const linhas = raw.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
  fixaImportParsed = linhas.map(linha=>{
    const partes = splitColunas(linha);
    const nome = (partes[0]||'').trim();
    const valorTexto = (partes[1]||'').trim();
    const diaTexto = (partes[2]||'').trim();
    const valor = parseValorBR(valorTexto);
    const dia = parseDiaFixo(diaTexto);
    const valido = !!nome && valor!==null && valor>0 && dia!==null;
    return { nome, valorTexto, valor, diaTexto, dia, valido };
  });
  renderFixaImportPreview();
}

function renderFixaImportPreview(){
  const body = document.getElementById('fixaImportPreviewBody');
  body.innerHTML = fixaImportParsed.map(r=>{
    return `<tr class="${r.valido?'':'vencido'}">
      <td>${escapeHtml(r.nome) || '—'}</td>
      <td>${r.valor!==null ? brl(r.valor) : (escapeHtml(r.valorTexto) + ' ⚠️')}</td>
      <td>${r.dia!==null ? ('dia ' + r.dia) : (escapeHtml(r.diaTexto) + ' ⚠️')}</td>
    </tr>`;
  }).join('');
  const validos = fixaImportParsed.filter(r=>r.valido).length;
  const invalidos = fixaImportParsed.length - validos;
  document.getElementById('fixaImportSummary').textContent =
    validos + (validos===1 ? ' despesa fixa pronta para importar' : ' despesas fixas prontas para importar') +
    (invalidos>0 ? ' — ' + invalidos + ' linha(s) com erro serão ignoradas' : '');
  document.getElementById('fixaImportPreviewWrap').style.display = 'block';
}

async function confirmarFixaImport(){
  const validos = fixaImportParsed.filter(r=>r.valido);
  if(validos.length===0) return;
  const btn = document.getElementById('fixaImportConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Importando…';
  const registros = validos.map(r=>({
    loja: lojaAtual, tipo: fixaTipo, contato: r.nome, valor: r.valor, dia_vencimento: r.dia, ativo: true
  }));
  try{
    const { data, error } = await sb.from('despesas_fixas').insert(registros).select();
    if(error){
      alert('Erro ao importar: ' + error.message);
      return;
    }
    fixasCache = fixasCache.concat(data);
    renderFixasTable();
    cancelarFixaImport();
  }catch(e){
    alert('Não foi possível importar. Detalhe: ' + (e && e.message ? e.message : e));
  }finally{
    btn.disabled = false;
    btn.textContent = 'Importar';
  }
}

async function gerarLancamentosFixos(){
  const { data: fixas, error } = await sb.from('despesas_fixas').select('*').eq('ativo', true);
  if(error || !fixas || fixas.length===0) return;

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtualNum = hoje.getMonth()+1;
  const anoMes = anoAtual + '-' + String(mesAtualNum).padStart(2,'0');
  const ultimoDiaDoMes = new Date(anoAtual, mesAtualNum, 0).getDate();

  const { data: pulados } = await sb.from('despesas_fixas_puladas').select('despesa_fixa_id, mes').eq('mes', anoMes);
  const idsPulados = new Set((pulados||[]).map(p=>p.despesa_fixa_id));

  const novos = fixas
    .filter(f => !idsPulados.has(f.id))
    .filter(f => !lancamentos.some(l => l.despesa_fixa_id === f.id && l.vencimento.slice(0,7) === anoMes))
    .map(f => {
      const diaReal = Math.min(f.dia_vencimento, ultimoDiaDoMes);
      return {
        tipo: f.tipo, descricao: f.contato, contato: f.contato, valor: f.valor,
        vencimento: anoMes + '-' + String(diaReal).padStart(2,'0'),
        status: 'pendente', loja: f.loja, despesa_fixa_id: f.id
      };
    });

  if(novos.length===0) return;

  const { data: inseridos, error: e2 } = await sb.from('lancamentos').insert(novos).select();
  if(!e2 && inseridos){
    lancamentos = lancamentos.concat(inseridos);
  }
}

let importTipo = 'pagar';
let importParsed = [];

function abrirImport(){
  document.getElementById('importModal').style.display = 'flex';
}

function fecharImport(){
  document.getElementById('importModal').style.display = 'none';
  document.getElementById('importText').value = '';
  document.getElementById('importPreviewWrap').style.display = 'none';
  importParsed = [];
}

function setImportTipo(t){
  importTipo = t;
  document.querySelectorAll('#importTipoToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipo===t));
}

function parseValorBR(s){
  s = (s||'').trim();
  if(!s) return null;
  s = s.replace(/[^\d,.\-]/g, '');
  if(!s) return null;
  if(s.includes(',') && s.includes('.')){
    s = s.replace(/\./g,'').replace(',', '.');
  }else if(s.includes(',')){
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

const MESES_PT = {jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};

function parseDataBR(s){
  s = (s||'').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m){
    let [, d, mo, y] = m;
    if(y.length===2) y = '20'+y;
    return y + '-' + mo.padStart(2,'0') + '-' + d.padStart(2,'0');
  }
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if(m){
    let [, d, mo, y] = m;
    if(y.length===2) y = '20'+y;
    return y + '-' + mo.padStart(2,'0') + '-' + d.padStart(2,'0');
  }
  m = s.match(/^(\d{1,2})\s*[\/\-]\s*([a-zçã]{3,4})\.?\s*[\/\-]\s*(\d{2,4})$/i);
  if(m){
    const mesNum = MESES_PT[m[2].toLowerCase().slice(0,3)];
    let ano = m[3];
    if(ano.length===2) ano = '20'+ano;
    if(mesNum) return ano + '-' + String(mesNum).padStart(2,'0') + '-' + m[1].padStart(2,'0');
  }
  m = s.match(/^(\d{1,2})\s*[\/\-]\s*([a-zçã]{3,4})\.?$/i);
  if(m){
    const mesNum = MESES_PT[m[2].toLowerCase().slice(0,3)];
    if(mesNum){
      const ano = new Date().getFullYear();
      return ano + '-' + String(mesNum).padStart(2,'0') + '-' + m[1].padStart(2,'0');
    }
  }
  return null;
}

function splitColunas(linha){
  let partes = linha.split('\t').map(p=>p.trim()).filter(p=>p.length>0);
  if(partes.length>=3) return partes;
  partes = linha.split(';').map(p=>p.trim()).filter(p=>p.length>0);
  if(partes.length>=3) return partes;
  partes = linha.split(/\s{2,}/).map(p=>p.trim()).filter(p=>p.length>0);
  return partes;
}

function analisarImport(){
  const raw = document.getElementById('importText').value;
  const linhas = raw.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
  importParsed = linhas.map(linha=>{
    const partes = splitColunas(linha);
    const desc = (partes[0]||'').trim();
    const valorTexto = (partes[1]||'').trim();
    const dataTexto = (partes[2]||'').trim();
    const valor = parseValorBR(valorTexto);
    const data = parseDataBR(dataTexto);
    const valido = !!desc && valor!==null && valor>0 && !!data;
    return { desc, valorTexto, valor, dataTexto, data, valido };
  });
  renderImportPreview();
}

function renderImportPreview(){
  const body = document.getElementById('importPreviewBody');
  body.innerHTML = importParsed.map(r=>{
    return `<tr class="${r.valido?'':'vencido'}">
      <td>${escapeHtml(r.desc) || '—'}</td>
      <td>${r.valor!==null ? brl(r.valor) : (escapeHtml(r.valorTexto) + ' ⚠️')}</td>
      <td>${r.data ? fmtData(r.data) : (escapeHtml(r.dataTexto) + ' ⚠️')}</td>
    </tr>`;
  }).join('');
  const validos = importParsed.filter(r=>r.valido).length;
  const invalidos = importParsed.length - validos;
  document.getElementById('importSummary').textContent =
    validos + (validos===1 ? ' lançamento pronto para importar' : ' lançamentos prontos para importar') +
    (invalidos>0 ? ' — ' + invalidos + ' linha(s) com erro serão ignoradas' : '');
  document.getElementById('importPreviewWrap').style.display = 'block';
}

async function confirmarImport(){
  const validos = importParsed.filter(r=>r.valido);
  if(validos.length===0) return;
  const btn = document.getElementById('importConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Importando…';
  const registros = validos.map(r=>({
    tipo: importTipo, descricao: r.desc, contato: r.desc, valor: r.valor, vencimento: r.data, status: 'pendente', loja: lojaAtual
  }));
  try{
    const { data, error } = await sb.from('lancamentos').insert(registros).select();
    if(error){
      alert('Erro ao importar: ' + error.message);
      return;
    }
    lancamentos = lancamentos.concat(data);
    render();
    fecharImport();
  }catch(e){
    alert('Não foi possível importar. Verifique sua internet e tente novamente. Detalhe: ' + (e && e.message ? e.message : e));
  }finally{
    btn.disabled = false;
    btn.textContent = 'Importar';
  }
}

/* ================= CONTRATOS E RECIBOS ================= */

let recibosConfig = null;
let recibosCache = [];
let contrachequesCache = [];
let contrachequeProventos = [];
let contrachequeDescontos = [];

function grupoNumeroExtenso(n){
  const u=['','um','dois','três','quatro','cinco','seis','sete','oito','nove'];
  const d10=['dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const dz=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const ct=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  n=Math.floor(n);
  if(n===100) return 'cem';
  const partes=[];
  const c=Math.floor(n/100), resto=n%100;
  if(c) partes.push(ct[c]);
  if(resto>=10 && resto<20) partes.push(d10[resto-10]);
  else{
    const dez=Math.floor(resto/10), un=resto%10;
    if(dez) partes.push(dz[dez]);
    if(un) partes.push(u[un]);
  }
  return partes.join(' e ');
}

function inteiroPorExtenso(n){
  n=Math.floor(Math.abs(n));
  if(n===0) return 'zero';
  const classes=[
    {valor:1000000000,singular:'bilhão',plural:'bilhões'},
    {valor:1000000,singular:'milhão',plural:'milhões'},
    {valor:1000,singular:'mil',plural:'mil'},
    {valor:1,singular:'',plural:''}
  ];
  const partes=[];
  classes.forEach(c=>{
    const qtd=Math.floor(n/c.valor);
    if(!qtd) return;
    n%=c.valor;
    if(c.valor===1000 && qtd===1) partes.push('mil');
    else{
      const texto=grupoNumeroExtenso(qtd);
      const classe=qtd===1?c.singular:c.plural;
      partes.push((texto+' '+classe).trim());
    }
  });
  if(partes.length<=1) return partes[0]||'zero';
  return partes.slice(0,-1).join(', ')+' e '+partes[partes.length-1];
}

function valorPorExtenso(valor){
  const total=Math.round((Number(valor)||0)*100);
  const reais=Math.floor(total/100), centavos=total%100;
  const partes=[];
  if(reais){
    const unidade=reais===1?' real':(reais>=1000000&&reais%1000000===0?' de reais':' reais');
    partes.push(inteiroPorExtenso(reais)+unidade);
  }
  if(centavos) partes.push(inteiroPorExtenso(centavos)+' '+(centavos===1?'centavo':'centavos'));
  return partes.length?partes.join(' e '):'zero reais';
}

function dataPorExtensoRecibo(data){
  if(!data) return '';
  const d=new Date(data+'T12:00:00');
  return d.getDate()+' de '+NOMES_MES[d.getMonth()].toLowerCase()+' de '+d.getFullYear();
}

function dadosFormularioRecibo(){
  const valor=Number(document.getElementById('rec_valor').value||0);
  return {
    pagador_nome:document.getElementById('rec_pagador_nome').value.trim(),
    pagador_documento:document.getElementById('rec_pagador_documento').value.trim(),
    pagador_endereco:document.getElementById('rec_pagador_endereco').value.trim(),
    data_recibo:document.getElementById('rec_data').value,
    valor:valor,
    valor_extenso:valorPorExtenso(valor),
    referencia:document.getElementById('rec_referencia').value.trim(),
    cidade:(recibosConfig&&recibosConfig.cidade)||'',
    estado:(recibosConfig&&recibosConfig.estado)||'',
    recebedor_nome:document.getElementById('rec_recebedor_nome').value.trim(),
    recebedor_documento:document.getElementById('rec_recebedor_documento').value.trim(),
    recebedor_endereco:null,
    observacao_rodape:(recibosConfig&&recibosConfig.observacao_rodape)||''
  };
}

function textoRecibo(d){
  const doc=d.pagador_documento?' (CPF/CNPJ '+d.pagador_documento+')':'';
  return 'Recebi de '+(d.pagador_nome||'[PAGADOR]')+doc+', no endereço '+(d.pagador_endereco||'[ENDEREÇO]')+', a quantia de '+brl(d.valor)+' ('+d.valor_extenso+'), referente a '+(d.referencia||'[REFERÊNCIA]')+'.';
}

function atualizarPreviaRecibo(){
  const d=dadosFormularioRecibo();
  document.getElementById('recValorExtenso').textContent=d.valor>0?d.valor_extenso:'';
  const local=[d.cidade,d.estado].filter(Boolean).join(' - ');
  const assinatura=d.recebedor_nome?'<br><br><div style="text-align:center;">____________________________________<br><strong>'+escapeHtml(d.recebedor_nome)+'</strong><br>CPF: '+escapeHtml(d.recebedor_documento||'[CPF]')+'</div>':'';
  document.getElementById('recPreviaTexto').innerHTML='<strong>RECIBO</strong><br><br>'+escapeHtml(textoRecibo(d))+'<br><br>'+escapeHtml(local+(local?', ':'')+dataPorExtensoRecibo(d.data_recibo))+'.'+assinatura;
}

async function abrirContratos(){
  if(!document.getElementById('rec_data').value) document.getElementById('rec_data').value=todayStr();
  inicializarFormularioContracheque();
  await carregarConfiguracaoRecibos();
  await carregarRecibos();
  await carregarContracheques();
  atualizarPreviaRecibo();
}

async function carregarConfiguracaoRecibos(){
  const {data,error}=await sb.from('recibos_configuracoes').select('*').eq('loja',lojaAtual).maybeSingle();
  if(error){
    console.error('Erro ao carregar configurações de recibos:',error);
    recibosConfig=null;
    document.getElementById('recConfigStatus').textContent='⚠ Execute o SQL do módulo no Supabase';
    document.getElementById('recConfigStatus').classList.remove('ok');
    return;
  }
  recibosConfig=data||null;
  const status=document.getElementById('recConfigStatus');
  status.textContent=recibosConfig&&recibosConfig.cidade?'✓ Configuração desta loja pronta':'⚙ Configure os dados padrão desta loja';
  status.classList.toggle('ok',!!(recibosConfig&&recibosConfig.cidade));
  atualizarStatusConfigContracheque();
  preencherFormularioComConfigRecibos();
}

function preencherFormularioComConfigRecibos(){
  if(!recibosConfig) return;
  document.getElementById('rec_pagador_nome').value=recibosConfig.pagador_nome_padrao||'';
  document.getElementById('rec_pagador_documento').value=recibosConfig.pagador_documento_padrao||'';
  document.getElementById('rec_pagador_endereco').value=recibosConfig.pagador_endereco_padrao||'';
  document.getElementById('rec_referencia').value=recibosConfig.referencia_padrao||'';
}

function abrirConfiguracaoRecibos(){
  const c=recibosConfig||{};
  const mapa={
    rec_cfg_empresa_razao:'empresa_razao_social',rec_cfg_empresa_fantasia:'empresa_nome_fantasia',
    rec_cfg_empresa_cnpj:'empresa_cnpj',rec_cfg_empresa_endereco:'empresa_endereco',
    rec_cfg_cidade:'cidade',rec_cfg_estado:'estado',
    rec_cfg_pagador_nome:'pagador_nome_padrao',rec_cfg_pagador_documento:'pagador_documento_padrao',
    rec_cfg_pagador_endereco:'pagador_endereco_padrao',rec_cfg_referencia:'referencia_padrao',
    rec_cfg_observacao:'observacao_rodape'
  };
  Object.keys(mapa).forEach(id=>document.getElementById(id).value=c[mapa[id]]||'');
  document.getElementById('recConfigLojaNome').textContent=NOMES_LOJA[lojaAtual]||lojaAtual;
  document.getElementById('recConfigErr').style.display='none';
  document.getElementById('recConfigModal').style.display='flex';
}

function fecharConfiguracaoRecibos(){ document.getElementById('recConfigModal').style.display='none'; }

async function salvarConfiguracaoRecibos(){
  const payload={
    loja:lojaAtual,
    recebedor_nome:null,
    recebedor_documento:null,
    recebedor_endereco:null,
    empresa_razao_social:document.getElementById('rec_cfg_empresa_razao').value.trim()||null,
    empresa_nome_fantasia:document.getElementById('rec_cfg_empresa_fantasia').value.trim()||null,
    empresa_cnpj:document.getElementById('rec_cfg_empresa_cnpj').value.trim()||null,
    empresa_endereco:document.getElementById('rec_cfg_empresa_endereco').value.trim()||null,
    cidade:document.getElementById('rec_cfg_cidade').value.trim(),
    estado:document.getElementById('rec_cfg_estado').value.trim().toUpperCase()||null,
    pagador_nome_padrao:document.getElementById('rec_cfg_pagador_nome').value.trim()||null,
    pagador_documento_padrao:document.getElementById('rec_cfg_pagador_documento').value.trim()||null,
    pagador_endereco_padrao:document.getElementById('rec_cfg_pagador_endereco').value.trim()||null,
    referencia_padrao:document.getElementById('rec_cfg_referencia').value.trim()||null,
    observacao_rodape:document.getElementById('rec_cfg_observacao').value.trim()||null
  };
  if(!payload.cidade){
    const e=document.getElementById('recConfigErr');e.textContent='Informe pelo menos a cidade utilizada nos recibos.';e.style.display='block';return;
  }
  const btn=document.getElementById('recConfigSalvarBtn');btn.disabled=true;btn.textContent='Salvando…';
  const {data,error}=await sb.from('recibos_configuracoes').upsert(payload,{onConflict:'loja'}).select().single();
  btn.disabled=false;btn.textContent='Salvar configurações';
  if(error){const e=document.getElementById('recConfigErr');e.textContent='Não foi possível salvar. Confirme se executou o SQL do módulo.';e.style.display='block';console.error(error);return;}
  recibosConfig=data;fecharConfiguracaoRecibos();preencherFormularioComConfigRecibos();atualizarPreviaRecibo();
  const status=document.getElementById('recConfigStatus');status.textContent='✓ Configuração desta loja pronta';status.classList.add('ok');
  atualizarStatusConfigContracheque();
}

function validarDadosRecibo(d){
  if(!recibosConfig||!d.cidade) return 'Configure primeiro a cidade utilizada nos recibos.';
  if(!d.recebedor_nome||!d.recebedor_documento) return 'Informe o nome e o CPF da pessoa que recebeu e assinará o recibo.';
  if(!d.pagador_nome||!d.pagador_endereco||!d.data_recibo||!d.referencia||!(d.valor>0)) return 'Preencha pagador, endereço, data, valor e referência.';
  return '';
}

async function salvarRecibo(baixarPdf){
  const d=dadosFormularioRecibo(), erro=validarDadosRecibo(d);
  const e=document.getElementById('recErr');
  if(erro){e.textContent=erro;e.style.display='block';return;}
  e.style.display='none';
  const {data,error}=await sb.from('recibos').insert(Object.assign({loja:lojaAtual},d)).select().single();
  if(error){e.textContent='Não foi possível salvar o recibo. Confirme se executou o SQL do módulo.';e.style.display='block';console.error(error);return;}
  recibosCache.unshift(data);
  renderRecibos();
  if(baixarPdf) gerarPdfRecibo(data);
  limparFormularioRecibo();
}

function gerarPdfReciboFormulario(){
  const d=dadosFormularioRecibo(), erro=validarDadosRecibo(d);
  const e=document.getElementById('recErr');
  if(erro){e.textContent=erro;e.style.display='block';return;}
  e.style.display='none';gerarPdfRecibo(d);
}

function gerarPdfRecibo(d){
  if(!window.jspdf||!window.jspdf.jsPDF){alert('Não foi possível carregar o recurso de PDF.');return;}
  const jsPDF=window.jspdf.jsPDF, doc=new jsPDF({unit:'mm',format:'a4'});
  doc.setDrawColor(35,55,84);doc.setLineWidth(.5);doc.roundedRect(16,10,178,128,3,3);
  doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(23,35,60);doc.text('RECIBO',105,25,{align:'center'});
  if(d.id){doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(90,105,125);doc.text('Nº '+d.id,28,36);}
  doc.setFontSize(10.5);doc.setFont('helvetica','normal');doc.setTextColor(35,48,65);doc.text('Valor: '+brl(d.valor),181,36,{align:'right'});
  doc.setDrawColor(210,220,232);doc.line(27,42,183,42);
  doc.setFontSize(10.5);
  const linhas=doc.splitTextToSize(textoRecibo(d),154);doc.text(linhas,28,54,{align:'justify',maxWidth:154,lineHeightFactor:1.4});
  const local=[d.cidade,d.estado].filter(Boolean).join(' - ');
  doc.text(local+', '+dataPorExtensoRecibo(d.data_recibo)+'.',181,87,{align:'right'});
  doc.setDrawColor(80,95,115);doc.line(58,106,152,106);
  doc.setFont('helvetica','bold');doc.text(d.recebedor_nome||'',105,113,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  if(d.recebedor_documento) doc.text('CPF: '+d.recebedor_documento,105,119,{align:'center'});
  if(d.observacao_rodape){doc.setFontSize(7.5);doc.setTextColor(90,105,125);doc.text(doc.splitTextToSize(d.observacao_rodape,154).slice(0,2),28,129);}
  doc.setDrawColor(170,180,192);doc.setLineWidth(.25);doc.setLineDashPattern([2,2],0);doc.line(8,148.5,202,148.5);doc.setLineDashPattern([],0);
  doc.setFontSize(7);doc.setTextColor(130,140,152);doc.text('linha de corte — metade inferior livre para outra impressão',105,146,{align:'center'});
  doc.save('recibo-'+(d.id||'novo')+'-'+d.data_recibo+'.pdf');
}

async function carregarRecibos(){
  let q=sb.from('recibos').select('*').eq('loja',lojaAtual);
  const mes=document.getElementById('recFiltroMes').value;
  if(mes){const p=mes.split('-'),ultimo=new Date(Number(p[0]),Number(p[1]),0).getDate();q=q.gte('data_recibo',mes+'-01').lte('data_recibo',mes+'-'+String(ultimo).padStart(2,'0'));}
  const {data,error}=await q.order('data_recibo',{ascending:false}).order('id',{ascending:false});
  if(error){console.error('Erro ao carregar recibos:',error);recibosCache=[];}else recibosCache=data||[];
  renderRecibos();
}

function renderRecibos(){
  const busca=(document.getElementById('recBusca').value||'').toLowerCase().trim();
  const lista=recibosCache.filter(r=>!busca||String(r.pagador_nome||'').toLowerCase().includes(busca)||String(r.recebedor_nome||'').toLowerCase().includes(busca)||String(r.referencia||'').toLowerCase().includes(busca));
  const body=document.getElementById('recBody'),empty=document.getElementById('recEmpty');
  empty.style.display=lista.length?'none':'block';
  body.innerHTML=lista.map(r=>'<tr><td>#'+r.id+'</td><td>'+fmtData(r.data_recibo)+'</td><td>'+escapeHtml(r.pagador_nome)+'</td><td>'+escapeHtml(r.recebedor_nome)+'</td><td>'+escapeHtml(r.referencia)+'</td><td class="valor">'+brl(r.valor)+'</td><td><div class="rowactions"><button class="iconbtn" title="PDF" onclick="baixarPdfReciboHistorico('+r.id+')">PDF</button><button class="iconbtn edit" title="Duplicar" onclick="duplicarRecibo('+r.id+')">⧉</button><button class="iconbtn del" title="Excluir" onclick="excluirRecibo('+r.id+')">✕</button></div></td></tr>').join('');
}

function baixarPdfReciboHistorico(id){const r=recibosCache.find(x=>Number(x.id)===Number(id));if(r)gerarPdfRecibo(r);}
function duplicarRecibo(id){
  const r=recibosCache.find(x=>Number(x.id)===Number(id));if(!r)return;
  document.getElementById('rec_pagador_nome').value=r.pagador_nome||'';
  document.getElementById('rec_pagador_documento').value=r.pagador_documento||'';
  document.getElementById('rec_pagador_endereco').value=r.pagador_endereco||'';
  document.getElementById('rec_recebedor_nome').value=r.recebedor_nome||'';
  document.getElementById('rec_recebedor_documento').value=r.recebedor_documento||'';
  document.getElementById('rec_valor').value=r.valor||'';
  document.getElementById('rec_referencia').value=r.referencia||'';
  document.getElementById('rec_data').value=todayStr();atualizarPreviaRecibo();window.scrollTo({top:0,behavior:'smooth'});
}
async function excluirRecibo(id){
  if(!confirm('Excluir este recibo do histórico?'))return;
  const {error}=await sb.from('recibos').delete().eq('id',id).eq('loja',lojaAtual);
  if(error){alert('Não foi possível excluir o recibo.');return;}
  recibosCache=recibosCache.filter(r=>Number(r.id)!==Number(id));renderRecibos();
}
function limparFormularioRecibo(){document.getElementById('rec_valor').value='';document.getElementById('rec_recebedor_nome').value='';document.getElementById('rec_recebedor_documento').value='';document.getElementById('rec_data').value=todayStr();preencherFormularioComConfigRecibos();document.getElementById('recErr').style.display='none';atualizarPreviaRecibo();}
function limparFiltroRecibos(){document.getElementById('recFiltroMes').value='';document.getElementById('recBusca').value='';carregarRecibos();}

/* ================= CONTRACHEQUES ================= */

function mudarAbaContratos(aba){
  const recibos=aba==='recibos';
  document.getElementById('contratosAbaRecibos').style.display=recibos?'block':'none';
  document.getElementById('contratosAbaContracheques').style.display=recibos?'none':'block';
  document.getElementById('contratosTabRecibos').classList.toggle('active',recibos);
  document.getElementById('contratosTabContracheques').classList.toggle('active',!recibos);
}

function atualizarStatusConfigContracheque(){
  const el=document.getElementById('holConfigStatus');if(!el)return;
  const pronto=!!(recibosConfig&&(recibosConfig.empresa_razao_social||recibosConfig.empresa_nome_fantasia)&&recibosConfig.empresa_cnpj);
  el.textContent=pronto?'✓ Dados da empresa configurados':'⚙ Configure razão social/nome fantasia e CNPJ desta loja';
  el.classList.toggle('ok',pronto);
}

function competenciaAtual(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}

function diasNoMesContracheque(){
  const competencia=document.getElementById('hol_competencia')?.value||competenciaAtual();
  const partes=competencia.split('-').map(Number);
  return partes.length===2&&partes[0]&&partes[1] ? new Date(partes[0],partes[1],0).getDate() : 30;
}

function arredondarCentavos(valor){return Math.round((Number(valor)||0)*100)/100;}

function prepararProventoProporcional(item){
  const diasMes=diasNoMesContracheque();
  if(item.dias===undefined||item.dias===null||item.dias===''){
    const encontrado=String(item.referencia||'').match(/\d+/);
    item.dias=encontrado?Math.min(diasMes,Math.max(1,Number(encontrado[0]))):diasMes;
  }
  item.dias=Math.min(diasMes,Math.max(1,Number(item.dias)||diasMes));
  if(item.valor_integral===undefined||item.valor_integral===null) item.valor_integral=Number(item.valor)||0;
  item.valor_integral=Math.max(0,Number(item.valor_integral)||0);
  item.dias_mes=diasMes;
  item.referencia=item.dias+' dia'+(item.dias===1?'':'s');
  item.valor=arredondarCentavos(item.valor_integral/diasMes*item.dias);
  return item;
}

function memoriaCalculoProventoHtml(item){
  prepararProventoProporcional(item);
  return brl(item.valor_integral)+' ÷ '+item.dias_mes+' × '+item.dias+' = <strong>'+brl(item.valor)+'</strong>';
}

function atualizarCompetenciaContracheque(){
  contrachequeProventos.forEach(prepararProventoProporcional);
  renderLinhasContracheque();
}

function indicePericulosidadeContracheque(){
  return contrachequeProventos.findIndex(x=>x.auto_periculosidade||String(x.descricao||'').toLowerCase()==='periculosidade');
}

function atualizarPericulosidadeContracheque(){
  const indice=indicePericulosidadeContracheque();
  if(indice<0)return;
  const salario=Math.max(0,Number(document.getElementById('hol_salario_base').value)||0);
  contrachequeProventos[indice].auto_periculosidade=true;
  contrachequeProventos[indice].valor_integral=arredondarCentavos(salario*.30);
  prepararProventoProporcional(contrachequeProventos[indice]);
}

function alternarPericulosidadeContracheque(){
  const marcado=document.getElementById('hol_periculosidade').checked;
  const indice=indicePericulosidadeContracheque();
  if(marcado&&indice<0){
    const dias=contrachequeProventos[0]?.dias||diasNoMesContracheque();
    contrachequeProventos.push({descricao:'Periculosidade',dias,valor_integral:0,valor:0,fixo:false,auto_periculosidade:true});
    atualizarPericulosidadeContracheque();
  }else if(!marcado&&indice>=0){
    contrachequeProventos.splice(indice,1);
  }
  renderLinhasContracheque();
}

function inicializarFormularioContracheque(){
  const comp=document.getElementById('hol_competencia');if(!comp)return;
  if(!comp.value) comp.value=competenciaAtual();
  if(!document.getElementById('hol_data_pagamento').value) document.getElementById('hol_data_pagamento').value=todayStr();
  if(!contrachequeProventos.length) contrachequeProventos=[{descricao:'Salário-base',dias:diasNoMesContracheque(),valor_integral:0,valor:0,fixo:true}];
  contrachequeProventos.forEach(prepararProventoProporcional);
  renderLinhasContracheque();
}

function adicionarLinhaContracheque(tipo,linha){
  const item=linha||(tipo==='provento'?{descricao:'',dias:diasNoMesContracheque(),valor_integral:0,valor:0,fixo:false}:{descricao:'',referencia:'',valor:0,fixo:false});
  if(tipo==='provento') prepararProventoProporcional(item);
  if(tipo==='provento') contrachequeProventos.push(item); else contrachequeDescontos.push(item);
  renderLinhasContracheque();
}

function removerLinhaContracheque(tipo,indice){
  const lista=tipo==='provento'?contrachequeProventos:contrachequeDescontos;
  if(lista[indice]&&lista[indice].fixo) return;
  lista.splice(indice,1);
  if(tipo==='provento') document.getElementById('hol_periculosidade').checked=indicePericulosidadeContracheque()>=0;
  renderLinhasContracheque();
}

function alterarLinhaContracheque(tipo,indice,campo,valor){
  const lista=tipo==='provento'?contrachequeProventos:contrachequeDescontos;
  if(!lista[indice])return;
  if(tipo==='provento'&&(campo==='dias'||campo==='valor_integral')){
    lista[indice][campo]=Math.max(0,Number(valor)||0);
    prepararProventoProporcional(lista[indice]);
    const calculado=document.getElementById('hol_calc_'+tipo+'_'+indice);
    if(calculado) calculado.innerHTML=memoriaCalculoProventoHtml(lista[indice]);
    if(indice===0&&campo==='dias'){
      const periculosidade=indicePericulosidadeContracheque();
      if(periculosidade>0){
        lista[periculosidade].dias=lista[0].dias;
        prepararProventoProporcional(lista[periculosidade]);
        const diasPer=document.getElementById('hol_dias_provento_'+periculosidade);
        const calcPer=document.getElementById('hol_calc_provento_'+periculosidade);
        if(diasPer)diasPer.value=lista[periculosidade].dias;
        if(calcPer)calcPer.innerHTML=memoriaCalculoProventoHtml(lista[periculosidade]);
      }
    }
  }else{
    lista[indice][campo]=campo==='valor'?Math.max(0,Number(valor)||0):valor;
  }
  calcularTotaisContracheque();
}

function htmlLinhaContracheque(tipo,item,i){
  const bloqueado=item.fixo?' readonly':'';
  const excluir=item.fixo?'<button class="iconbtn" type="button" disabled title="O salário-base é obrigatório">—</button>':'<button class="iconbtn del" type="button" onclick="removerLinhaContracheque(\''+tipo+'\','+i+')">✕</button>';
  if(tipo==='provento'){
    prepararProventoProporcional(item);
    const diasMes=diasNoMesContracheque();
    const integralBloqueado=item.auto_periculosidade?' readonly title="Calculado automaticamente em 30% do salário-base"':'';
    return '<div class="holerite-row proporcional"><div class="fld"><label>Descrição</label><input value="'+escapeHtml(item.descricao||'')+'"'+bloqueado+' oninput="alterarLinhaContracheque(\''+tipo+'\','+i+',\'descricao\',this.value)"></div><div class="fld"><label>Dias trabalhados</label><input id="hol_dias_'+tipo+'_'+i+'" type="number" min="1" max="'+diasMes+'" step="1" value="'+item.dias+'" oninput="alterarLinhaContracheque(\''+tipo+'\','+i+',\'dias\',this.value)"></div><div class="fld"><label>Valor integral (R$)</label><input type="number" min="0" step="0.01" value="'+(Number(item.valor_integral)||'')+'"'+integralBloqueado+' oninput="alterarLinhaContracheque(\''+tipo+'\','+i+',\'valor_integral\',this.value)"></div><div class="fld"><label>Memória de cálculo</label><div class="holerite-calculado" id="hol_calc_'+tipo+'_'+i+'">'+memoriaCalculoProventoHtml(item)+'</div></div><div>'+excluir+'</div></div>';
  }
  return '<div class="holerite-row"><div class="fld"><label>Descrição</label><input value="'+escapeHtml(item.descricao||'')+'" oninput="alterarLinhaContracheque(\''+tipo+'\','+i+',\'descricao\',this.value)"></div><div class="fld"><label>Referência</label><input value="'+escapeHtml(item.referencia||'')+'" oninput="alterarLinhaContracheque(\''+tipo+'\','+i+',\'referencia\',this.value)" placeholder="Ex.: INSS"></div><div class="fld"><label>Valor (R$)</label><input type="number" min="0" step="0.01" value="'+(Number(item.valor)||'')+'" oninput="alterarLinhaContracheque(\''+tipo+'\','+i+',\'valor\',this.value)"></div><div>'+excluir+'</div></div>';
}

function renderLinhasContracheque(){
  const p=document.getElementById('holProventos'),d=document.getElementById('holDescontos');if(!p||!d)return;
  p.innerHTML=contrachequeProventos.map((x,i)=>htmlLinhaContracheque('provento',x,i)).join('');
  d.innerHTML=contrachequeDescontos.map((x,i)=>htmlLinhaContracheque('desconto',x,i)).join('')||'<div style="color:var(--muted);font-size:12px;">Nenhum desconto informado.</div>';
  calcularTotaisContracheque();
}

function sincronizarSalarioBaseContracheque(){
  const valor=Math.max(0,Number(document.getElementById('hol_salario_base').value)||0);
  if(!contrachequeProventos.length) contrachequeProventos.push({descricao:'Salário-base',dias:diasNoMesContracheque(),valor_integral:valor,valor:valor,fixo:true});
  contrachequeProventos[0].valor_integral=valor;prepararProventoProporcional(contrachequeProventos[0]);atualizarPericulosidadeContracheque();renderLinhasContracheque();
}

function totaisContracheque(){
  const proventos=contrachequeProventos.reduce((s,x)=>s+(Number(x.valor)||0),0);
  const descontos=contrachequeDescontos.reduce((s,x)=>s+(Number(x.valor)||0),0);
  return {proventos,descontos,liquido:proventos-descontos};
}

function calcularTotaisContracheque(){
  const t=totaisContracheque();
  document.getElementById('holTotalProventos').textContent=brl(t.proventos);
  document.getElementById('holTotalDescontos').textContent=brl(t.descontos);
  document.getElementById('holValorLiquido').textContent=brl(t.liquido);
}

function dadosFormularioContracheque(){
  const t=totaisContracheque(),c=recibosConfig||{};
  return {
    competencia:document.getElementById('hol_competencia').value,
    data_pagamento:document.getElementById('hol_data_pagamento').value,
    funcionario_nome:document.getElementById('hol_funcionario').value.trim(),
    funcionario_cpf:document.getElementById('hol_cpf').value.trim(),
    cargo:document.getElementById('hol_cargo').value.trim(),
    data_admissao:document.getElementById('hol_admissao').value||null,
    salario_base:Number(document.getElementById('hol_salario_base').value)||0,
    proventos:contrachequeProventos.filter(x=>x.descricao&&Number(x.valor)>0).map(x=>({descricao:x.descricao,referencia:x.referencia||'',valor:Number(x.valor),valor_integral:Number(x.valor_integral)||Number(x.valor),dias:Number(x.dias)||diasNoMesContracheque(),dias_mes:Number(x.dias_mes)||diasNoMesContracheque(),auto_periculosidade:!!x.auto_periculosidade})),
    descontos:contrachequeDescontos.filter(x=>x.descricao&&Number(x.valor)>0).map(x=>({descricao:x.descricao,referencia:x.referencia||'',valor:Number(x.valor)})),
    total_proventos:t.proventos,total_descontos:t.descontos,valor_liquido:t.liquido,
    empresa_razao_social:c.empresa_razao_social||null,empresa_nome_fantasia:c.empresa_nome_fantasia||null,
    empresa_cnpj:c.empresa_cnpj||null,empresa_endereco:c.empresa_endereco||null
  };
}

function validarContracheque(d){
  if(!d.empresa_cnpj||!(d.empresa_razao_social||d.empresa_nome_fantasia)) return 'Configure os dados da empresa e o CNPJ desta loja.';
  if(!d.funcionario_nome||!d.funcionario_cpf||!d.cargo||!d.competencia||!d.data_pagamento) return 'Preencha funcionário, CPF, cargo, competência e data de pagamento.';
  if(!(d.salario_base>0)||!d.proventos.length) return 'Informe um salário-base maior que zero.';
  if(d.valor_liquido<0) return 'O total de descontos não pode ser maior que o total de proventos.';
  return '';
}

async function salvarContracheque(baixarPdf){
  const d=dadosFormularioContracheque(),erro=validarContracheque(d),el=document.getElementById('holErr');
  if(erro){el.textContent=erro;el.style.display='block';return;}el.style.display='none';
  const {data,error}=await sb.from('contracheques').insert(Object.assign({loja:lojaAtual},d)).select().single();
  if(error){el.textContent='Não foi possível salvar. Execute primeiro o SQL do módulo de contracheques.';el.style.display='block';console.error(error);return;}
  contrachequesCache.unshift(data);renderContracheques();if(baixarPdf)gerarPdfContracheque(data);limparFormularioContracheque();
}

function gerarPdfContrachequeFormulario(){
  const d=dadosFormularioContracheque(),erro=validarContracheque(d),el=document.getElementById('holErr');
  if(erro){el.textContent=erro;el.style.display='block';return;}el.style.display='none';gerarPdfContracheque(d);
}

function nomeCompetencia(valor){if(!valor)return '';const p=valor.split('-');return (NOMES_MES[Number(p[1])-1]||'')+' de '+p[0];}

function diasDaCompetenciaContracheque(valor){const p=String(valor||'').split('-').map(Number);return p[0]&&p[1]?new Date(p[0],p[1],0).getDate():30;}
function moedaPdf(valor){return 'R$ '+(Number(valor)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}

function gerarPdfContracheque(d){
  if(!window.jspdf||!window.jspdf.jsPDF){alert('Não foi possível carregar o recurso de PDF.');return;}
  const jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'mm',format:'a4'});
  const empresa=d.empresa_nome_fantasia||d.empresa_razao_social||'',diasMes=diasDaCompetenciaContracheque(d.competencia);
  doc.setDrawColor(35,55,84);doc.setLineWidth(.45);doc.rect(12,8,186,135);
  doc.setFillColor(23,35,60);doc.rect(12,8,186,14,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('DEMONSTRATIVO DE PAGAMENTO',105,17,{align:'center'});
  doc.setTextColor(28,40,58);doc.setFontSize(9.5);doc.text(empresa,18,28);doc.setFont('helvetica','normal');doc.setFontSize(6.8);
  doc.text('Razão social: '+(d.empresa_razao_social||'—'),18,33);doc.text('CNPJ: '+(d.empresa_cnpj||'—'),112,33);doc.text(doc.splitTextToSize('Endereço: '+(d.empresa_endereco||'—'),174),18,37);
  doc.setDrawColor(205,214,225);doc.line(18,42,192,42);doc.setFontSize(7.2);
  doc.setFont('helvetica','bold');doc.text('Funcionário:',18,47);doc.setFont('helvetica','normal');doc.text(doc.splitTextToSize(d.funcionario_nome,67)[0],38,47);
  doc.setFont('helvetica','bold');doc.text('Competência:',112,47);doc.setFont('helvetica','normal');doc.text(nomeCompetencia(d.competencia),134,47);
  doc.setFont('helvetica','bold');doc.text('CPF:',18,52);doc.setFont('helvetica','normal');doc.text(d.funcionario_cpf,28,52);
  doc.setFont('helvetica','bold');doc.text('Pagamento:',112,52);doc.setFont('helvetica','normal');doc.text(fmtData(d.data_pagamento),132,52);
  doc.setFont('helvetica','bold');doc.text('Cargo:',18,57);doc.setFont('helvetica','normal');doc.text(doc.splitTextToSize(d.cargo,67)[0],31,57);
  if(d.data_admissao){doc.setFont('helvetica','bold');doc.text('Admissão:',112,57);doc.setFont('helvetica','normal');doc.text(fmtData(d.data_admissao),129,57);}
  doc.setFont('helvetica','bold');doc.text('Salário contratual:',18,62);doc.setFont('helvetica','normal');doc.text(moedaPdf(d.salario_base),50,62);
  const linhas=[];
  (d.proventos||[]).forEach(x=>{const integral=Number(x.valor_integral)||Number(x.valor)||0,dias=Number(x.dias)||diasMes,baseDias=Number(x.dias_mes)||diasMes;linhas.push([x.descricao,moedaPdf(integral),dias+'/'+baseDias,moedaPdf(integral)+' / '+baseDias+' x '+dias,moedaPdf(x.valor),'']);});
  (d.descontos||[]).forEach(x=>linhas.push([x.descricao,'',x.referencia||'—','Valor informado manualmente','',moedaPdf(x.valor)]));
  doc.autoTable({startY:66,margin:{left:18,right:18},head:[['Descrição','Valor integral','Dias','Cálculo / referência','Proventos','Descontos']],body:linhas,theme:'grid',styles:{fontSize:6.3,cellPadding:1.25,valign:'middle'},headStyles:{fillColor:[35,55,84],fontSize:6.1},columnStyles:{0:{cellWidth:31},1:{cellWidth:25,halign:'right'},2:{cellWidth:17,halign:'center'},3:{cellWidth:51},4:{cellWidth:25,halign:'right'},5:{cellWidth:25,halign:'right'}}});
  let y=doc.lastAutoTable.finalY+4;doc.setFontSize(7);doc.setFont('helvetica','bold');doc.setTextColor(28,40,58);doc.text('Total de proventos',157,y,{align:'right'});doc.text(moedaPdf(d.total_proventos),190,y,{align:'right'});y+=4;doc.text('Total de descontos',157,y,{align:'right'});doc.text(moedaPdf(d.total_descontos),190,y,{align:'right'});y+=5;
  doc.setFillColor(232,246,237);doc.rect(111,y-3.5,81,8,'F');doc.setTextColor(24,95,56);doc.setFontSize(8.5);doc.text('VALOR LÍQUIDO',116,y+1.5);doc.text(moedaPdf(d.valor_liquido),188,y+1.5,{align:'right'});y+=7;
  doc.setTextColor(55,67,82);doc.setFontSize(6.5);doc.setFont('helvetica','normal');const extenso=doc.splitTextToSize('Valor líquido por extenso: '+valorPorExtenso(d.valor_liquido)+'.',174);doc.text(extenso,18,y);
  doc.setDrawColor(80,95,115);doc.line(60,128,150,128);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text(d.funcionario_nome,105,132,{align:'center'});doc.setFont('helvetica','normal');doc.text('CPF: '+d.funcionario_cpf,105,136,{align:'center'});
  doc.setTextColor(125,92,28);doc.setFontSize(5.8);doc.text('Documento para controle interno. Não substitui o holerite oficial emitido pela contabilidade.',105,141,{align:'center'});
  doc.save('contracheque-'+d.competencia+'-'+d.funcionario_nome.replace(/[^a-zA-Z0-9À-ÿ]+/g,'-')+'.pdf');
}

async function carregarContracheques(){
  const filtro=document.getElementById('holFiltroMes');if(!filtro)return;
  let q=sb.from('contracheques').select('*').eq('loja',lojaAtual);if(filtro.value)q=q.eq('competencia',filtro.value);
  const {data,error}=await q.order('competencia',{ascending:false}).order('id',{ascending:false});
  if(error){console.error('Erro ao carregar contracheques:',error);contrachequesCache=[];}else contrachequesCache=data||[];renderContracheques();
}

function renderContracheques(){
  const busca=(document.getElementById('holBusca').value||'').toLowerCase().trim();
  const lista=contrachequesCache.filter(x=>!busca||String(x.funcionario_nome||'').toLowerCase().includes(busca)||String(x.funcionario_cpf||'').toLowerCase().includes(busca)||String(x.cargo||'').toLowerCase().includes(busca));
  document.getElementById('holEmpty').style.display=lista.length?'none':'block';
  document.getElementById('holBody').innerHTML=lista.map(x=>'<tr><td>#'+x.id+'</td><td>'+escapeHtml(nomeCompetencia(x.competencia))+'</td><td>'+escapeHtml(x.funcionario_nome)+'</td><td>'+escapeHtml(x.cargo)+'</td><td class="valor">'+brl(x.valor_liquido)+'</td><td><div class="rowactions"><button class="iconbtn" onclick="baixarPdfContrachequeHistorico('+x.id+')">PDF</button><button class="iconbtn edit" title="Duplicar" onclick="duplicarContracheque('+x.id+')">⧉</button><button class="iconbtn del" title="Excluir" onclick="excluirContracheque('+x.id+')">✕</button></div></td></tr>').join('');
}

function baixarPdfContrachequeHistorico(id){const x=contrachequesCache.find(v=>Number(v.id)===Number(id));if(x)gerarPdfContracheque(x);}
function duplicarContracheque(id){
  const x=contrachequesCache.find(v=>Number(v.id)===Number(id));if(!x)return;
  document.getElementById('hol_funcionario').value=x.funcionario_nome||'';document.getElementById('hol_cpf').value=x.funcionario_cpf||'';document.getElementById('hol_cargo').value=x.cargo||'';document.getElementById('hol_competencia').value=competenciaAtual();document.getElementById('hol_data_pagamento').value=todayStr();document.getElementById('hol_admissao').value=x.data_admissao||'';document.getElementById('hol_salario_base').value=x.salario_base||'';
  contrachequeProventos=(x.proventos||[]).map((v,i)=>Object.assign({},v,{fixo:i===0}));contrachequeProventos.forEach(prepararProventoProporcional);contrachequeDescontos=(x.descontos||[]).map(v=>Object.assign({},v,{fixo:false}));document.getElementById('hol_periculosidade').checked=indicePericulosidadeContracheque()>=0;renderLinhasContracheque();window.scrollTo({top:0,behavior:'smooth'});
}
async function excluirContracheque(id){if(!confirm('Excluir este contracheque do histórico?'))return;const {error}=await sb.from('contracheques').delete().eq('id',id).eq('loja',lojaAtual);if(error){alert('Não foi possível excluir o contracheque.');return;}contrachequesCache=contrachequesCache.filter(x=>Number(x.id)!==Number(id));renderContracheques();}
function limparFormularioContracheque(){['hol_funcionario','hol_cpf','hol_cargo','hol_admissao','hol_salario_base'].forEach(id=>document.getElementById(id).value='');document.getElementById('hol_competencia').value=competenciaAtual();document.getElementById('hol_data_pagamento').value=todayStr();document.getElementById('hol_periculosidade').checked=false;contrachequeProventos=[{descricao:'Salário-base',dias:diasNoMesContracheque(),valor_integral:0,valor:0,fixo:true}];contrachequeDescontos=[];document.getElementById('holErr').style.display='none';renderLinhasContracheque();}
function limparFiltroContracheques(){document.getElementById('holFiltroMes').value='';document.getElementById('holBusca').value='';carregarContracheques();}

/* ================= CONTROLE DE ESTOQUE ================= */

let controleEstoqueMesAtual = '';
let controleEstoqueAtual = null;
let controleEstoqueAnterior = null;
let controleEstoqueTabelaDisponivel = true;

function mesLocalAtual(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

function mesAnteriorControleEstoque(mes){
  const [ano, numeroMes] = mes.split('-').map(Number);
  const d = new Date(ano, numeroMes-2, 1);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

function rotuloMesControleEstoque(mes){
  if(!mes) return '—';
  const [ano, numeroMes] = mes.split('-');
  return NOMES_MES[Number(numeroMes)-1] + ' de ' + ano;
}

function intervaloMesControleEstoque(mes){
  const [ano, numeroMes] = mes.split('-').map(Number);
  const ultimoDia = new Date(ano, numeroMes, 0).getDate();
  return { de:mes+'-01', ate:mes+'-'+String(ultimoDia).padStart(2,'0') };
}

function valorHibrido(automatico, manual){
  return manual===null || manual===undefined ? Number(automatico||0) : Number(manual||0);
}

async function buscarDadosControleEstoqueMes(mes){
  const ajusteRes = await sb.from('controle_estoque_mensal').select('*').eq('loja',lojaAtual).eq('mes',mes).maybeSingle();
  let ajuste = ajusteRes.data || null;
  if(ajusteRes.error){
    controleEstoqueTabelaDisponivel = false;
    throw ajusteRes.error;
  }
  const valores = {
    estoqueInicial: Number(ajuste?.estoque_inicial_manual||0),
    compras: Number(ajuste?.compras_manual||0),
    bonificacoes: Number(ajuste?.bonificacoes_manual||0),
    estoqueFinal: Number(ajuste?.estoque_final_manual||0),
    receita: Number(ajuste?.receita_manual||0)
  };
  const dados = { mes, valores, ajuste, estoqueInicialHerdado:false };
  recalcularDerivadosControleEstoque(dados);
  return dados;
}

function recalcularDerivadosControleEstoque(dados){
  dados.valores.cmv = dados.valores.estoqueInicial + dados.valores.compras - dados.valores.bonificacoes - dados.valores.estoqueFinal;
  dados.valores.lucro = dados.valores.receita - dados.valores.cmv;
  dados.valores.margem = dados.valores.receita > 0 ? dados.valores.lucro / dados.valores.receita * 100 : 0;
}

function herdarEstoqueInicialControleEstoque(dados, mesAnterior){
  const finalAnteriorInformado = mesAnterior?.ajuste?.estoque_final_manual;
  if(finalAnteriorInformado!==null && finalAnteriorInformado!==undefined){
    dados.valores.estoqueInicial = Number(mesAnterior.valores.estoqueFinal||0);
    dados.estoqueInicialHerdado = true;
  }else{
    dados.estoqueInicialHerdado = false;
  }
  recalcularDerivadosControleEstoque(dados);
}

function fonteControleEstoque(chave){
  if(chave==='estoqueInicial' && controleEstoqueAtual?.estoqueInicialHerdado) return 'herdado';
  if(chave==='cmv') return 'calculado';
  const mapa = {estoqueInicial:'estoque_inicial_manual',compras:'compras_manual',bonificacoes:'bonificacoes_manual',estoqueFinal:'estoque_final_manual',receita:'receita_manual'};
  const campo = mapa[chave];
  return campo && controleEstoqueAtual?.ajuste?.[campo]!==null && controleEstoqueAtual?.ajuste?.[campo]!==undefined ? 'manual' : 'pendente';
}

function variacaoControleEstoque(atual, anterior){
  atual = Number(atual||0); anterior = Number(anterior||0);
  if(anterior===0) return atual===0 ? 'Sem alteração' : 'Sem base anterior';
  const variacao = (atual-anterior)/Math.abs(anterior)*100;
  const sinal = variacao>0 ? '+' : '';
  return sinal + variacao.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + '% vs. mês anterior';
}

function cardControleEstoque(titulo, chave, icone, cor, formato, detalhe){
  const valor = controleEstoqueAtual.valores[chave];
  const anterior = controleEstoqueAnterior?.valores?.[chave] || 0;
  const variacao = variacaoControleEstoque(valor, anterior);
  const classeVariacao = valor>anterior ? 'positive' : (valor<anterior ? 'negative' : '');
  const fonte = ['cmv','lucro','margem'].includes(chave) ? 'calculado' : fonteControleEstoque(chave);
  const valorTexto = formato==='percentual' ? Number(valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%' : brl(valor);
  return `<div class="ce-card" style="--ce-accent:${cor}">
    <div class="ce-card-top"><span class="ce-card-title">${titulo}</span><span class="ce-card-icon">${icone}</span></div>
    <div class="ce-card-value">${valorTexto}</div>
    <div class="ce-card-detail"><span class="ce-variation ${classeVariacao}">${detalhe || variacao}</span><span class="ce-source ${fonte==='manual'?'manual':(fonte==='pendente'?'pendente':(fonte==='herdado'?'herdado':''))}">${fonte}</span></div>
  </div>`;
}

function renderControleEstoque(){
  if(!controleEstoqueAtual) return;
  document.getElementById('controleEstoqueLoja').textContent = NOMES_LOJA[lojaAtual] || lojaAtual;
  document.getElementById('controleEstoquePeriodo').textContent = rotuloMesControleEstoque(controleEstoqueMesAtual);
  document.getElementById('controleEstoqueAtualizado').textContent = 'Atualizado em ' + new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  const inicialDetalhe = controleEstoqueAtual.estoqueInicialHerdado ? 'Estoque final de '+rotuloMesControleEstoque(controleEstoqueAnterior.mes) : (fonteControleEstoque('estoqueInicial')==='manual' ? variacaoControleEstoque(controleEstoqueAtual.valores.estoqueInicial,controleEstoqueAnterior?.valores?.estoqueInicial) : 'Informe o valor do mês');
  const finalDetalhe = fonteControleEstoque('estoqueFinal')==='manual' ? variacaoControleEstoque(controleEstoqueAtual.valores.estoqueFinal,controleEstoqueAnterior?.valores?.estoqueFinal) : 'Informe o valor do mês';
  document.getElementById('controleEstoqueCards').innerHTML =
    cardControleEstoque('Estoque inicial','estoqueInicial','📦','#2563eb','moeda',inicialDetalhe) +
    cardControleEstoque('Compras totais','compras','🛒','#7c3aed','moeda') +
    cardControleEstoque('Bonificações','bonificacoes','🎁','#d97706','moeda') +
    cardControleEstoque('Estoque final','estoqueFinal','🏷️','#0891b2','moeda',finalDetalhe) +
    cardControleEstoque('CMV','cmv','📉','#dc2626','moeda') +
    cardControleEstoque('Receita total','receita','💰','#059669','moeda') +
    cardControleEstoque('Lucro bruto','lucro','📈','#16a34a','moeda') +
    cardControleEstoque('Margem de lucro','margem','％','#4f46e5','percentual');
}

async function abrirControleEstoque(){
  const input = document.getElementById('controleEstoqueMes');
  controleEstoqueMesAtual = input.value || controleEstoqueMesAtual || mesLocalAtual();
  input.value = controleEstoqueMesAtual;
  await carregarControleEstoque();
}

async function mudarMesControleEstoque(mes){
  if(!mes) return;
  controleEstoqueMesAtual = mes;
  await carregarControleEstoque();
}

async function carregarControleEstoque(){
  if(!controleEstoqueMesAtual) controleEstoqueMesAtual = mesLocalAtual();
  document.getElementById('loadingScreen').style.display = 'flex';
  controleEstoqueTabelaDisponivel = true;
  try{
    const mesAnterior = mesAnteriorControleEstoque(controleEstoqueMesAtual);
    const mesRetrasado = mesAnteriorControleEstoque(mesAnterior);
    let controleEstoqueRetrasado;
    [controleEstoqueAtual, controleEstoqueAnterior, controleEstoqueRetrasado] = await Promise.all([
      buscarDadosControleEstoqueMes(controleEstoqueMesAtual),
      buscarDadosControleEstoqueMes(mesAnterior),
      buscarDadosControleEstoqueMes(mesRetrasado)
    ]);
    herdarEstoqueInicialControleEstoque(controleEstoqueAnterior, controleEstoqueRetrasado);
    herdarEstoqueInicialControleEstoque(controleEstoqueAtual, controleEstoqueAnterior);
    renderControleEstoque();
  }catch(error){
    console.error('Erro ao carregar controle de estoque:',error);
    alert('Não foi possível carregar o Controle de Estoque. Detalhes: ' + (error?.message || 'verifique sua conexão e os dados do período.'));
  }finally{
    document.getElementById('loadingScreen').style.display = 'none';
  }
}

function abrirAjustesControleEstoque(){
  if(!controleEstoqueAtual) return;
  if(!controleEstoqueTabelaDisponivel){
    alert('Execute primeiro o arquivo SQL do módulo no Supabase para liberar os ajustes manuais.');
    return;
  }
  const a = controleEstoqueAtual.ajuste || {};
  const preencher = (id,valor)=>document.getElementById(id).value = valor===null || valor===undefined ? '' : valor;
  const campoInicial = document.getElementById('ce_estoque_inicial');
  const labelInicial = document.getElementById('ceEstoqueInicialLabel');
  if(controleEstoqueAtual.estoqueInicialHerdado){
    campoInicial.value = controleEstoqueAtual.valores.estoqueInicial;
    campoInicial.readOnly = true;
    labelInicial.textContent = 'Estoque inicial — vindo do mês anterior';
  }else{
    preencher('ce_estoque_inicial',a.estoque_inicial_manual);
    campoInicial.readOnly = false;
    labelInicial.textContent = 'Estoque inicial (R$)';
  }
  preencher('ce_compras',a.compras_manual);
  preencher('ce_bonificacoes',a.bonificacoes_manual);
  preencher('ce_estoque_final',a.estoque_final_manual);
  preencher('ce_receita',a.receita_manual);
  const inicial = Number(campoInicial.value||0), compras = Number(a.compras_manual||0), bonificacoes = Number(a.bonificacoes_manual||0), final = Number(a.estoque_final_manual||0);
  document.getElementById('ce_cmv_calculado').value = brl(inicial + compras - bonificacoes - final);
  document.getElementById('controleEstoqueModalPeriodo').textContent = (NOMES_LOJA[lojaAtual]||'')+' — '+rotuloMesControleEstoque(controleEstoqueMesAtual);
  document.getElementById('controleEstoqueErr').style.display = 'none';
  document.getElementById('controleEstoqueModal').style.display = 'flex';
}

function fecharAjustesControleEstoque(){ document.getElementById('controleEstoqueModal').style.display = 'none'; }

function numeroManualControleEstoque(id){
  const valor = document.getElementById(id).value;
  return valor==='' ? null : Number(valor);
}

function recalcularCmvFormularioControle(){
  const inicial = Number(document.getElementById('ce_estoque_inicial').value||0);
  const compras = Number(document.getElementById('ce_compras').value||0);
  const bonificacoes = Number(document.getElementById('ce_bonificacoes').value||0);
  const final = Number(document.getElementById('ce_estoque_final').value||0);
  document.getElementById('ce_cmv_calculado').value = brl(inicial + compras - bonificacoes - final);
}

async function salvarAjustesControleEstoque(){
  const payload = {
    loja:lojaAtual, mes:controleEstoqueMesAtual,
    estoque_inicial_manual:controleEstoqueAtual.estoqueInicialHerdado ? null : numeroManualControleEstoque('ce_estoque_inicial'),
    compras_manual:numeroManualControleEstoque('ce_compras'),
    bonificacoes_manual:numeroManualControleEstoque('ce_bonificacoes'),
    estoque_final_manual:numeroManualControleEstoque('ce_estoque_final'),
    cmv_manual:null,
    receita_manual:numeroManualControleEstoque('ce_receita')
  };
  if(Object.values(payload).some(v=>typeof v==='number' && (!Number.isFinite(v) || v<0))){
    const err = document.getElementById('controleEstoqueErr'); err.textContent='Informe apenas valores válidos e positivos.'; err.style.display='block'; return;
  }
  const btn = document.getElementById('controleEstoqueSalvarBtn'); btn.disabled=true; btn.textContent='Salvando…';
  const {error} = await sb.from('controle_estoque_mensal').upsert(payload,{onConflict:'loja,mes'});
  btn.disabled=false; btn.textContent='Salvar';
  if(error){ console.error(error); const err=document.getElementById('controleEstoqueErr'); err.textContent='Não foi possível salvar. Confirme se executou o SQL do módulo.'; err.style.display='block'; return; }
  fecharAjustesControleEstoque();
  await carregarControleEstoque();
}

async function limparValoresControleEstoque(){
  if(!confirm('Apagar todos os valores informados neste mês?')) return;
  const {error}=await sb.from('controle_estoque_mensal').delete().eq('loja',lojaAtual).eq('mes',controleEstoqueMesAtual);
  if(error){ alert('Não foi possível limpar os valores deste mês.'); return; }
  fecharAjustesControleEstoque();
  await carregarControleEstoque();
}

function linhasExportacaoControleEstoque(){
  const a=controleEstoqueAtual.valores, p=controleEstoqueAnterior?.valores||{};
  return [
    ['Estoque inicial',a.estoqueInicial,p.estoqueInicial,fonteControleEstoque('estoqueInicial')],
    ['Compras totais',a.compras,p.compras,fonteControleEstoque('compras')],
    ['Bonificações',a.bonificacoes,p.bonificacoes,fonteControleEstoque('bonificacoes')],
    ['Estoque final',a.estoqueFinal,p.estoqueFinal,fonteControleEstoque('estoqueFinal')],
    ['CMV',a.cmv,p.cmv,'calculado'],
    ['Receita total',a.receita,p.receita,fonteControleEstoque('receita')],
    ['Lucro bruto',a.lucro,p.lucro,'calculado'],
    ['Margem de lucro (%)',a.margem,p.margem,'calculado']
  ];
}

function exportarExcelControleEstoque(){
  if(!controleEstoqueAtual) return;
  const dados=[['Ranchão Bebidas — Controle de Estoque'],['Loja',NOMES_LOJA[lojaAtual]],['Período',rotuloMesControleEstoque(controleEstoqueMesAtual)],[],['Indicador','Mês atual','Mês anterior','Origem'],...linhasExportacaoControleEstoque()];
  const ws=XLSX.utils.aoa_to_sheet(dados); ws['!cols']=[{wch:24},{wch:18},{wch:18},{wch:14}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Resumo do Período');
  XLSX.writeFile(wb,`controle-estoque-${lojaAtual}-${controleEstoqueMesAtual}.xlsx`);
}

function exportarPdfControleEstoque(){
  if(!controleEstoqueAtual) return;
  const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  doc.setFillColor(23,35,60); doc.rect(0,0,297,35,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(19); doc.text('Ranchão Bebidas — Resumo do Período',14,15);
  doc.setFontSize(10); doc.text(`${NOMES_LOJA[lojaAtual]}  •  ${rotuloMesControleEstoque(controleEstoqueMesAtual)}`,14,24);
  doc.autoTable({startY:44,head:[['Indicador','Mês atual','Mês anterior','Variação','Origem']],body:linhasExportacaoControleEstoque().map((l,i)=>{
    const percentual=i===7; const atual=percentual?Number(l[1]).toLocaleString('pt-BR',{minimumFractionDigits:2})+'%':brl(l[1]);
    const anterior=percentual?Number(l[2]||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'%':brl(l[2]||0);
    return [l[0],atual,anterior,variacaoControleEstoque(l[1],l[2]),l[3]];
  }),theme:'grid',headStyles:{fillColor:[37,99,235]},styles:{fontSize:10,cellPadding:4},columnStyles:{1:{halign:'right'},2:{halign:'right'}}});
  doc.setTextColor(90,105,125); doc.setFontSize(8); doc.text('Valores informados manualmente no Controle de Estoque.',14,doc.internal.pageSize.height-9);
  doc.save(`controle-estoque-${lojaAtual}-${controleEstoqueMesAtual}.pdf`);
}

/* ================= ORÇAMENTOS ================= */

let orcamentosCache = [];
let orcamentoItens = [];
let orcamentoEditandoId = null;
let orcamentoEditandoLojaOriginal = null;
let orcamentoConfigEmpresa = null;

function dataMaisDias(dias){const d=new Date(todayStr()+'T12:00:00');d.setDate(d.getDate()+dias);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

async function abrirOrcamentos(){
  if(!document.getElementById('orc_data').value) novoOrcamento();
  const {data}=await sb.from('recibos_configuracoes').select('empresa_razao_social,empresa_nome_fantasia,empresa_cnpj,empresa_endereco,cidade,estado').eq('loja',lojaAtual).maybeSingle();
  orcamentoConfigEmpresa=data||null;
  await carregarOrcamentos();
}

function novoOrcamento(){
  orcamentoEditandoId=null;orcamentoEditandoLojaOriginal=null;orcamentoItens=[{produto:'',quantidade:1,valor_unitario:0}];
  document.getElementById('orc_loja').value=lojaAtual;
  ['orc_cliente_nome','orc_cliente_telefone','orc_cliente_documento','orc_pagamento'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('orc_data').value=todayStr();document.getElementById('orc_validade').value=dataMaisDias(7);
  document.getElementById('orc_desconto').value='0';document.getElementById('orc_entrega').value='0';document.getElementById('orc_status').value='aberto';
  document.getElementById('orc_observacoes').value='Valores válidos até a data indicada. Orçamento sujeito à disponibilidade dos produtos.';
  document.getElementById('orcFormTitulo').textContent='Novo orçamento';document.getElementById('orcNumeroPrevia').textContent='';document.getElementById('orcErr').style.display='none';renderItensOrcamento();
}

function adicionarItemOrcamento(item){orcamentoItens.push(item||{produto:'',quantidade:1,valor_unitario:0});renderItensOrcamento();}
function removerItemOrcamento(i){if(orcamentoItens.length===1){orcamentoItens[0]={produto:'',quantidade:1,valor_unitario:0};}else orcamentoItens.splice(i,1);renderItensOrcamento();}
function alterarItemOrcamento(i,campo,valor){if(!orcamentoItens[i])return;orcamentoItens[i][campo]=campo==='produto'?valor:Math.max(0,Number(valor)||0);calcularOrcamento();}

function renderItensOrcamento(){
  const el=document.getElementById('orcItens');if(!el)return;
  el.innerHTML=orcamentoItens.map((x,i)=>'<div class="orc-item-row"><div class="fld"><label>Produto / descrição</label><input value="'+escapeHtml(x.produto||'')+'" placeholder="Ex.: Cerveja lata 350 ml" oninput="alterarItemOrcamento('+i+',\'produto\',this.value)"></div><div class="fld"><label>Quantidade</label><input type="number" min="0.001" step="0.001" value="'+(Number(x.quantidade)||'')+'" oninput="alterarItemOrcamento('+i+',\'quantidade\',this.value)"></div><div class="fld"><label>Valor unitário</label><input type="number" min="0" step="0.01" value="'+(Number(x.valor_unitario)||'')+'" oninput="alterarItemOrcamento('+i+',\'valor_unitario\',this.value)"></div><div><label style="display:block;font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Total</label><div class="orc-total-item" id="orcItemTotal'+i+'">'+brl((Number(x.quantidade)||0)*(Number(x.valor_unitario)||0))+'</div></div><button class="iconbtn del" type="button" onclick="removerItemOrcamento('+i+')">✕</button></div>').join('');
  calcularOrcamento();
}

function totaisOrcamento(){
  const subtotal=orcamentoItens.reduce((s,x)=>s+(Number(x.quantidade)||0)*(Number(x.valor_unitario)||0),0),desconto=Math.max(0,Number(document.getElementById('orc_desconto').value)||0),entrega=Math.max(0,Number(document.getElementById('orc_entrega').value)||0);
  return {subtotal,desconto,entrega,total:Math.max(0,subtotal-desconto+entrega)};
}
function calcularOrcamento(){
  orcamentoItens.forEach((x,i)=>{const el=document.getElementById('orcItemTotal'+i);if(el)el.textContent=brl((Number(x.quantidade)||0)*(Number(x.valor_unitario)||0));});
  const t=totaisOrcamento();document.getElementById('orcQtdItens').textContent=orcamentoItens.filter(x=>x.produto&&Number(x.quantidade)>0).length;document.getElementById('orcSubtotal').textContent=brl(t.subtotal);document.getElementById('orcAjustes').textContent='-'+brl(t.desconto)+' / +'+brl(t.entrega);document.getElementById('orcTotal').textContent=brl(t.total);
}

function dadosFormularioOrcamento(){
  const t=totaisOrcamento(),c=orcamentoConfigEmpresa||{};
  return {data_emissao:document.getElementById('orc_data').value,data_validade:document.getElementById('orc_validade').value,cliente_nome:document.getElementById('orc_cliente_nome').value.trim()||null,cliente_telefone:document.getElementById('orc_cliente_telefone').value.trim()||null,cliente_documento:document.getElementById('orc_cliente_documento').value.trim()||null,forma_pagamento:document.getElementById('orc_pagamento').value.trim()||null,observacoes:document.getElementById('orc_observacoes').value.trim()||null,status:document.getElementById('orc_status').value,itens:orcamentoItens.filter(x=>x.produto&&Number(x.quantidade)>0&&Number(x.valor_unitario)>=0).map(x=>({produto:x.produto.trim(),quantidade:Number(x.quantidade),valor_unitario:Number(x.valor_unitario),total:Number(x.quantidade)*Number(x.valor_unitario)})),subtotal:t.subtotal,desconto:t.desconto,valor_entrega:t.entrega,total:t.total,empresa_razao_social:c.empresa_razao_social||null,empresa_nome_fantasia:c.empresa_nome_fantasia||'Ranchão Bebidas',empresa_cnpj:c.empresa_cnpj||null,empresa_endereco:c.empresa_endereco||null};
}

function validarOrcamento(d){if(!d.data_emissao||!d.data_validade)return 'Preencha a data de emissão e a validade.';if(d.data_validade<d.data_emissao)return 'A validade não pode ser anterior à emissão.';if(!d.itens.length)return 'Adicione pelo menos um produto com quantidade e valor.';if(!(d.total>0))return 'O total do orçamento deve ser maior que zero.';return '';}

async function salvarOrcamento(gerarPdf){
  const d=dadosFormularioOrcamento(),erro=validarOrcamento(d),el=document.getElementById('orcErr'),lojaDestino=document.getElementById('orc_loja').value;if(erro){el.textContent=erro;el.style.display='block';return;}el.style.display='none';
  const {data:configDestino}=await sb.from('recibos_configuracoes').select('empresa_razao_social,empresa_nome_fantasia,empresa_cnpj,empresa_endereco,cidade,estado').eq('loja',lojaDestino).maybeSingle();
  if(configDestino){d.empresa_razao_social=configDestino.empresa_razao_social||null;d.empresa_nome_fantasia=configDestino.empresa_nome_fantasia||'Ranchão Bebidas';d.empresa_cnpj=configDestino.empresa_cnpj||null;d.empresa_endereco=configDestino.empresa_endereco||null;}
  let resposta;if(orcamentoEditandoId)resposta=await sb.from('orcamentos').update(Object.assign({loja:lojaDestino},d)).eq('id',orcamentoEditandoId).eq('loja',orcamentoEditandoLojaOriginal||lojaAtual).select().single();else resposta=await sb.from('orcamentos').insert(Object.assign({loja:lojaDestino},d)).select().single();
  if(resposta.error){el.textContent='Não foi possível salvar. Execute primeiro o SQL do módulo de orçamentos.';el.style.display='block';console.error(resposta.error);return;}
  if(gerarPdf)gerarPdfOrcamento(resposta.data);if(lojaDestino!==lojaAtual){trocarLoja(lojaDestino);alert('Orçamento transferido para a '+(lojaDestino==='loja2'?'Loja 02':'Loja 01')+' com sucesso.');return;}await carregarOrcamentos();novoOrcamento();
}

async function carregarOrcamentos(){
  let q=sb.from('orcamentos').select('*').eq('loja',lojaAtual);const mes=document.getElementById('orcFiltroMes').value;if(mes){const p=mes.split('-'),ultimo=new Date(Number(p[0]),Number(p[1]),0).getDate();q=q.gte('data_emissao',mes+'-01').lte('data_emissao',mes+'-'+String(ultimo).padStart(2,'0'));}
  const {data,error}=await q.order('data_emissao',{ascending:false}).order('id',{ascending:false});orcamentosCache=error?[]:(data||[]);if(error)console.error('Erro ao carregar orçamentos:',error);renderOrcamentos();
}
function statusEfetivoOrcamento(x){return x.status==='aberto'&&x.data_validade<todayStr()?'vencido':x.status;}
function rotuloStatusOrcamento(s){return ({aberto:'Em aberto',aprovado:'Aprovado',recusado:'Recusado',vencido:'Vencido'})[s]||s;}
function numeroOrcamento(x){return String(x.id||0).padStart(6,'0');}
function renderOrcamentos(){
  const busca=(document.getElementById('orcBusca').value||'').toLowerCase().trim(),filtro=document.getElementById('orcFiltroStatus').value;
  const lista=orcamentosCache.filter(x=>{const s=statusEfetivoOrcamento(x);return (filtro==='todos'||s===filtro)&&(!busca||String(x.cliente_nome||'').toLowerCase().includes(busca)||String(x.cliente_telefone||'').toLowerCase().includes(busca)||numeroOrcamento(x).includes(busca));});
  document.getElementById('orcEmpty').style.display=lista.length?'none':'block';document.getElementById('orcBody').innerHTML=lista.map(x=>{const s=statusEfetivoOrcamento(x);return '<tr><td>#'+numeroOrcamento(x)+'</td><td>'+fmtData(x.data_emissao)+'</td><td>'+(escapeHtml(x.cliente_nome)||'<span style="color:var(--muted);">Não informado</span>')+'</td><td>'+fmtData(x.data_validade)+'</td><td><span class="status '+(s==='aprovado'?'pago':s==='recusado'||s==='vencido'?'vencido':'pendente')+'">'+rotuloStatusOrcamento(s)+'</span></td><td class="valor">'+brl(x.total)+'</td><td><div class="rowactions"><button class="iconbtn" title="PDF" onclick="baixarPdfOrcamento('+x.id+')">PDF</button><button class="iconbtn" title="Compartilhar" onclick="compartilharOrcamento('+x.id+')">↗</button><button class="iconbtn edit" title="Editar" onclick="editarOrcamento('+x.id+')">✎</button><button class="iconbtn edit" title="Duplicar" onclick="duplicarOrcamento('+x.id+')">⧉</button><button class="iconbtn del" title="Excluir" onclick="excluirOrcamento('+x.id+')">✕</button></div></td></tr>';}).join('');
}

function preencherOrcamento(x,duplicar){
  orcamentoEditandoId=duplicar?null:x.id;orcamentoEditandoLojaOriginal=duplicar?null:(x.loja||lojaAtual);document.getElementById('orc_loja').value=duplicar?lojaAtual:(x.loja||lojaAtual);document.getElementById('orc_cliente_nome').value=x.cliente_nome||'';document.getElementById('orc_cliente_telefone').value=x.cliente_telefone||'';document.getElementById('orc_cliente_documento').value=x.cliente_documento||'';document.getElementById('orc_data').value=duplicar?todayStr():x.data_emissao;document.getElementById('orc_validade').value=duplicar?dataMaisDias(7):x.data_validade;document.getElementById('orc_pagamento').value=x.forma_pagamento||'';document.getElementById('orc_desconto').value=x.desconto||0;document.getElementById('orc_entrega').value=x.valor_entrega||0;document.getElementById('orc_status').value=duplicar?'aberto':x.status;document.getElementById('orc_observacoes').value=x.observacoes||'';orcamentoItens=(x.itens||[]).map(i=>({produto:i.produto,quantidade:Number(i.quantidade),valor_unitario:Number(i.valor_unitario)}));if(!orcamentoItens.length)orcamentoItens=[{produto:'',quantidade:1,valor_unitario:0}];document.getElementById('orcFormTitulo').textContent=duplicar?'Novo orçamento duplicado':'Editar orçamento';document.getElementById('orcNumeroPrevia').textContent=duplicar?'':'#'+numeroOrcamento(x);renderItensOrcamento();window.scrollTo({top:0,behavior:'smooth'});
}
function editarOrcamento(id){const x=orcamentosCache.find(v=>Number(v.id)===Number(id));if(x)preencherOrcamento(x,false);}
function duplicarOrcamento(id){const x=orcamentosCache.find(v=>Number(v.id)===Number(id));if(x)preencherOrcamento(x,true);}
async function excluirOrcamento(id){if(!confirm('Excluir este orçamento?'))return;const {error}=await sb.from('orcamentos').delete().eq('id',id).eq('loja',lojaAtual);if(error){alert('Não foi possível excluir o orçamento.');return;}orcamentosCache=orcamentosCache.filter(x=>Number(x.id)!==Number(id));renderOrcamentos();}
function limparFiltrosOrcamentos(){document.getElementById('orcBusca').value='';document.getElementById('orcFiltroStatus').value='todos';document.getElementById('orcFiltroMes').value='';carregarOrcamentos();}

function criarDocumentoPdfOrcamento(d){
  if(!window.jspdf||!window.jspdf.jsPDF)return null;const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),empresa=d.empresa_nome_fantasia||d.empresa_razao_social||'Ranchão Bebidas',fonte='times';
  doc.setFillColor(23,35,60);doc.rect(0,0,210,30,'F');doc.setTextColor(255,255,255);doc.setFont(fonte,'bold');doc.setFontSize(18);doc.text(empresa,15,14);doc.setFontSize(9);doc.setFont(fonte,'normal');doc.text('ORÇAMENTO COMERCIAL',15,22);
  doc.setTextColor(35,48,65);doc.setFontSize(9);doc.setFont(fonte,'normal');let y=39;if(d.empresa_razao_social)doc.text(d.empresa_razao_social,15,y);if(d.empresa_cnpj)doc.text('CNPJ: '+d.empresa_cnpj,15,y+5);if(d.empresa_endereco)doc.text(doc.splitTextToSize(d.empresa_endereco,105),15,y+10);doc.setFont(fonte,'bold');doc.text('Emissão: '+fmtData(d.data_emissao),195,y,{align:'right'});doc.text('Válido até: '+fmtData(d.data_validade),195,y+6,{align:'right'});
  y=61;let inicioTabela=65;if(d.cliente_nome||d.cliente_telefone||d.cliente_documento){doc.setDrawColor(205,214,225);doc.line(15,y,195,y);y+=8;doc.setFont(fonte,'bold');doc.text('CLIENTE',15,y);doc.setFont(fonte,'normal');if(d.cliente_nome)doc.text(d.cliente_nome,15,y+6);if(d.cliente_telefone)doc.text('Telefone: '+d.cliente_telefone,15,y+12);if(d.cliente_documento)doc.text('CPF/CNPJ: '+d.cliente_documento,105,y+12);inicioTabela=y+18;}
  const corpo=(d.itens||[]).map(i=>[i.produto,String(i.quantidade).replace('.',','),brl(i.valor_unitario),brl(i.total)]);doc.autoTable({startY:inicioTabela,margin:{left:15,right:15},head:[['Produto / descrição','Quantidade','Valor unitário','Total']],body:corpo,theme:'grid',styles:{font:'times',fontSize:9,cellPadding:3},headStyles:{fillColor:[35,55,84],font:'times',fontStyle:'bold'},columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}}});
  y=doc.lastAutoTable.finalY+8;if(y>245){doc.addPage();y=20;}doc.setFont(fonte,'normal');doc.setFontSize(9);doc.text('Subtotal',155,y,{align:'right'});doc.text(brl(d.subtotal),195,y,{align:'right'});if(Number(d.desconto)>0){y+=6;doc.text('Desconto',155,y,{align:'right'});doc.text('- '+brl(d.desconto),195,y,{align:'right'});}if(Number(d.valor_entrega)>0){y+=6;doc.text('Entrega',155,y,{align:'right'});doc.text('+ '+brl(d.valor_entrega),195,y,{align:'right'});}y+=9;doc.setFillColor(232,246,237);doc.rect(115,y-6,80,12,'F');doc.setTextColor(24,95,56);doc.setFont(fonte,'bold');doc.setFontSize(12);doc.text('TOTAL',155,y+2,{align:'right'});doc.text(brl(d.total),192,y+2,{align:'right'});doc.setTextColor(55,67,82);doc.setFontSize(9);doc.setFont(fonte,'normal');y+=16;if(d.forma_pagamento){doc.setFont(fonte,'bold');doc.text('Forma de pagamento:',15,y);doc.setFont(fonte,'normal');doc.text(d.forma_pagamento,51,y);y+=8;}if(d.observacoes){doc.setFont(fonte,'bold');doc.text('Observações:',15,y);doc.setFont(fonte,'normal');doc.text(doc.splitTextToSize(d.observacoes,180),15,y+6);}
  doc.setFontSize(7.5);doc.setTextColor(110,120,132);doc.text('Este orçamento não é documento fiscal nem confirmação de venda. Valores sujeitos à validade e disponibilidade informadas.',105,286,{align:'center'});return doc;
}
function gerarPdfOrcamento(d){const doc=criarDocumentoPdfOrcamento(d);if(!doc){alert('Não foi possível carregar o recurso de PDF.');return;}const cliente=(d.cliente_nome||'sem-cliente').replace(/[^a-zA-Z0-9À-ÿ]+/g,'-');doc.save('orcamento-'+(d.id?numeroOrcamento(d):'novo')+'-'+cliente+'.pdf');}
function gerarPdfOrcamentoFormulario(){const d=dadosFormularioOrcamento(),erro=validarOrcamento(d),el=document.getElementById('orcErr');if(erro){el.textContent=erro;el.style.display='block';return;}el.style.display='none';gerarPdfOrcamento(d);}
function baixarPdfOrcamento(id){const x=orcamentosCache.find(v=>Number(v.id)===Number(id));if(x)gerarPdfOrcamento(x);}
async function compartilharOrcamento(id){const x=orcamentosCache.find(v=>Number(v.id)===Number(id));if(!x)return;const doc=criarDocumentoPdfOrcamento(x);if(!doc)return;const blob=doc.output('blob'),arquivo=new File([blob],'orcamento-'+numeroOrcamento(x)+'.pdf',{type:'application/pdf'});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[arquivo]})){try{await navigator.share({title:'Orçamento Ranchão Bebidas',text:'Orçamento da Ranchão Bebidas'+(x.cliente_nome?' para '+x.cliente_nome:''),files:[arquivo]});return;}catch(e){if(e&&e.name==='AbortError')return;}}gerarPdfOrcamento(x);alert('O PDF foi baixado. Anexe o arquivo na conversa do cliente.');}

/* ================= BANCO DE HORAS ================= */

let viewAtual = null;
let usuarioEmailAtual = null;
let bhCarregado = false;
let bhFuncionarios = [];
let bhFuncionarioAtualId = null;
let bhRegistros = [];
let escalaSelecionada = 'normal';

function setEscala(e){
  escalaSelecionada = e;
  document.querySelectorAll('#escalaToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.escala===e));
  const dica = document.getElementById('escalaDica');
  if(e==='12x36'){
    document.getElementById('func_horas').value = 11;
    document.getElementById('func_minutos').value = 0;
    dica.textContent = 'Use as horas efetivas (já sem o intervalo) — geralmente 11h, não as 12h de plantão.';
  }else{
    document.getElementById('func_horas').value = 8;
    document.getElementById('func_minutos').value = 0;
    dica.textContent = '';
  }
}

function mudarAbaBancoHoras(aba){
  const view = document.getElementById('viewBancoHoras');
  if(!view) return;
  view.querySelectorAll('.bh-tab-btn[data-bh-target]').forEach(btn => {
    const ativo = btn.dataset.bhTarget === aba;
    btn.classList.toggle('active', ativo);
    btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
  view.querySelectorAll('[data-bh-tab-panel]').forEach(painel => {
    painel.classList.toggle('active', painel.dataset.bhTabPanel === aba);
  });
}

const VIEWS = ['checklist','duvidas','manutencao','contasPagar','despesasFixas','comprovantes','leituraComprovantes','diferencaCaixa','fluxoCaixa','pagamentos','pagamentoCaixa','contratos','vendasComCusto','vendasDelivery','orcamentos','bancoHoras','compras','colaboradores','aniversarios','fornecedores','contasBancarias','inventario','controleEstoque','contagensEstoque','combinacaoPagamentos'];
let colabCarregado = false;

const CATEGORIA_POR_VIEW = {
  contasPagar:'financeiro', despesasFixas:'financeiro', comprovantes:'financeiro', leituraComprovantes:'financeiro',
  diferencaCaixa:'financeiro', fluxoCaixa:'financeiro', pagamentos:'financeiro',
  pagamentoCaixa:'financeiro', combinacaoPagamentos:'financeiro', contratos:'financeiro',
  vendasComCusto:'vendas', vendasDelivery:'vendas', orcamentos:'vendas',
  compras:'comprasEstoque', inventario:'comprasEstoque', controleEstoque:'comprasEstoque', contagensEstoque:'comprasEstoque',
  bancoHoras:'equipe', colaboradores:'equipe', aniversarios:'equipe',
  fornecedores:'cadastros', contasBancarias:'cadastros',
  checklist:'checklist', duvidas:'duvidas', manutencao:'manutencao'
};
const VIEW_IDS = { checklist:'viewChecklist', duvidas:'viewDuvidas', manutencao:'viewManutencao', contasPagar:'viewContasPagar', despesasFixas:'viewDespesasFixas', comprovantes:'viewComprovantes', leituraComprovantes:'viewLeituraComprovantes', diferencaCaixa:'viewDiferencaCaixa', fluxoCaixa:'viewFluxoCaixa', pagamentos:'viewPagamentos', pagamentoCaixa:'viewPagamentoCaixa', contratos:'viewContratos', vendasComCusto:'viewVendasComCusto', vendasDelivery:'viewVendasDelivery', orcamentos:'viewOrcamentos', bancoHoras:'viewBancoHoras', compras:'viewCompras', colaboradores:'viewColaboradores', aniversarios:'viewAniversarios', fornecedores:'viewFornecedores', contasBancarias:'viewContasBancarias', inventario:'viewInventario', controleEstoque:'viewControleEstoque', contagensEstoque:'viewContagensEstoque', combinacaoPagamentos:'viewCombinacaoPagamentos' };

let categoriaMenuAberta = null;

function selecionarCategoria(categoria){
  viewAtual = null;
  VIEWS.forEach(v=>document.getElementById(VIEW_IDS[v]).style.display = 'none');
  document.getElementById('moduleContextBar').style.display = 'none';
  document.querySelectorAll('.top-module-btn').forEach(btn=>btn.classList.remove('active'));
  categoriaMenuAberta = categoriaMenuAberta===categoria ? null : categoria;
  document.querySelectorAll('.top-category-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.category===categoria);
  });
  document.querySelectorAll('.top-module-btn').forEach(btn=>{
    btn.classList.toggle('visible', categoriaMenuAberta===categoria && btn.dataset.category===categoria);
  });
  document.querySelector('.top-modules').classList.toggle('open', !!categoriaMenuAberta);
}

function voltarAoInicio(){
  viewAtual = null;
  categoriaMenuAberta = null;
  VIEWS.forEach(v=>document.getElementById(VIEW_IDS[v]).style.display = 'none');
  document.getElementById('moduleContextBar').style.display = 'none';
  document.querySelectorAll('.top-category-btn').forEach(btn=>btn.classList.remove('active'));
  document.querySelectorAll('.top-module-btn').forEach(btn=>btn.classList.remove('active','visible'));
  document.querySelector('.top-modules').classList.remove('open');
  document.getElementById('listaLojasPopup').classList.remove('open');
  document.getElementById('perfilMenu').classList.remove('open');
  window.scrollTo({ top:0, behavior:'smooth' });
}

function fecharMenuModulos(view){
  const categoria = CATEGORIA_POR_VIEW[view] || 'financeiro';
  categoriaMenuAberta = null;
  document.querySelectorAll('.top-category-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.category===categoria);
  });
  document.querySelectorAll('.top-module-btn').forEach(btn=>btn.classList.remove('visible'));
  document.querySelector('.top-modules').classList.remove('open');
}

async function mudarViewPrincipal(view){
  viewAtual = view;
  fecharMenuModulos(view);
  const barraContexto = document.getElementById('moduleContextBar');
  barraContexto.style.display = view==='duvidas' ? 'none' : 'flex';
  if(view!=='duvidas'){
    document.getElementById('codigoLojaModulo').value = lojaAtual==='loja2' ? '02' : '01';
    document.getElementById('nomeLojaSelecionada').textContent = lojaAtual==='loja2' ? 'Loja 02' : 'Loja 01';
  }

  VIEWS.forEach(v=>{
    document.getElementById(VIEW_IDS[v]).style.display = (v===view) ? '' : 'none';
  });

  document.querySelectorAll('.top-module-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===view));

  if(view==='despesasFixas'){
    await abrirFixas();
  }else if(view==='comprovantes'){
    await abrirComprovantes();
  }else if(view==='leituraComprovantes'){
    await abrirLeituraComprovantes();
  }else if(view==='diferencaCaixa'){
    await abrirDiferencaCaixa();
  }else if(view==='fluxoCaixa'){
    document.getElementById('loadingScreen').style.display = 'flex';
    await abrirFluxoCaixa();
    document.getElementById('loadingScreen').style.display = 'none';
  }else if(view==='pagamentos'){
    await abrirPagamentos();
  }else if(view==='pagamentoCaixa'){
    await abrirPagamentoCaixa();
  }else if(view==='contratos'){
    await abrirContratos();
  }else if(view==='contasPagar'){
    carregarFornecedores();
  }else if(view==='checklist'){
    await abrirChecklist();
  }else if(view==='duvidas'){
    await abrirDuvidas();
  }else if(view==='manutencao'){
    await carregarManutencoes();
  }else if(view==='vendasComCusto'){
    await abrirVendas();
  }else if(view==='vendasDelivery'){
    await abrirVendasDelivery();
  }else if(view==='orcamentos'){
    await abrirOrcamentos();
  }else if(view==='bancoHoras'){
    if(!bhCarregado) await carregarFuncionarios();
  }else if(view==='compras'){
    await carregarCompras();
  }else if(view==='colaboradores'){
    await carregarColaboradores();
  }else if(view==='aniversarios'){
    await carregarColaboradores();
    renderAniversarios();
  }else if(view==='fornecedores'){
    await carregarFornecedores();
  }else if(view==='contasBancarias'){
    await carregarContasBancarias();
  }else if(view==='inventario'){
    await abrirInventario();
  }else if(view==='controleEstoque'){
    await abrirControleEstoque();
  }else if(view==='contagensEstoque'){
    await abrirContagensEstoque();
  }else if(view==='combinacaoPagamentos'){
    abrirCombinacaoPagamentos();
  }
}

async function carregarFuncionarios(){
  const { data, error } = await sb.from('bh_funcionarios').select('*').eq('loja', lojaAtual).eq('ativo', true).order('nome');
  if(error){
    console.error('Erro ao carregar funcionários:', error);
    return;
  }
  bhFuncionarios = data || [];
  bhCarregado = true;
  renderFuncionarioSelect();
  await calcularResumoSaldosBancoHoras();
  await carregarAtestados();
}

// resumo geral: saldo de TODOS os colaboradores, igual ao alerta que já existe na tela inicial,
// só que mostrando todo mundo (não só quem está com saldo muito negativo)
let bhResumoSaldos = {}; // { funcionarioId: saldoAcumuladoEmMinutos }

async function calcularResumoSaldosBancoHoras(){
  bhResumoSaldos = {};
  for(const f of bhFuncionarios){
    const { data: registros } = await sb.from('bh_registros').select('*').eq('funcionario_id', f.id);
    let acumulado = 0;
    (registros||[]).forEach(reg=>{
      let trabalhado;
      if(reg.tipo_dia==='falta_justificada') trabalhado = f.carga_horaria_diaria_min;
      else if(reg.tipo_dia==='falta_injustificada') trabalhado = reg.descontar_falta ? 0 : f.carga_horaria_diaria_min;
      else trabalhado = calcularMinutosTrabalhados(reg);
      acumulado += trabalhado - f.carga_horaria_diaria_min;
    });
    bhResumoSaldos[f.id] = acumulado;
  }
  renderResumoGeralBancoHoras();
}

function renderResumoGeralBancoHoras(){
  const el = document.getElementById('bhResumoGeralBody');
  if(!el) return;
  if(bhFuncionarios.length===0){
    el.innerHTML = '<div style="text-align:center;color:var(--muted);font-style:italic;padding:20px 16px;">Nenhum colaborador cadastrado.</div>';
    return;
  }
  const linhas = bhFuncionarios.map(f=>({
    id: f.id, nome: f.nome, cargo: f.cargo,
    saldo: bhResumoSaldos[f.id] ?? 0
  })).sort((a,b)=>a.saldo-b.saldo);

  el.innerHTML = linhas.map(l=>`
    <div class="contest-row" style="grid-template-columns:1fr 1fr 110px;cursor:pointer;" onclick="selecionarFuncionario(${l.id})">
      <div class="campo"><span class="lbl-mobile">Nome</span><span>${escapeHtml(l.nome)}${String(l.id)===String(bhFuncionarioAtualId) ? ' •' : ''}</span></div>
      <div class="campo"><span class="lbl-mobile">Cargo</span><span>${escapeHtml((l.cargo||'—').toUpperCase())}</span></div>
      <div class="campo" style="text-align:right;"><span class="lbl-mobile">Saldo</span><span style="font-family:var(--font-mono);color:${l.saldo<0?'var(--rust)':(l.saldo>0?'var(--green)':'var(--muted)')};">${fmtMinutosSinal(l.saldo)}</span></div>
    </div>
  `).join('');
}

/* ================= ATESTADOS ================= */

let bhAtestadosCache = [];
let atestadoEditandoArquivo = null;
let excluindoAtestadoId = null;

async function carregarAtestados(){
  const { data, error } = await sb.from('bh_atestados').select('*').eq('loja', lojaAtual).order('data_inicio', { ascending: false });
  if(error){ console.error('Erro ao carregar atestados:', error); bhAtestadosCache = []; }
  else bhAtestadosCache = data || [];
  renderAtestados();
}

function nomeFuncionarioPorId(id){
  const f = bhFuncionarios.find(x=>String(x.id)===String(id));
  return f ? f.nome : '(colaborador removido)';
}

function diasAtestado(dataInicio, dataFim){
  const de = new Date(dataInicio + 'T00:00:00');
  const ate = new Date(dataFim + 'T00:00:00');
  const dias = Math.round((ate - de) / 86400000) + 1;
  return dias > 0 ? dias : 1;
}

function renderAtestados(){
  const el = document.getElementById('bhAtestadosBody');
  if(!el) return;
  if(bhAtestadosCache.length===0){
    el.innerHTML = '<div style="text-align:center;color:var(--muted);font-style:italic;padding:20px 16px;">Nenhum atestado cadastrado ainda.</div>';
    return;
  }
  const busca = (document.getElementById('bhAtestadosBusca')?.value || '').trim().toLowerCase();
  const filtrados = bhAtestadosCache.filter(a => !busca || nomeFuncionarioPorId(a.funcionario_id).toLowerCase().includes(busca));

  el.innerHTML = filtrados.length===0
    ? '<div style="text-align:center;color:var(--muted);font-style:italic;padding:20px 16px;">Nenhum resultado pra essa busca.</div>'
    : filtrados.map(a=>`
    <div class="contest-row" style="grid-template-columns:1.3fr 1fr 90px 1.4fr 90px;">
      <div class="campo"><span class="lbl-mobile">Colaborador</span><span>${escapeHtml(nomeFuncionarioPorId(a.funcionario_id))}</span></div>
      <div class="campo"><span class="lbl-mobile">Período</span><span>${fmtData(a.data_inicio)} — ${fmtData(a.data_fim)}</span></div>
      <div class="campo" style="text-align:right;"><span class="lbl-mobile">Dias</span><span>${diasAtestado(a.data_inicio, a.data_fim)}</span></div>
      <div class="campo"><span class="lbl-mobile">Observação</span><span>${escapeHtml(a.observacao || '—')}</span></div>
      <div class="campo" style="justify-content:flex-end;gap:8px;">
        <button class="iconbtn" title="Ver arquivo" data-caminho="${escapeHtml(a.caminho_storage)}" onclick="abrirArquivoAtestado(this.dataset.caminho)">🖼️</button>
        <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoAtestado(${a.id})">✕</button>
      </div>
    </div>
  `).join('');
}

async function abrirArquivoAtestado(caminho){
  const { data, error } = await sb.storage.from('comprovantes').createSignedUrl(caminho, 3600);
  if(error){ alert('Erro ao abrir o arquivo: ' + error.message); return; }
  window.open(data.signedUrl, '_blank', 'noopener');
}

async function compactarImagemAtestado(blob){
  if(!blob||!String(blob.type||'').startsWith('image/')||blob.type==='image/gif')return {blob,ext:null};
  let bitmap=null;
  try{
    bitmap=await createImageBitmap(blob);
    const limite=1600,escala=Math.min(1,limite/Math.max(bitmap.width,bitmap.height)),largura=Math.max(1,Math.round(bitmap.width*escala)),altura=Math.max(1,Math.round(bitmap.height*escala));
    const canvas=document.createElement('canvas');canvas.width=largura;canvas.height=altura;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,largura,altura);ctx.drawImage(bitmap,0,0,largura,altura);
    const reduzido=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.62));
    if(reduzido&&reduzido.size<blob.size)return {blob:reduzido,ext:'jpg'};
  }catch(e){console.warn('Não foi possível recomprimir uma imagem de atestado:',e);}
  finally{if(bitmap&&bitmap.close)bitmap.close();}
  return {blob,ext:null};
}

function nomeSeguroZipAtestado(texto){
  return String(texto||'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'arquivo';
}

async function baixarTodosAtestadosZip(){
  if(!window.JSZip){alert('Não foi possível carregar o recurso de compactação. Recarregue a página e tente novamente.');return;}
  if(!bhAtestadosCache.length){alert('Não há atestados cadastrados nesta loja.');return;}
  abrirProgresso('Preparando atestados…');
  const zip=new JSZip(),total=bhAtestadosCache.length,usados=new Set(),manifesto=[];let concluidos=0,falhas=0,adicionados=0;
  for(const a of bhAtestadosCache){
    try{
      const {data:urlData,error:urlErro}=await sb.storage.from('comprovantes').createSignedUrl(a.caminho_storage,3600);
      if(urlErro||!urlData)throw urlErro||new Error('Arquivo indisponível');
      const resposta=await fetch(urlData.signedUrl);if(!resposta.ok)throw new Error('Falha ao baixar o arquivo');
      const original=await resposta.blob(),compactado=await compactarImagemAtestado(original),nomeOriginal=String(a.nome_arquivo||'atestado'),ponto=nomeOriginal.lastIndexOf('.'),extOriginal=ponto>=0?nomeOriginal.slice(ponto+1).toLowerCase():'bin',ext=compactado.ext||extOriginal;
      const colaborador=nomeSeguroZipAtestado(nomeFuncionarioPorId(a.funcionario_id)),base=nomeSeguroZipAtestado(a.data_inicio+'_'+a.data_fim+'_atestado'),chaveBase=colaborador+'/'+base;let caminho=chaveBase+'.'+ext,contador=2;
      while(usados.has(caminho)){caminho=chaveBase+'-'+contador+'.'+ext;contador++;}usados.add(caminho);
      zip.file(caminho,compactado.blob,{compression:'DEFLATE',compressionOptions:{level:9}});adicionados++;
      manifesto.push(nomeFuncionarioPorId(a.funcionario_id)+' | '+fmtData(a.data_inicio)+' a '+fmtData(a.data_fim)+' | '+nomeOriginal+(compactado.ext?' | imagem reduzida':'')+(a.observacao?' | '+a.observacao:''));
    }catch(e){falhas++;console.error('Erro ao preparar atestado:',a.id,e);}
    concluidos++;atualizarProgresso((concluidos/total)*85);
  }
  if(!adicionados){fecharProgresso();alert('Não foi possível baixar os arquivos dos atestados. Verifique a conexão e tente novamente.');return;}
  zip.file('lista-de-atestados.txt','ATESTADOS — '+(NOMES_LOJA[lojaAtual]||lojaAtual)+'\n\n'+manifesto.join('\n'));
  document.getElementById('progressoTitulo').textContent='Compactando atestados…';
  const conteudo=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:9}},meta=>atualizarProgresso(85+meta.percent*0.15));
  atualizarProgresso(100);const url=URL.createObjectURL(conteudo),link=document.createElement('a');link.href=url;link.download='atestados-'+(NOMES_LOJA[lojaAtual]||lojaAtual).toLowerCase().replace(/\s+/g,'-')+'-'+todayStr()+'.zip';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setTimeout(fecharProgresso,400);
  if(falhas)setTimeout(()=>alert('O ZIP foi criado, mas '+falhas+' arquivo(s) não puderam ser incluídos.'),600);
}

function abrirNovoAtestado(){
  const sel = document.getElementById('atestado_funcionario_id');
  sel.innerHTML = bhFuncionarios.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
  document.getElementById('atestado_data_inicio').value = '';
  document.getElementById('atestado_data_fim').value = '';
  document.getElementById('atestado_observacao').value = '';
  document.getElementById('atestado_arquivo').value = '';
  document.getElementById('atestadoErr').style.display = 'none';
  document.getElementById('atestadoModal').style.display = 'flex';
}

function fecharAtestadoModal(){
  document.getElementById('atestadoModal').style.display = 'none';
}

async function salvarAtestado(){
  const btn = document.getElementById('atestadoSalvarBtn');
  if(btn.disabled) return; // trava contra chamada dupla
  const funcionarioId = document.getElementById('atestado_funcionario_id').value;
  const dataInicio = document.getElementById('atestado_data_inicio').value;
  const dataFim = document.getElementById('atestado_data_fim').value;
  const observacao = document.getElementById('atestado_observacao').value.trim();
  const arquivo = document.getElementById('atestado_arquivo').files[0];
  const err = document.getElementById('atestadoErr');

  if(!funcionarioId || !dataInicio || !dataFim || !arquivo){
    err.textContent = 'Selecione o colaborador, as datas e o arquivo do atestado.';
    err.style.display = 'block';
    return;
  }
  const erroArquivo = validarArquivoLocal(arquivo, 'documento');
  if(erroArquivo){
    err.textContent = erroArquivo;
    err.style.display = 'block';
    return;
  }
  if(dataFim < dataInicio){
    err.textContent = 'A data de fim não pode ser antes da data de início.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const caminho = 'atestados/' + lojaAtual + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '_' + nomeArquivoSeguro(arquivo.name);
  const { error: erroUpload } = await sb.storage.from('comprovantes').upload(caminho, arquivo);
  if(erroUpload){
    btn.disabled = false;
    btn.textContent = 'Salvar';
    err.textContent = 'Erro ao enviar o arquivo: ' + erroUpload.message;
    err.style.display = 'block';
    return;
  }

  const { error: erroInsert } = await sb.from('bh_atestados').insert({
    loja: lojaAtual,
    funcionario_id: funcionarioId,
    data_inicio: dataInicio,
    data_fim: dataFim,
    observacao: observacao || null,
    nome_arquivo: arquivo.name,
    caminho_storage: caminho
  });

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if(erroInsert){
    await sb.storage.from('comprovantes').remove([caminho]); // desfaz o upload já que o registro falhou
    err.textContent = 'Erro ao salvar: ' + erroInsert.message;
    err.style.display = 'block';
    return;
  }

  fecharAtestadoModal();
  await carregarAtestados();
}

function confirmarExclusaoAtestado(id){
  excluindoAtestadoId = id;
  document.getElementById('confirmAtestadoModal').style.display = 'flex';
}
function fecharConfirmacaoAtestado(){
  document.getElementById('confirmAtestadoModal').style.display = 'none';
  excluindoAtestadoId = null;
}
async function confirmarExclusaoAtestadoOk(){
  if(!excluindoAtestadoId) return;
  const a = bhAtestadosCache.find(x=>x.id===excluindoAtestadoId);
  if(a){
    await sb.storage.from('comprovantes').remove([a.caminho_storage]);
    await sb.from('bh_atestados').delete().eq('id', a.id);
  }
  fecharConfirmacaoAtestado();
  await carregarAtestados();
}

function renderFuncionarioSelect(){
  const sel = document.getElementById('bhFuncionarioSelect');
  const atual = bhFuncionarioAtualId || '';
  sel.innerHTML = '<option value="">Selecione um funcionário</option>' +
    bhFuncionarios.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)} — ${f.tipo_escala==='12x36' ? '12x36' : 'Normal'}</option>`).join('');
  sel.value = atual;
}

let colabEditandoId = null;
let colabLojaAtual = 'loja1';
let colaboradoresLoja1 = [];
let colaboradoresLoja2 = [];

function abrirNovoColaborador(loja){
  colabEditandoId = null;
  colabLojaAtual = loja;
  document.getElementById('funcModalTitulo').textContent = 'Novo colaborador — ' + (NOMES_LOJA[loja]||'');
  document.getElementById('func_nome').value = '';
  document.getElementById('func_data_nascimento').value = '';
  document.getElementById('func_cargo').value = '';
  setEscala('normal');
  document.getElementById('funcErr').style.display = 'none';
  document.getElementById('funcModal').style.display = 'flex';
}

function abrirEditarColaborador(id, loja){
  const lista = loja==='loja1' ? colaboradoresLoja1 : colaboradoresLoja2;
  const f = lista.find(x=>x.id===id);
  if(!f) return;
  colabEditandoId = f.id;
  colabLojaAtual = loja;
  document.getElementById('funcModalTitulo').textContent = 'Editar colaborador';
  document.getElementById('func_nome').value = f.nome;
  document.getElementById('func_data_nascimento').value = f.data_nascimento || '';
  document.getElementById('func_cargo').value = f.cargo ? f.cargo.toUpperCase() : '';
  escalaSelecionada = f.tipo_escala || 'normal';
  document.querySelectorAll('#escalaToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.escala===escalaSelecionada));
  document.getElementById('func_horas').value = Math.floor(f.carga_horaria_diaria_min/60);
  document.getElementById('func_minutos').value = f.carga_horaria_diaria_min%60;
  document.getElementById('escalaDica').textContent = escalaSelecionada==='12x36' ? 'Use as horas efetivas (já sem o intervalo) — geralmente 11h, não as 12h de plantão.' : '';
  document.getElementById('funcErr').style.display = 'none';
  document.getElementById('funcModal').style.display = 'flex';
}

function fecharFuncModal(){
  document.getElementById('funcModal').style.display = 'none';
}

async function salvarFuncionario(){
  const nome = document.getElementById('func_nome').value.trim();
  const dataNascimento = document.getElementById('func_data_nascimento').value || null;
  const cargo = document.getElementById('func_cargo').value.trim();
  const horas = parseInt(document.getElementById('func_horas').value, 10) || 0;
  const minutos = parseInt(document.getElementById('func_minutos').value, 10) || 0;
  const err = document.getElementById('funcErr');
  if(!nome){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  const cargaMin = (horas*60) + minutos;

  if(colabEditandoId){
    const { data, error } = await sb.from('bh_funcionarios')
      .update({ nome: nome, data_nascimento: dataNascimento, cargo: cargo || null, carga_horaria_diaria_min: cargaMin, tipo_escala: escalaSelecionada })
      .eq('id', colabEditandoId).select().single();
    if(error){
      err.textContent = 'Erro ao salvar: ' + error.message;
      err.style.display = 'block';
      return;
    }
    if(data.loja==='loja1'){
      const idx = colaboradoresLoja1.findIndex(f=>f.id===data.id);
      if(idx>-1) colaboradoresLoja1[idx] = data;
    }else{
      const idx = colaboradoresLoja2.findIndex(f=>f.id===data.id);
      if(idx>-1) colaboradoresLoja2[idx] = data;
    }
  }else{
    const { data, error } = await sb.from('bh_funcionarios')
      .insert({ loja: colabLojaAtual, nome: nome, data_nascimento: dataNascimento, cargo: cargo || null, carga_horaria_diaria_min: cargaMin, tipo_escala: escalaSelecionada })
      .select().single();
    if(error){
      err.textContent = 'Erro ao salvar: ' + error.message;
      err.style.display = 'block';
      return;
    }
    if(data.loja==='loja1') colaboradoresLoja1.push(data); else colaboradoresLoja2.push(data);
  }
  renderColabTables();
  bhCarregado = false;
  fecharFuncModal();
}

async function carregarColaboradores(){
  const { data, error } = await sb.from('bh_funcionarios').select('*').eq('ativo', true).order('nome');
  if(error){
    console.error('Erro ao carregar colaboradores:', error);
    return;
  }
  colaboradoresLoja1 = (data||[]).filter(f=>f.loja==='loja1');
  colaboradoresLoja2 = (data||[]).filter(f=>f.loja==='loja2');
  colabCarregado = true;
  renderColabTables();
}

function renderColabTables(){
  renderColabTabela(1, colaboradoresLoja1);
  renderColabTabela(2, colaboradoresLoja2);
}

function renderColabTabela(numero, lista){
  const body = document.getElementById('colabBody'+numero);
  const empty = document.getElementById('colabEmpty'+numero);
  if(lista.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  const loja = 'loja'+numero;
  body.innerHTML = lista.map(f=>`
    <tr>
      <td>${escapeHtml(f.nome)}</td>
      <td>${f.cargo ? escapeHtml(f.cargo.toUpperCase()) : '—'}</td>
      <td>${f.data_nascimento ? fmtData(f.data_nascimento) : '—'}</td>
      <td>${f.tipo_escala==='12x36' ? '12x36' : 'Normal'}</td>
      <td>${fmtMinutos(f.carga_horaria_diaria_min)}</td>
      <td><div class="rowactions">
        <button class="iconbtn edit" title="Editar" onclick="abrirEditarColaborador('${f.id}','${loja}')">✎</button>
        <button class="iconbtn del" title="Excluir" onclick="abrirExcluirFuncionario('${f.id}','${loja}')">✕</button>
      </div></td>
    </tr>
  `).join('');
}

function dataAniversarioNoAno(dataNascimento, ano){
  const partes = String(dataNascimento||'').split('-').map(Number);
  if(partes.length!==3 || !partes[1] || !partes[2]) return null;
  let data = new Date(ano, partes[1]-1, partes[2]);
  if(data.getMonth()!==partes[1]-1) data = new Date(ano, partes[1], 0);
  data.setHours(0,0,0,0);
  return data;
}

function detalhesProximoAniversario(funcionario, hoje){
  let proxima = dataAniversarioNoAno(funcionario.data_nascimento, hoje.getFullYear());
  if(!proxima) return null;
  if(proxima < hoje) proxima = dataAniversarioNoAno(funcionario.data_nascimento, hoje.getFullYear()+1);
  const nascimento = new Date(funcionario.data_nascimento+'T00:00:00');
  return {
    funcionario,
    proxima,
    dias: Math.round((proxima-hoje)/86400000),
    idade: proxima.getFullYear()-nascimento.getFullYear()
  };
}

let timerPopupAniversario = null;

function fecharPopupAniversario(){
  const popup = document.getElementById('aniversarioPopup');
  if(popup) popup.style.display = 'none';
}

async function mostrarProximoAniversariante(){
  if(!sb || !document.getElementById('app').classList.contains('on')) return;
  try{
    const { data, error } = await sb.from('bh_funcionarios')
      .select('nome,cargo,loja,data_nascimento')
      .eq('ativo', true)
      .not('data_nascimento', 'is', null);
    if(error || !data || data.length===0) return;

    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const proximos = data.map(f=>detalhesProximoAniversario(f, hoje))
      .filter(Boolean)
      .sort((a,b)=>a.dias-b.dias || a.funcionario.nome.localeCompare(b.funcionario.nome));
    if(!proximos.length || !document.getElementById('app').classList.contains('on')) return;

    const item = proximos[0];
    const f = item.funcionario;
    const dataFormatada = item.proxima.toLocaleDateString('pt-BR', { day:'2-digit', month:'long' });
    const textoDias = item.dias===0 ? '🎉 O aniversário é hoje!' : item.dias===1 ? 'É amanhã!' : `Faltam ${item.dias} dias`;
    document.getElementById('aniversarioPopupNome').textContent = f.nome;
    document.getElementById('aniversarioPopupDetalhes').textContent = `${dataFormatada} • fará ${item.idade} anos • ${NOMES_LOJA[f.loja] || f.loja || 'Loja não informada'}${f.cargo ? ' • '+f.cargo : ''}`;
    document.getElementById('aniversarioPopupContagem').textContent = textoDias;
    document.getElementById('aniversarioPopup').style.display = 'flex';
  }catch(e){
    console.warn('Não foi possível carregar o lembrete de aniversário:', e);
  }
}

function agendarPopupAniversario(){
  clearTimeout(timerPopupAniversario);
  fecharPopupAniversario();
  timerPopupAniversario = setTimeout(mostrarProximoAniversariante, 1800);
}

function renderAniversarios(){
  const listaEl = document.getElementById('anivLista');
  if(!listaEl) return;
  const filtro = document.getElementById('anivFiltroLoja')?.value || 'atual';
  const todos = [...colaboradoresLoja1, ...colaboradoresLoja2];
  const lojaFiltro = filtro==='atual' ? lojaAtual : filtro;
  const filtrados = lojaFiltro==='todas' ? todos : todos.filter(f=>f.loja===lojaFiltro);
  const comData = filtrados.filter(f=>f.data_nascimento);
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const detalhes = comData.map(f=>detalhesProximoAniversario(f, hoje)).filter(Boolean).sort((a,b)=>a.dias-b.dias || a.funcionario.nome.localeCompare(b.funcionario.nome));
  const botaoMenu = document.querySelector('.top-module-btn[data-view="aniversarios"]');
  if(botaoMenu) botaoMenu.classList.toggle('aniv-alert', detalhes.some(item=>item.dias<=7));
  const aniversariantesMes = comData.filter(f=>Number(String(f.data_nascimento).slice(5,7))===hoje.getMonth()+1).length;
  document.getElementById('anivTotalMes').textContent = aniversariantesMes;
  document.getElementById('anivSemData').textContent = filtrados.length-comData.length;
  document.getElementById('anivProximo').textContent = detalhes.length ? detalhes[0].funcionario.nome+' — '+(detalhes[0].dias===0?'hoje':detalhes[0].dias+' dia'+(detalhes[0].dias===1?'':'s')) : '—';
  document.getElementById('anivEmpty').style.display = detalhes.length ? 'none' : 'block';
  listaEl.innerHTML = detalhes.map(item=>{
    const f=item.funcionario, meses=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const textoDias = item.dias===0 ? '🎉 É hoje!' : item.dias===1 ? 'Amanhã' : 'Faltam '+item.dias+' dias';
    return `<div class="aniv-item ${item.dias===0?'hoje':''}">
      <div class="aniv-date"><strong>${String(item.proxima.getDate()).padStart(2,'0')}</strong><span>${meses[item.proxima.getMonth()]}</span></div>
      <div><div class="aniv-name">${escapeHtml(f.nome)}</div><div class="aniv-sub">${f.cargo?escapeHtml(f.cargo):'Cargo não informado'} • fará ${item.idade} anos</div></div>
      <div class="aniv-loja"><div class="aniv-name" style="font-size:12px;">${escapeHtml(NOMES_LOJA[f.loja]||f.loja)}</div><div class="aniv-sub">${fmtData(f.data_nascimento)}</div></div>
      <div class="aniv-count">${textoDias}</div>
    </div>`;
  }).join('');
}

/* ================= COMPROVANTES ================= */

let compMesAtual = new Date().toISOString().slice(0,7);
let compCache = [];

function mesAtualPadrao(){
  return new Date().toISOString().slice(0,7);
}

function aplicarMesAtualPadrao(){
  const mes=mesAtualPadrao();
  document.querySelectorAll('input[type="month"]').forEach(campo=>{
    if(!campo.value) campo.value=mes;
  });
}

async function abrirComprovantes(){
  if(!compMesAtual) compMesAtual = mesAtualPadrao();
  document.getElementById('compMes').value = compMesAtual;
  await carregarComprovantes();
}

function mudarMesComprovantes(valor){
  compMesAtual = valor || mesAtualPadrao();
  carregarComprovantes();
}

async function carregarComprovantes(){
  const { data, error } = await sb.from('comprovantes')
    .select('*')
    .eq('loja', lojaAtual)
    .eq('mes', compMesAtual)
    .order('criado_em', { ascending: false });
  if(error){
    console.error('Erro ao carregar comprovantes:', error);
    compCache = [];
  }else{
    compCache = data || [];
  }
  await renderComprovantesGrid();
}

function ehImagem(tipo){
  return tipo && tipo.startsWith('image/');
}

async function renderComprovantesGrid(){
  const grid = document.getElementById('compGrid');
  const empty = document.getElementById('compEmpty');
  if(compCache.length===0){
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const cartoes = await Promise.all(compCache.map(async c=>{
    const { data: urlData } = await sb.storage.from('comprovantes').createSignedUrl(c.caminho_storage, 3600);
    const url = urlData ? urlData.signedUrl : '#';
    const dataFmt = new Date(c.criado_em).toLocaleDateString('pt-BR');
    const miolo = ehImagem(c.tipo_arquivo)
      ? `<img class="comp-thumb" src="${url}" loading="lazy">`
      : `<div class="comp-thumb-pdf">📄</div>`;
    return `<div class="comp-card">
      <a href="${url}" target="_blank" rel="noopener">
        ${miolo}
        <div class="comp-nome" title="${escapeHtml(c.nome_arquivo)}">${escapeHtml(c.nome_arquivo)}</div>
        <div class="comp-data">${dataFmt}</div>
      </a>
      <button class="comp-del" title="Excluir" onclick="confirmarExclusaoComprovante('${c.id}')">✕</button>
    </div>`;
  }));

  grid.innerHTML = cartoes.join('');
}

async function onSelecionarComprovantes(fileList){
  const arquivos = Array.from(fileList || []);
  if(arquivos.length===0) return;
  const erroArquivos = validarListaArquivos(arquivos, 'documento');
  if(erroArquivos){ alert(erroArquivos); document.getElementById('compFileInput').value = ''; return; }

  abrirProgresso('Enviando comprovante(s)…');

  for(let i=0; i<arquivos.length; i++){
    const arquivo = arquivos[i];
    const caminho = lojaAtual + '/' + compMesAtual + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '_' + nomeArquivoSeguro(arquivo.name);
    const { error: erroUpload } = await sb.storage.from('comprovantes').upload(caminho, arquivo);
    if(erroUpload){
      alert('Erro ao enviar "' + arquivo.name + '": ' + erroUpload.message);
      continue;
    }
    const { error: erroInsert } = await sb.from('comprovantes').insert({
      loja: lojaAtual,
      mes: compMesAtual,
      nome_arquivo: arquivo.name,
      caminho_storage: caminho,
      tipo_arquivo: arquivo.type,
      tamanho_bytes: arquivo.size
    });
    if(erroInsert){
      alert('Erro ao salvar informações de "' + arquivo.name + '": ' + erroInsert.message);
    }
    atualizarProgresso(((i+1) / arquivos.length) * 90);
  }

  document.getElementById('compFileInput').value = '';
  atualizarProgresso(95);
  await carregarComprovantes();
  atualizarProgresso(100);
  setTimeout(fecharProgresso, 250);
}

let excluindoComprovanteId = null;

function confirmarExclusaoComprovante(id){
  excluindoComprovanteId = id;
  document.getElementById('confirmComprovanteModal').style.display = 'flex';
}

function fecharConfirmacaoComprovante(){
  document.getElementById('confirmComprovanteModal').style.display = 'none';
  excluindoComprovanteId = null;
}

async function confirmarExclusaoComprovanteOk(){
  if(!excluindoComprovanteId) return;
  const c = compCache.find(x=>x.id===excluindoComprovanteId);
  if(c){
    await sb.storage.from('comprovantes').remove([c.caminho_storage]);
    await sb.from('comprovantes').delete().eq('id', c.id);
    compCache = compCache.filter(x=>x.id!==c.id);
    await renderComprovantesGrid();
  }
  fecharConfirmacaoComprovante();
}

function abrirProgresso(titulo){
  document.getElementById('progressoTitulo').textContent = titulo;
  atualizarProgresso(0);
  document.getElementById('progressoModal').style.display = 'flex';
}

function atualizarProgresso(pct){
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  document.getElementById('progressoBarra').style.width = p + '%';
  document.getElementById('progressoTexto').textContent = p + '%';
}

function fecharProgresso(){
  document.getElementById('progressoModal').style.display = 'none';
}

async function baixarTodosComprovantes(){
  if(!window.JSZip){
    alert('Não foi possível carregar o recurso de .zip. Recarregue a página e tente de novo.');
    return;
  }
  if(compCache.length===0){
    alert('Não há comprovantes nesse mês para baixar.');
    return;
  }

  abrirProgresso('Preparando comprovantes…');
  const zip = new JSZip();
  const total = compCache.length;
  let feitos = 0;

  for(const c of compCache){
    const { data: urlData } = await sb.storage.from('comprovantes').createSignedUrl(c.caminho_storage, 3600);
    if(urlData){
      const resp = await fetch(urlData.signedUrl);
      const blob = await resp.blob();
      zip.file(c.nome_arquivo, blob);
    }
    feitos++;
    atualizarProgresso((feitos / total) * 90); // reserva os últimos 10% pra compactação
  }

  abrirProgresso('Compactando arquivo .zip…');
  const conteudo = await zip.generateAsync({ type: 'blob' }, (metadata)=>{
    atualizarProgresso(90 + metadata.percent * 0.1);
  });

  atualizarProgresso(100);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(conteudo);
  link.download = 'comprovantes-' + (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','') + '-' + compMesAtual + '.zip';
  link.click();
  URL.revokeObjectURL(link.href);
  setTimeout(fecharProgresso, 400);
}

/* ================= LEITURA DE COMPROVANTES ================= */

let lcLote=[];
let lcHistorico=[];

function lcDataBrParaIso(valor){
  const m=String(valor||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m?m[3]+'-'+m[2]+'-'+m[1]:'';
}

function lcValorNumero(valor){
  const limpo=String(valor||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.');
  const n=Number(limpo);return Number.isFinite(n)?Math.abs(n):0;
}

function lcAposRotulo(texto,rotulos){
  for(const rotulo of rotulos){
    const re=new RegExp('(?:^|\\n)\\s*'+rotulo+'\\s*\\n\\s*([^\\n]+)','i');
    const m=texto.match(re);if(m&&m[1])return m[1].trim();
  }
  return '';
}

async function lcHashArquivo(arquivo){
  const bytes=await arquivo.arrayBuffer();
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function lcExtrairTextoPdf(arquivo){
  if(!window.pdfjsLib)throw new Error('O leitor de PDF não foi carregado. Verifique a internet e abra o sistema novamente.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const bytes=await arquivo.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
  const paginas=[];
  for(let n=1;n<=pdf.numPages;n++){
    const pagina=await pdf.getPage(n);
    const conteudo=await pagina.getTextContent();
    let texto='';
    conteudo.items.forEach(item=>{texto+=String(item.str||'')+(item.hasEOL?'\n':' ');});
    paginas.push(texto);
  }
  return paginas.join('\n');
}

function lcInterpretarTexto(texto){
  const t=String(texto||'').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n');
  const ehPagBank=/PagBank|Banco Seguro|PagSeguro/i.test(t);
  let recebedor=lcAposRotulo(t,['Favorecido','Recebedor','Benefici[aá]rio','Destinat[aá]rio']);
  let documento='';
  // No comprovante Pix do PagBank o recebedor aparece no bloco "Para".
  // Limitamos a busca até a próxima seção para não confundir com "Para dúvidas".
  if(!recebedor&&ehPagBank){
    const blocoPara=t.match(/(?:^|\n)\s*Para\s*\n([\s\S]{0,500}?)(?=\n\s*(?:Detalhes do pagamento|Informa[cç][oõ]es do recebedor|Tipo de transfer[eê]ncia)\b)/i);
    if(blocoPara){
      const linhas=blocoPara[1].split('\n').map(x=>x.trim()).filter(Boolean);
      recebedor=linhas.find(x=>!(/^(?:CPF|CNPJ|Institui[cç][aã]o|Identificador)$/i.test(x)))||'';
      const dm=blocoPara[1].match(/(?:CPF|CNPJ)\s*\n?\s*([\d.\/-]{11,20})/i);
      if(dm)documento=dm[1];
    }
  }
  if(recebedor){
    const pos=t.toLowerCase().indexOf(recebedor.toLowerCase());
    const trecho=pos>=0?t.slice(pos,pos+500):t;
    const dm=trecho.match(/(?:CPF|CNPJ)\s*\n?\s*([\d.\/-]{11,20})/i);if(dm)documento=dm[1];
  }
  if(!documento){const dm=t.match(/(?:CPF|CNPJ)\s*(?:do favorecido|do recebedor)?\s*\n?\s*([\d.\/-]{11,20})/i);if(dm)documento=dm[1];}
  let valor=0;
  const vm=t.match(/Valor do pagamento\s*\n?\s*R?\$?\s*([\d.]+,\d{2})/i)||t.match(/Valor (?:pago|da transa[cç][aã]o|transferido)\s*\n?\s*R?\$?\s*([\d.]+,\d{2})/i);
  if(vm)valor=lcValorNumero(vm[1]);
  let data='';let horario='';
  const cab=t.match(/Comprovante de (?:transa[cç][aã]o|pagamento(?:\s+Pix)?)[\s\S]{0,140}?(\d{2}\/\d{2}\/\d{4})(?:\s*(?:às|as)\s*(\d{2}:\d{2}))?/i);
  if(cab){data=lcDataBrParaIso(cab[1]);horario=cab[2]||'';}
  if(!data){const dm=t.match(/(?:Data (?:do pagamento|da transa[cç][aã]o)|Pagamento realizado em)\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/i);if(dm)data=lcDataBrParaIso(dm[1]);}
  const cm=t.match(/C[oó]digo (?:de|da) transa[cç][aã]o(?:\s+(?:PagBank|Pix))?\s*\n?\s*([A-Z0-9-]{8,})/i)||t.match(/(?:ID|Identificador) da transa[cç][aã]o\s*\n?\s*([A-Z0-9-]{8,})/i);
  const codigo=cm?cm[1].trim():'';
  const modelo=ehPagBank?'PagBank':(/PIX/i.test(t)?'Pix - outro banco':'Outro PDF');
  const faltando=[];if(!recebedor)faltando.push('recebedor');if(!valor)faltando.push('valor');if(!data)faltando.push('data');
  return {recebedor,documento,valor,data,horario,codigo,modelo,status:faltando.length?'revisar':'pronto',mensagem:faltando.length?'Confira: '+faltando.join(', '):'Leitura concluída'};
}

async function abrirLeituraComprovantes(){
  const mes=mesAtualPadrao();
  if(!document.getElementById('lcFiltroMes').value)document.getElementById('lcFiltroMes').value=mes;
  await carregarHistoricoLeituras();
}

function lcAtualizarProgresso(atual,total,texto){
  const box=document.getElementById('lcProgress');box.style.display='block';
  document.getElementById('lcProgressTexto').textContent=texto||('Lendo '+atual+' de '+total+'…');
  document.getElementById('lcProgressBar').style.width=(total?Math.round(atual/total*100):0)+'%';
}

async function selecionarLoteLeituraComprovantes(fileList){
  const arquivos=Array.from(fileList||[]);
  document.getElementById('lcFileInput').value='';
  if(!arquivos.length)return;
  if(arquivos.length>50){alert('Selecione no máximo 50 comprovantes por lote.');return;}
  const invalido=arquivos.find(a=>a.type!=='application/pdf'&&!a.name.toLowerCase().endsWith('.pdf'));
  if(invalido){alert('Nesta primeira versão, selecione somente arquivos PDF.');return;}
  const grande=arquivos.find(a=>a.size>15*1024*1024);if(grande){alert('O arquivo "'+grande.name+'" ultrapassa 15 MB.');return;}
  limparLoteLeituras();
  const inicio=Math.max(1,Number(document.getElementById('lcNumeroInicial').value)||1);
  for(let i=0;i<arquivos.length;i++){
    const arquivo=arquivos[i];lcAtualizarProgresso(i,arquivos.length,'Lendo '+(i+1)+' de '+arquivos.length+': '+arquivo.name);
    let item={id:'lc_'+Date.now()+'_'+i,numero:inicio+i,arquivo,nomeArquivo:arquivo.name,url:URL.createObjectURL(arquivo),recebedor:'',documento:'',valor:0,data:'',horario:'',codigo:'',modelo:'Não identificado',status:'erro',mensagem:'Não foi possível ler',hash:''};
    try{
      const [texto,hash]=await Promise.all([lcExtrairTextoPdf(arquivo),lcHashArquivo(arquivo)]);
      item={...item,...lcInterpretarTexto(texto),hash};
    }catch(e){item.mensagem=e&&e.message?e.message:'Não foi possível ler o PDF.';}
    lcLote.push(item);renderLoteLeituras();
  }
  await lcMarcarDuplicados();
  lcAtualizarProgresso(arquivos.length,arquivos.length,'Leitura concluída: '+arquivos.length+' comprovante(s).');
  setTimeout(()=>{document.getElementById('lcProgress').style.display='none';},1200);
}

async function lcMarcarDuplicados(){
  const hashes=lcLote.map(x=>x.hash).filter(Boolean),codigos=lcLote.map(x=>x.codigo).filter(Boolean);
  const encontrados=new Set();
  if(hashes.length){const {data}=await sb.from('leituras_comprovantes').select('arquivo_hash').eq('loja',lojaAtual).in('arquivo_hash',hashes);(data||[]).forEach(x=>encontrados.add('h:'+x.arquivo_hash));}
  if(codigos.length){const {data}=await sb.from('leituras_comprovantes').select('codigo_transacao').eq('loja',lojaAtual).in('codigo_transacao',codigos);(data||[]).forEach(x=>encontrados.add('c:'+x.codigo_transacao));}
  const vistos=new Set();
  lcLote.forEach(x=>{
    const chaves=[x.hash?'h:'+x.hash:'',x.codigo?'c:'+x.codigo:''].filter(Boolean);
    if(chaves.some(k=>encontrados.has(k)||vistos.has(k))){x.status='duplicado';x.mensagem='Este comprovante já foi incluído.';}
    chaves.forEach(k=>vistos.add(k));
  });
  renderLoteLeituras();
}

function renumerarLeiturasComprovantes(){const inicio=Math.max(1,Number(document.getElementById('lcNumeroInicial').value)||1);lcLote.forEach((x,i)=>x.numero=inicio+i);renderLoteLeituras();}

function atualizarCampoLoteLeitura(id,campo,valor){
  const x=lcLote.find(i=>i.id===id);if(!x)return;
  x[campo]=campo==='valor'?Math.max(0,Number(valor)||0):valor;
  if(x.status!=='duplicado')x.status=x.recebedor&&x.valor>0&&x.data?'pronto':'revisar';
  renderResumoLoteLeituras();
}

function renderResumoLoteLeituras(){
  const cont=s=>lcLote.filter(x=>x.status===s).length;
  document.getElementById('lcResumoLote').innerHTML=`<span>Total: <b>${lcLote.length}</b></span><span style="color:var(--green)">Prontos: <b>${cont('pronto')}</b></span><span style="color:#9a6700">Revisar: <b>${cont('revisar')}</b></span><span style="color:var(--rust)">Duplicados/erros: <b>${cont('duplicado')+cont('erro')}</b></span>`;
}

function renderLoteLeituras(){
  document.getElementById('lcLotePanel').style.display=lcLote.length?'block':'none';renderResumoLoteLeituras();
  document.getElementById('lcLoteBody').innerHTML=lcLote.map(x=>`<tr title="${escapeHtml(x.mensagem||'')}"><td><input type="number" min="1" value="${x.numero}" oninput="atualizarCampoLoteLeitura('${x.id}','numero',this.value)"></td><td><div class="lc-file-name" title="${escapeHtml(x.nomeArquivo)}">${escapeHtml(x.nomeArquivo)}</div></td><td><input value="${escapeHtml(x.recebedor)}" oninput="atualizarCampoLoteLeitura('${x.id}','recebedor',this.value)"></td><td><input value="${escapeHtml(x.documento)}" oninput="atualizarCampoLoteLeitura('${x.id}','documento',this.value)"></td><td><input type="number" min="0" step="0.01" value="${x.valor||''}" oninput="atualizarCampoLoteLeitura('${x.id}','valor',this.value)"></td><td><input type="date" value="${x.data}" oninput="atualizarCampoLoteLeitura('${x.id}','data',this.value)"></td><td>${escapeHtml(x.modelo)}</td><td><span class="lc-status ${x.status}">${x.status==='pronto'?'Pronto':x.status==='revisar'?'Revisar':x.status==='duplicado'?'Duplicado':'Erro'}</span></td><td><div class="rowactions"><button class="iconbtn" title="Abrir PDF" onclick="abrirPreviewLeitura('${x.id}')">↗</button><button class="iconbtn del" title="Remover do lote" onclick="removerLeituraDoLote('${x.id}')">✕</button></div></td></tr>`).join('');
}

function abrirPreviewLeitura(id){const x=lcLote.find(i=>i.id===id);if(x)mostrarPreviewLeituraComprovante(x.url,x.nomeArquivo);}
function removerLeituraDoLote(id){const x=lcLote.find(i=>i.id===id);if(x&&x.url)URL.revokeObjectURL(x.url);lcLote=lcLote.filter(i=>i.id!==id);renumerarLeiturasComprovantes();}
function limparLoteLeituras(){lcLote.forEach(x=>{if(x.url)URL.revokeObjectURL(x.url);});lcLote=[];const p=document.getElementById('lcLotePanel');if(p)p.style.display='none';const b=document.getElementById('lcLoteBody');if(b)b.innerHTML='';}

async function salvarTodasLeituras(){
  const validos=lcLote.filter(x=>x.status!=='duplicado'&&x.status!=='erro'&&x.recebedor&&x.valor>0&&x.data);
  if(!validos.length){alert('Não há comprovantes válidos para salvar. Confira as linhas marcadas para revisão.');return;}
  const btn=document.getElementById('lcSalvarTodosBtn');btn.disabled=true;btn.textContent='Salvando…';
  lcAtualizarProgresso(0,validos.length,'Preparando envio…');let salvos=0;const erros=[];
  for(let i=0;i<validos.length;i++){
    const x=validos[i];lcAtualizarProgresso(i,validos.length,'Salvando '+(i+1)+' de '+validos.length+': '+x.nomeArquivo);
    const caminho='leitura/'+lojaAtual+'/'+x.data.slice(0,7)+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,8)+'_'+nomeArquivoSeguro(x.nomeArquivo);
    const {error:erroUpload}=await sb.storage.from('comprovantes').upload(caminho,x.arquivo,{contentType:'application/pdf',upsert:false});
    if(erroUpload){erros.push(x.nomeArquivo+': '+erroUpload.message);continue;}
    const {error}=await sb.from('leituras_comprovantes').insert({loja:lojaAtual,numero:Number(x.numero)||null,recebedor:x.recebedor.trim(),documento:x.documento.trim()||null,valor:x.valor,data_pagamento:x.data,horario_pagamento:x.horario||null,modelo:x.modelo,codigo_transacao:x.codigo||null,arquivo_hash:x.hash,nome_arquivo:x.nomeArquivo,caminho_storage:caminho,tipo_arquivo:'application/pdf',tamanho_bytes:x.arquivo.size});
    if(error){await sb.storage.from('comprovantes').remove([caminho]);erros.push(x.nomeArquivo+': '+error.message);continue;}
    salvos++;
  }
  btn.disabled=false;btn.textContent='Salvar todos os válidos';lcAtualizarProgresso(validos.length,validos.length,salvos+' comprovante(s) salvo(s).');
  if(salvos){limparLoteLeituras();await carregarHistoricoLeituras();}
  setTimeout(()=>{document.getElementById('lcProgress').style.display='none';},1000);
  if(erros.length)alert('Alguns arquivos não foram salvos:\n'+erros.slice(0,8).join('\n'));
}

async function carregarHistoricoLeituras(){
  const campo=document.getElementById('lcFiltroMes');if(!campo)return;if(!campo.value)campo.value=mesAtualPadrao();
  const mes=campo.value,[ano,m]=mes.split('-').map(Number),fim=new Date(ano,m,1).toISOString().slice(0,10);
  const {data,error}=await sb.from('leituras_comprovantes').select('*').eq('loja',lojaAtual).gte('data_pagamento',mes+'-01').lt('data_pagamento',fim).order('data_pagamento',{ascending:true}).order('numero',{ascending:true}).order('id',{ascending:true});
  lcHistorico=error?[]:(data||[]);if(error)console.error('Erro ao carregar leituras:',error);renderHistoricoLeituras();
}

async function renderHistoricoLeituras(){
  const busca=(document.getElementById('lcBuscaHistorico')?.value||'').trim().toLowerCase();
  const lista=lcHistorico.filter(x=>!busca||[x.recebedor,x.documento,x.modelo,String(x.valor),x.data_pagamento].some(v=>String(v||'').toLowerCase().includes(busca)));
  document.getElementById('lcHistoricoEmpty').style.display=lista.length?'none':'block';
  const linhas=lista.map(x=>`<tr><td>${x.numero??'—'}</td><td>${fmtData(x.data_pagamento)}</td><td>${escapeHtml(x.recebedor)}</td><td>${escapeHtml(x.documento||'—')}</td><td>${escapeHtml(x.modelo||'—')}</td><td class="valor">${brl(x.valor)}</td><td><div class="rowactions"><button type="button" class="filter-btn" data-caminho="${escapeHtml(x.caminho_storage||'')}" data-nome="${escapeHtml(x.nome_arquivo||'Comprovante')}" onclick="abrirComprovanteLeituraSalvo(this.dataset.caminho,this.dataset.nome)">👁 Ver</button><button type="button" class="iconbtn del" title="Excluir comprovante" onclick="abrirExclusaoLeiturasComprovantes(${Number(x.id)})">✕</button></div></td></tr>`);
  document.getElementById('lcHistoricoBody').innerHTML=linhas.join('');
}

function mostrarPreviewLeituraComprovante(url,nome){
  const modal=document.getElementById('previewLeituraComprovanteModal'),frame=document.getElementById('previewLeituraComprovanteFrame'),carregando=document.getElementById('previewLeituraCarregando');
  document.getElementById('previewLeituraComprovanteTitulo').textContent=nome||'Visualizar comprovante';carregando.textContent='Carregando comprovante…';carregando.style.display='block';frame.style.display='none';modal.style.display='flex';
  frame.onload=()=>{carregando.style.display='none';frame.style.display='block';};frame.src=url;
}

async function abrirComprovanteLeituraSalvo(caminho,nome){
  if(!caminho){alert('O arquivo deste comprovante não foi encontrado.');return;}
  document.getElementById('previewLeituraComprovanteTitulo').textContent=nome||'Visualizar comprovante';document.getElementById('previewLeituraCarregando').textContent='Carregando comprovante…';document.getElementById('previewLeituraCarregando').style.display='block';document.getElementById('previewLeituraComprovanteFrame').style.display='none';document.getElementById('previewLeituraComprovanteModal').style.display='flex';
  const {data,error}=await sb.storage.from('comprovantes').createSignedUrl(caminho,3600);
  if(error||!data?.signedUrl){document.getElementById('previewLeituraCarregando').textContent='Não foi possível abrir o arquivo. Verifique sua conexão e tente novamente.';return;}
  mostrarPreviewLeituraComprovante(data.signedUrl,nome);
}

function fecharPreviewLeituraComprovante(){
  const frame=document.getElementById('previewLeituraComprovanteFrame');frame.onload=null;frame.src='about:blank';frame.style.display='none';document.getElementById('previewLeituraComprovanteModal').style.display='none';
}

function leiturasComprovantesFiltradas(){
  const busca=(document.getElementById('lcBuscaHistorico')?.value||'').trim().toLowerCase();
  return lcHistorico.filter(x=>!busca||[x.recebedor,x.documento,x.modelo,String(x.valor),x.data_pagamento].some(v=>String(v||'').toLowerCase().includes(busca)));
}

async function baixarLeiturasComprovantesZip(){
  if(!window.JSZip){alert('Não foi possível carregar o recurso de compactação. Reabra o sistema e tente novamente.');return;}
  const lista=leiturasComprovantesFiltradas();
  if(!lista.length){alert('Não há comprovantes exibidos para baixar.');return;}
  abrirProgresso('Preparando comprovantes analisados…');
  const zip=new JSZip(),usados=new Set(),manifesto=[];let adicionados=0,falhas=0;
  for(let i=0;i<lista.length;i++){
    const x=lista[i];
    try{
      const {data:urlData,error:urlErro}=await sb.storage.from('comprovantes').createSignedUrl(x.caminho_storage,3600);
      if(urlErro||!urlData?.signedUrl)throw urlErro||new Error('Arquivo indisponível');
      const resposta=await fetch(urlData.signedUrl);if(!resposta.ok)throw new Error('Falha ao baixar o arquivo');
      const blob=await resposta.blob(),numero=String(x.numero??i+1).padStart(3,'0');
      const base=nomeSeguroZipAtestado(numero+'_'+(x.data_pagamento||'sem-data')+'_'+(x.recebedor||'recebedor'));
      let nome=base+'.pdf',contador=2;while(usados.has(nome)){nome=base+'-'+contador+'.pdf';contador++;}usados.add(nome);
      zip.file(nome,blob,{compression:'STORE'});adicionados++;
      manifesto.push(numero+' | '+fmtData(x.data_pagamento)+' | '+(x.recebedor||'—')+' | '+(x.documento||'—')+' | '+brl(x.valor));
    }catch(e){falhas++;console.error('Erro ao preparar comprovante analisado:',x.id,e);}
    atualizarProgresso(((i+1)/lista.length)*85);
  }
  if(!adicionados){fecharProgresso();alert('Não foi possível baixar os comprovantes. Verifique sua conexão e tente novamente.');return;}
  zip.file('lista-de-comprovantes.txt','COMPROVANTES ANALISADOS — '+(NOMES_LOJA[lojaAtual]||lojaAtual)+'\nPeríodo: '+(document.getElementById('lcFiltroMes')?.value||'')+'\n\n'+manifesto.join('\n'));
  document.getElementById('progressoTitulo').textContent='Criando arquivo ZIP…';
  const conteudo=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},meta=>atualizarProgresso(85+meta.percent*.15));
  atualizarProgresso(100);const url=URL.createObjectURL(conteudo),link=document.createElement('a');link.href=url;link.download='comprovantes-analisados-'+(NOMES_LOJA[lojaAtual]||lojaAtual).toLowerCase().replace(/\s+/g,'-')+'-'+(document.getElementById('lcFiltroMes')?.value||todayStr())+'.zip';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setTimeout(fecharProgresso,400);
  if(falhas)setTimeout(()=>alert('O ZIP foi criado, mas '+falhas+' arquivo(s) não puderam ser incluídos.'),600);
}

let lcLeiturasExcluir=[];

function abrirExclusaoLeiturasComprovantes(id){
  lcLeiturasExcluir=id===undefined?leiturasComprovantesFiltradas():lcHistorico.filter(x=>Number(x.id)===Number(id));
  if(!lcLeiturasExcluir.length){alert('Não há comprovantes exibidos para excluir.');return;}
  const individual=lcLeiturasExcluir.length===1&&id!==undefined,item=lcLeiturasExcluir[0];
  document.getElementById('confirmExclusaoLeiturasTitulo').textContent=individual?'Excluir este comprovante?':'Excluir '+lcLeiturasExcluir.length+' comprovantes exibidos?';
  document.getElementById('confirmExclusaoLeiturasTexto').textContent=individual
    ?'O comprovante de '+(item.recebedor||'recebedor não informado')+', no valor de '+brl(item.valor)+', será excluído permanentemente.'
    :'Todos os comprovantes que aparecem no histórico com o mês e a pesquisa atuais serão excluídos permanentemente.';
  document.getElementById('confirmExclusaoLeiturasBtn').textContent=individual?'Excluir comprovante':'Excluir todos os exibidos';
  document.getElementById('confirmExclusaoLeiturasModal').style.display='flex';
}

function fecharExclusaoLeiturasComprovantes(){
  document.getElementById('confirmExclusaoLeiturasModal').style.display='none';lcLeiturasExcluir=[];
}

async function executarExclusaoLeiturasComprovantes(){
  const alvos=[...lcLeiturasExcluir];if(!alvos.length)return;
  const btn=document.getElementById('confirmExclusaoLeiturasBtn');btn.disabled=true;btn.textContent='Excluindo…';
  document.getElementById('confirmExclusaoLeiturasModal').style.display='none';abrirProgresso('Excluindo comprovantes…');let excluidos=0,falhas=0;
  for(let i=0;i<alvos.length;i++){
    const x=alvos[i];
    try{
      const {error}=await sb.from('leituras_comprovantes').delete().eq('id',x.id).eq('loja',lojaAtual);if(error)throw error;
      excluidos++;if(x.caminho_storage){const {error:erroArquivo}=await sb.storage.from('comprovantes').remove([x.caminho_storage]);if(erroArquivo)console.warn('Registro excluído, mas o arquivo não pôde ser removido:',erroArquivo);}
    }catch(e){falhas++;console.error('Erro ao excluir comprovante analisado:',x.id,e);}
    atualizarProgresso(((i+1)/alvos.length)*100);
  }
  lcLeiturasExcluir=[];btn.disabled=false;btn.textContent='Excluir';await carregarHistoricoLeituras();setTimeout(fecharProgresso,400);
  if(falhas)setTimeout(()=>alert(excluidos+' comprovante(s) excluído(s). '+falhas+' não puderam ser excluídos.'),600);
}

/* ================= MANUTENÇÃO ================= */

let manutencaoTipoAtual='computador';
let manutencoesCache=[];
let manutencaoEditandoId=null;
let manutencaoExcluindoId=null;

const MANUTENCAO_CONFIG={
  computador:{titulo:'🖥️ Manutenção de Computadores',subtitulo:'Controle de computadores, impressoras, rede e outros equipamentos.',item:'Equipamento / patrimônio'},
  loja:{titulo:'🏪 Manutenção da Loja',subtitulo:'Controle de reparos, instalações e conservação da estrutura da loja.',item:'Local / item'},
  veiculo:{titulo:'🚗 Manutenção de Veículos',subtitulo:'Controle de revisões, reparos e serviços dos veículos.',item:'Veículo / placa'}
};

async function abrirModuloManutencao(tipo){
  manutencaoTipoAtual=MANUTENCAO_CONFIG[tipo]?tipo:'computador';
  await mudarViewPrincipal('manutencao');
  const cfg=MANUTENCAO_CONFIG[manutencaoTipoAtual];
  document.getElementById('manutencaoTitulo').textContent=cfg.titulo;
  document.getElementById('manutencaoSubtitulo').textContent=cfg.subtitulo;
  document.getElementById('manItemLabel').textContent=cfg.item;
  document.querySelectorAll('.top-module-btn[data-manutencao-tipo]').forEach(btn=>btn.classList.toggle('active',btn.dataset.manutencaoTipo===manutencaoTipoAtual));
  if(!document.getElementById('man_data').value)document.getElementById('man_data').value=todayStr();
}

function intervaloMesManutencao(){
  const mes=document.getElementById('manFiltroMes').value||mesAtualPadrao();
  const p=mes.split('-').map(Number);
  const inicio=mes+'-01';
  const fim=new Date(p[0],p[1],1).toISOString().slice(0,10);
  return {mes,inicio,fim};
}

async function carregarManutencoes(){
  const campo=document.getElementById('manFiltroMes');if(!campo)return;
  if(!campo.value)campo.value=mesAtualPadrao();
  const periodo=intervaloMesManutencao();
  const {data,error}=await sb.from('manutencoes').select('*').eq('loja',lojaAtual).eq('tipo',manutencaoTipoAtual).gte('data_manutencao',periodo.inicio).lt('data_manutencao',periodo.fim).order('data_manutencao',{ascending:false}).order('id',{ascending:false});
  if(error){console.error('Erro ao carregar manutenções:',error);manutencoesCache=[];document.getElementById('manErr').textContent='Não foi possível carregar. Execute o SQL do módulo de Manutenção no Supabase.';document.getElementById('manErr').style.display='block';}
  else{manutencoesCache=data||[];document.getElementById('manErr').style.display='none';}
  renderManutencoes();
}

function textoStatusManutencao(status){return ({realizada:'Realizada',agendada:'Agendada',em_andamento:'Em andamento',cancelada:'Cancelada'})[status]||status;}

function renderManutencoes(){
  const busca=(document.getElementById('manBusca')?.value||'').trim().toLowerCase();
  const status=document.getElementById('manFiltroStatus')?.value||'todos';
  const lista=manutencoesCache.filter(x=>(status==='todos'||x.status===status)&&(!busca||[x.item,x.descricao,x.fornecedor,x.observacoes].some(v=>String(v||'').toLowerCase().includes(busca))));
  document.getElementById('manEmpty').style.display=lista.length?'none':'block';
  document.getElementById('manBody').innerHTML=lista.map(x=>`<tr><td>${fmtData(x.data_manutencao)}</td><td>${escapeHtml(x.item)}</td><td>${escapeHtml(x.descricao)}</td><td>${escapeHtml(x.fornecedor||'—')}</td><td>${escapeHtml(textoStatusManutencao(x.status))}</td><td>${x.proxima_data?fmtData(x.proxima_data):'—'}</td><td>${x.caminho_storage?`<button class="iconbtn" title="Abrir ${escapeHtml(x.arquivo_nome||'arquivo')}" data-caminho="${escapeHtml(x.caminho_storage)}" onclick="abrirArquivoManutencao(this.dataset.caminho)">📎</button>`:'—'}</td><td class="valor">${brl(x.valor||0)}</td><td><div class="rowactions"><button class="iconbtn" title="Editar" onclick="abrirEdicaoManutencao('${x.id}')">✎</button><button class="iconbtn del" title="Excluir" onclick="excluirManutencao('${x.id}')">✕</button></div></td></tr>`).join('');
}

function dadosArquivoManutencao(arquivo){
  if(!arquivo)return {ok:true,tipo:null};
  const ext=extensaoArquivo(arquivo.name);
  const permitido=arquivo.type==='application/pdf'||String(arquivo.type||'').startsWith('image/')||['.pdf','.jpg','.jpeg','.png','.webp','.gif','.heic','.heif'].includes(ext);
  if(!permitido)return {ok:false,mensagem:'Selecione uma foto ou um arquivo PDF.'};
  if(arquivo.size>15*1024*1024)return {ok:false,mensagem:'O arquivo deve ter no máximo 15 MB.'};
  return {ok:true,tipo:arquivo.type||({'.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.heic':'image/heic','.heif':'image/heif'})[ext]};
}

async function abrirArquivoManutencao(caminho){
  const {data,error}=await sb.storage.from('manutencoes').createSignedUrl(caminho,3600);
  if(error||!data){alert('Não foi possível abrir o arquivo.');return;}
  window.open(data.signedUrl,'_blank','noopener');
}

async function salvarManutencao(){
  const payload={loja:lojaAtual,tipo:manutencaoTipoAtual,data_manutencao:document.getElementById('man_data').value,item:document.getElementById('man_item').value.trim(),descricao:document.getElementById('man_descricao').value.trim(),fornecedor:document.getElementById('man_fornecedor').value.trim()||null,valor:Math.max(0,Number(document.getElementById('man_valor').value)||0),status:document.getElementById('man_status').value,proxima_data:document.getElementById('man_proxima_data').value||null,observacoes:document.getElementById('man_observacoes').value.trim()||null};
  const err=document.getElementById('manErr');
  if(!payload.data_manutencao||!payload.item||!payload.descricao){err.textContent='Informe a data, o item e a descrição da manutenção.';err.style.display='block';return;}
  const arquivo=document.getElementById('man_arquivo').files[0]||null;
  const validacao=dadosArquivoManutencao(arquivo);
  if(!validacao.ok){err.textContent=validacao.mensagem;err.style.display='block';return;}
  const tipoArquivo=validacao.tipo;
  const btn=document.getElementById('manSalvarBtn');btn.disabled=true;btn.textContent='Salvando…';
  let caminho=null;
  if(arquivo){
    caminho=lojaAtual+'/'+manutencaoTipoAtual+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,8)+'_'+nomeArquivoSeguro(arquivo.name);
    const {error:erroUpload}=await sb.storage.from('manutencoes').upload(caminho,arquivo,{contentType:tipoArquivo,upsert:false});
    if(erroUpload){btn.disabled=false;btn.textContent='Adicionar manutenção';err.textContent='Não foi possível enviar o arquivo: '+erroUpload.message;err.style.display='block';return;}
    payload.arquivo_nome=arquivo.name;payload.arquivo_tipo=tipoArquivo;payload.caminho_storage=caminho;
  }
  const {error}=await sb.from('manutencoes').insert(payload);
  btn.disabled=false;btn.textContent='Adicionar manutenção';
  if(error){if(caminho)await sb.storage.from('manutencoes').remove([caminho]);err.textContent='Não foi possível salvar. Execute o SQL atualizado do módulo de Manutenção no Supabase.';err.style.display='block';console.error(error);return;}
  limparFormularioManutencao();await carregarManutencoes();
}

function limparFormularioManutencao(){
  ['man_item','man_descricao','man_fornecedor','man_valor','man_proxima_data','man_observacoes','man_arquivo'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('man_data').value=todayStr();document.getElementById('man_status').value='realizada';document.getElementById('manErr').style.display='none';
}

async function excluirManutencao(id){
  manutencaoExcluindoId=id;
  const registro=manutencoesCache.find(x=>String(x.id)===String(id));
  document.getElementById('confirmManutencaoTexto').innerHTML=registro?`Você está prestes a excluir <strong>${escapeHtml(registro.item)}</strong>. O registro${registro.caminho_storage?' e o arquivo anexado':''} será apagado e essa ação não pode ser desfeita.`:'O registro será apagado. Essa ação não pode ser desfeita.';
  document.getElementById('confirmManutencaoModal').style.display='flex';
}

function fecharConfirmacaoManutencao(){document.getElementById('confirmManutencaoModal').style.display='none';manutencaoExcluindoId=null;}

async function confirmarExclusaoManutencaoOk(){
  if(manutencaoExcluindoId===null)return;
  const id=manutencaoExcluindoId;
  const registro=manutencoesCache.find(x=>String(x.id)===String(id));
  const btn=document.getElementById('manExcluirBtn');btn.disabled=true;btn.textContent='Excluindo…';
  const {error}=await sb.from('manutencoes').delete().eq('id',id).eq('loja',lojaAtual);
  btn.disabled=false;btn.textContent='Excluir manutenção';
  if(error){alert('Não foi possível excluir o registro.');return;}
  if(registro&&registro.caminho_storage)await sb.storage.from('manutencoes').remove([registro.caminho_storage]);
  manutencoesCache=manutencoesCache.filter(x=>String(x.id)!==String(id));
  fecharConfirmacaoManutencao();renderManutencoes();
}

function abrirEdicaoManutencao(id){
  const x=manutencoesCache.find(item=>String(item.id)===String(id));if(!x)return;
  manutencaoEditandoId=id;
  document.getElementById('eman_data').value=x.data_manutencao||'';
  document.getElementById('eman_item').value=x.item||'';
  document.getElementById('eman_status').value=x.status||'realizada';
  document.getElementById('eman_descricao').value=x.descricao||'';
  document.getElementById('eman_fornecedor').value=x.fornecedor||'';
  document.getElementById('eman_valor').value=Number(x.valor||0);
  document.getElementById('eman_proxima_data').value=x.proxima_data||'';
  document.getElementById('eman_observacoes').value=x.observacoes||'';
  document.getElementById('eman_arquivo').value='';
  document.getElementById('eman_remover_arquivo').checked=false;
  document.getElementById('eman_remover_arquivo').disabled=!x.caminho_storage;
  document.getElementById('emanArquivoAtual').textContent=x.caminho_storage?'Arquivo atual: '+(x.arquivo_nome||'comprovante'):'Nenhum arquivo anexado.';
  document.getElementById('emanErr').style.display='none';
  document.getElementById('manEditModal').style.display='flex';
}

function fecharEdicaoManutencao(){document.getElementById('manEditModal').style.display='none';manutencaoEditandoId=null;}

async function salvarEdicaoManutencao(){
  const atual=manutencoesCache.find(x=>String(x.id)===String(manutencaoEditandoId));if(!atual)return;
  const payload={data_manutencao:document.getElementById('eman_data').value,item:document.getElementById('eman_item').value.trim(),descricao:document.getElementById('eman_descricao').value.trim(),fornecedor:document.getElementById('eman_fornecedor').value.trim()||null,valor:Math.max(0,Number(document.getElementById('eman_valor').value)||0),status:document.getElementById('eman_status').value,proxima_data:document.getElementById('eman_proxima_data').value||null,observacoes:document.getElementById('eman_observacoes').value.trim()||null};
  const err=document.getElementById('emanErr');
  if(!payload.data_manutencao||!payload.item||!payload.descricao){err.textContent='Informe a data, o item e a descrição da manutenção.';err.style.display='block';return;}
  const arquivo=document.getElementById('eman_arquivo').files[0]||null;
  const remover=document.getElementById('eman_remover_arquivo').checked;
  const validacao=dadosArquivoManutencao(arquivo);
  if(!validacao.ok){err.textContent=validacao.mensagem;err.style.display='block';return;}
  const btn=document.getElementById('emanSalvarBtn');btn.disabled=true;btn.textContent='Salvando…';
  let novoCaminho=null;
  if(arquivo){
    novoCaminho=lojaAtual+'/'+manutencaoTipoAtual+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,8)+'_'+nomeArquivoSeguro(arquivo.name);
    const {error:erroUpload}=await sb.storage.from('manutencoes').upload(novoCaminho,arquivo,{contentType:validacao.tipo,upsert:false});
    if(erroUpload){btn.disabled=false;btn.textContent='Salvar alterações';err.textContent='Não foi possível enviar o arquivo: '+erroUpload.message;err.style.display='block';return;}
    payload.arquivo_nome=arquivo.name;payload.arquivo_tipo=validacao.tipo;payload.caminho_storage=novoCaminho;
  }else if(remover){payload.arquivo_nome=null;payload.arquivo_tipo=null;payload.caminho_storage=null;}
  const {data,error}=await sb.from('manutencoes').update(payload).eq('id',atual.id).eq('loja',lojaAtual).select().single();
  btn.disabled=false;btn.textContent='Salvar alterações';
  if(error){if(novoCaminho)await sb.storage.from('manutencoes').remove([novoCaminho]);err.textContent='Não foi possível salvar as alterações.';err.style.display='block';console.error(error);return;}
  if(atual.caminho_storage&&(arquivo||remover)&&atual.caminho_storage!==novoCaminho)await sb.storage.from('manutencoes').remove([atual.caminho_storage]);
  manutencoesCache=manutencoesCache.map(x=>String(x.id)===String(atual.id)?data:x);
  fecharEdicaoManutencao();renderManutencoes();
}

/* ================= DIFERENÇA DE CAIXA ================= */

let difColaboradores = [];
let difTipoAtual = 'falta';
let difCache = [];

async function abrirDiferencaCaixa(){
  await carregarDifColaboradores();
  if(!document.getElementById('dif_data').value){
    document.getElementById('dif_data').value = todayStr();
  }
  await carregarDiferencasCaixa();
}

async function carregarDifColaboradores(){
  const { data, error } = await sb.from('bh_funcionarios').select('*').eq('loja', lojaAtual).eq('ativo', true).order('nome');
  if(error){
    console.error('Erro ao carregar colaboradores:', error);
    difColaboradores = [];
  }else{
    difColaboradores = data || [];
  }
  const opcoes = difColaboradores.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');

  const sel = document.getElementById('dif_colaborador');
  const atual = sel.value;
  sel.innerHTML = '<option value="">Selecione</option>' + opcoes;
  sel.value = atual;

  const selEdit = document.getElementById('edif_colaborador');
  selEdit.innerHTML = '<option value="">Selecione</option>' + opcoes;

  const selFiltro = document.getElementById('difFiltroColaborador');
  const atualFiltro = selFiltro.value;
  selFiltro.innerHTML = '<option value="">Todos</option>' + opcoes;
  selFiltro.value = atualFiltro;
}

let difFiltroColaboradorId = '';
let difFiltroMesAtual = mesAtualPadrao();

function mudarFiltroDifMes(valor){
  difFiltroMesAtual = valor;
  renderDiferencasCaixa();
}

function mudarFiltroDifColaborador(id){
  difFiltroColaboradorId = id || '';
  renderDiferencasCaixa();
}

function setDifTipo(t){
  difTipoAtual = t;
  document.querySelectorAll('#difTipoToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipo===t));
}

function navegarDiferencaCaixa(event, etapa){
  if(etapa==='tipo'&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){
    event.preventDefault();
    const tipo=event.key==='ArrowRight'?'sobra':'falta';
    setDifTipo(tipo);
    document.querySelector('#difTipoToggle .tipo-btn[data-tipo="'+tipo+'"]').focus();
    return;
  }
  if(event.key!=='Enter')return;
  event.preventDefault();
  if(etapa==='colaborador') document.getElementById('dif_data').focus();
  else if(etapa==='data') document.querySelector('#difTipoToggle .tipo-btn.active').focus();
  else if(etapa==='tipo') document.getElementById('dif_valor').focus();
  else if(etapa==='valor') salvarDiferencaCaixa();
}

async function carregarDiferencasCaixa(){
  const { data, error } = await sb.from('caixa_diferencas').select('*').eq('loja', lojaAtual).order('data');
  if(error){
    console.error('Erro ao carregar diferenças de caixa:', error);
    difCache = [];
  }else{
    difCache = data || [];
  }
  popularFiltroDifMes();
  renderDiferencasCaixa();
}

function popularFiltroDifMes(){
  const mesesSet = new Set(difCache.map(d=>d.data.slice(0,7)));
  const hoje = new Date();
  mesesSet.add(hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0'));
  const lista = Array.from(mesesSet).sort().reverse();
  const sel = document.getElementById('difFiltroMes');
  const atual = difFiltroMesAtual || mesAtualPadrao();
  sel.innerHTML = '<option value="todos">Todos os meses</option>' + lista.map(chave=>{
    const [ano, mes] = chave.split('-');
    return `<option value="${chave}">${NOMES_MES[parseInt(mes,10)-1]} ${ano}</option>`;
  }).join('');
  sel.value = lista.includes(atual) || atual==='todos' ? atual : mesAtualPadrao();
  difFiltroMesAtual = sel.value;
}

async function salvarDiferencaCaixa(){
  const colabId = document.getElementById('dif_colaborador').value;
  const data = document.getElementById('dif_data').value;
  const valor = parseFloat(document.getElementById('dif_valor').value);
  const err = document.getElementById('difErr');

  if(!colabId || !data || isNaN(valor) || valor<=0){
    err.style.display = 'block';
    return false;
  }
  err.style.display = 'none';

  const colaborador = difColaboradores.find(f=>f.id===colabId);
  const { data: salvo, error } = await sb.from('caixa_diferencas').insert({
    loja: lojaAtual,
    funcionario_id: colabId,
    nome_colaborador: colaborador ? colaborador.nome : '—',
    data: data,
    tipo: difTipoAtual,
    valor: valor
  }).select().single();

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return false;
  }

  difCache.push(salvo);
  document.getElementById('dif_valor').value = '';
  document.getElementById('dif_colaborador').focus();
  renderDiferencasCaixa();
  return true;
}

function registrosExportacaoDiferencaCaixa(){
  let lista=[...difCache];
  if(difFiltroMesAtual&&difFiltroMesAtual!=='todos') lista=lista.filter(d=>String(d.data||'').slice(0,7)===difFiltroMesAtual);
  const escopo=document.getElementById('difExportarEscopo').value;
  if(escopo==='selecionado'){
    const id=document.getElementById('difFiltroColaborador').value;
    if(!id){alert('Selecione um colaborador no filtro antes de exportar.');return null;}
    lista=lista.filter(d=>String(d.funcionario_id)===String(id));
  }
  return lista.sort((a,b)=>String(a.data).localeCompare(String(b.data)));
}

function nomePeriodoDiferencaCaixa(){
  if(!difFiltroMesAtual||difFiltroMesAtual==='todos')return 'Todos os períodos';
  const p=difFiltroMesAtual.split('-');return (NOMES_MES[Number(p[1])-1]||p[1])+' de '+p[0];
}

function exportarExcelDiferencaCaixa(){
  const lista=registrosExportacaoDiferencaCaixa();if(!lista)return;
  if(!window.XLSX){alert('Recurso de Excel não carregado.');return;}
  const dados=lista.map(d=>({'Data':fmtData(d.data),'Colaborador(a)':d.nome_colaborador,'Tipo':d.tipo==='falta'?'Faltou':'Sobrou','Valor':Number(d.valor)||0}));
  const ws=XLSX.utils.json_to_sheet(dados);ws['!cols']=[{wch:13},{wch:28},{wch:12},{wch:14}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Diferença de Caixa');
  XLSX.writeFile(wb,'diferenca-caixa-'+(difFiltroMesAtual||'todos')+'.xlsx');
}

function exportarPdfDiferencaCaixa(){
  const lista=registrosExportacaoDiferencaCaixa();if(!lista)return;
  if(!window.jspdf||!window.jspdf.jsPDF){alert('Recurso de PDF não carregado.');return;}
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  const totalFalta=lista.filter(d=>d.tipo==='falta').reduce((s,d)=>s+Number(d.valor||0),0);
  const totalSobra=lista.filter(d=>d.tipo==='sobra').reduce((s,d)=>s+Number(d.valor||0),0);
  const id=document.getElementById('difExportarEscopo').value==='selecionado'?document.getElementById('difFiltroColaborador').value:'';
  const colab=difColaboradores.find(f=>String(f.id)===String(id));
  doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Diferença de Caixa',14,18);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text((NOMES_LOJA[lojaAtual]||lojaAtual)+' • '+nomePeriodoDiferencaCaixa()+(colab?' • '+colab.nome:''),14,25);
  doc.autoTable({startY:32,head:[['Data','Colaborador(a)','Tipo','Valor']],body:lista.map(d=>[fmtData(d.data),d.nome_colaborador,d.tipo==='falta'?'Faltou':'Sobrou',brl(d.valor)]),theme:'grid',styles:{fontSize:8.5},headStyles:{fillColor:[35,55,84]},columnStyles:{3:{halign:'right'}}});
  const y=doc.lastAutoTable.finalY+9;doc.setFont('helvetica','bold');doc.text('Total faltou: '+brl(totalFalta),14,y);doc.text('Total sobrou: '+brl(totalSobra),75,y);doc.text('Diferença líquida: '+brl(totalSobra-totalFalta),137,y);
  doc.save('diferenca-caixa-'+(difFiltroMesAtual||'todos')+'.pdf');
}

function renderDiferencasCaixa(){
  let ordenado = [...difCache].sort((a,b)=>{
    const chaveA = a.data + (a.criado_em||'');
    const chaveB = b.data + (b.criado_em||'');
    return chaveA.localeCompare(chaveB);
  });

  if(difFiltroColaboradorId){
    ordenado = ordenado.filter(d=>d.funcionario_id===difFiltroColaboradorId);
  }

  if(difFiltroMesAtual && difFiltroMesAtual !== 'todos'){
    ordenado = ordenado.filter(d=>d.data.slice(0,7) === difFiltroMesAtual);
  }

  const totalFalta = ordenado.filter(d=>d.tipo==='falta').reduce((s,d)=>s+Number(d.valor),0);
  const totalSobra = ordenado.filter(d=>d.tipo==='sobra').reduce((s,d)=>s+Number(d.valor),0);
  document.getElementById('difTotalFalta').textContent = brl(totalFalta);
  document.getElementById('difTotalSobra').textContent = brl(totalSobra);
  document.getElementById('difLiquida').textContent = brl(totalSobra - totalFalta);

  const body = document.getElementById('difBody');
  const empty = document.getElementById('difEmpty');
  if(ordenado.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = ordenado.map(d=>`
    <tr>
      <td class="data">${fmtData(d.data)}</td>
      <td class="contato">${escapeHtml(d.nome_colaborador)}</td>
      <td style="color:${d.tipo==='falta'?'var(--rust)':'var(--green)'};font-weight:600;">${d.tipo==='falta'?'Faltou':'Sobrou'}</td>
      <td class="valor">${brl(d.valor)}</td>
      <td><div class="rowactions">
        <button class="iconbtn edit" title="Editar" onclick="abrirEditarDiferenca('${d.id}')">✎</button>
        <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoDiferenca('${d.id}')">✕</button>
      </div></td>
    </tr>
  `).join('');
}

let editandoDiferencaId = null;
let edifTipoAtual = 'falta';

function setEdifTipo(t){
  edifTipoAtual = t;
  document.querySelectorAll('#edifTipoToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipo===t));
}

function abrirEditarDiferenca(id){
  const d = difCache.find(x=>x.id===id);
  if(!d) return;
  editandoDiferencaId = id;
  document.getElementById('edif_colaborador').value = d.funcionario_id || '';
  document.getElementById('edif_data').value = d.data;
  document.getElementById('edif_valor').value = d.valor;
  setEdifTipo(d.tipo);
  document.getElementById('edifErr').style.display = 'none';
  document.getElementById('editDifModal').style.display = 'flex';
}

function fecharEditarDiferenca(){
  document.getElementById('editDifModal').style.display = 'none';
  editandoDiferencaId = null;
}

async function salvarEdicaoDiferenca(){
  const colabId = document.getElementById('edif_colaborador').value;
  const data = document.getElementById('edif_data').value;
  const valor = parseFloat(document.getElementById('edif_valor').value);
  const err = document.getElementById('edifErr');

  if(!colabId || !data || isNaN(valor) || valor<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const colaborador = difColaboradores.find(f=>f.id===colabId);
  const btn = document.getElementById('edifSalvarBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const { data: atualizado, error } = await sb.from('caixa_diferencas').update({
    funcionario_id: colabId,
    nome_colaborador: colaborador ? colaborador.nome : '—',
    data: data,
    tipo: edifTipoAtual,
    valor: valor
  }).eq('id', editandoDiferencaId).select().single();

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  const idx = difCache.findIndex(d=>d.id===editandoDiferencaId);
  if(idx>-1) difCache[idx] = atualizado;
  renderDiferencasCaixa();
  fecharEditarDiferenca();
}

let excluindoDiferencaId = null;

function confirmarExclusaoDiferenca(id){
  excluindoDiferencaId = id;
  document.getElementById('confirmDiferencaModal').style.display = 'flex';
}

function fecharConfirmacaoDiferenca(){
  document.getElementById('confirmDiferencaModal').style.display = 'none';
  excluindoDiferencaId = null;
}

async function confirmarExclusaoDiferencaOk(){
  if(!excluindoDiferencaId) return;
  const { error } = await sb.from('caixa_diferencas').delete().eq('id', excluindoDiferencaId);
  if(!error){
    difCache = difCache.filter(d=>d.id!==excluindoDiferencaId);
    renderDiferencasCaixa();
  }
  fecharConfirmacaoDiferenca();
}

/* ================= VENDAS DELIVERY ================= */

let deliveryCache = [];
let deliveryImportacao = [];
let deliveryDuplicadosSelecao = 0;

function normalizarCabecalhoDelivery(valor){
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
}

function textoDelivery(valor, limite){
  if(valor===null || valor===undefined) return '';
  return String(valor).trim().slice(0, limite || 1000);
}

function normalizarTelefoneDelivery(valor){
  const original = textoDelivery(valor, 180);
  let numero = original.replace(/\D/g,'');
  if(numero.startsWith('55') && (numero.length===12 || numero.length===13)) numero = numero.slice(2);
  const valido = (numero.length===10 || numero.length===11) && !numero.startsWith('0800');
  return { original, normalizado: valido ? numero : null, valido };
}

function dataExcelDelivery(valor){
  if(valor instanceof Date && !isNaN(valor)){
    return valor.getFullYear() + '-' + String(valor.getMonth()+1).padStart(2,'0') + '-' + String(valor.getDate()).padStart(2,'0') + 'T' + String(valor.getHours()).padStart(2,'0') + ':' + String(valor.getMinutes()).padStart(2,'0') + ':' + String(valor.getSeconds()).padStart(2,'0');
  }
  if(typeof valor === 'number' && window.XLSX && XLSX.SSF){
    const p = XLSX.SSF.parse_date_code(valor);
    if(p) return String(p.y).padStart(4,'0') + '-' + String(p.m).padStart(2,'0') + '-' + String(p.d).padStart(2,'0') + 'T' + String(p.H||0).padStart(2,'0') + ':' + String(p.M||0).padStart(2,'0') + ':' + String(Math.floor(p.S||0)).padStart(2,'0');
  }
  const texto = textoDelivery(valor, 60);
  if(!texto) return null;
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(br) return br[3] + '-' + br[2].padStart(2,'0') + '-' + br[1].padStart(2,'0') + 'T' + String(br[4]||0).padStart(2,'0') + ':' + String(br[5]||0).padStart(2,'0') + ':' + String(br[6]||0).padStart(2,'0');
  const iso = texto.replace(' ', 'T').match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/);
  return iso ? iso[0].slice(0,19) : null;
}

function localizarCabecalhoDelivery(linhas){
  const maximo = Math.min(linhas.length, 30);
  for(let i=0;i<maximo;i++){
    const cab = (linhas[i] || []).map(normalizarCabecalhoDelivery);
    if(cab.includes('VENDA') && cab.includes('NOME') && cab.includes('DATA') && cab.includes('TELEFONE') && cab.includes('VALOR VENDA')) return { indice:i, cabecalho:cab };
  }
  return null;
}

async function onSelecionarArquivosDelivery(fileList){
  const arquivos = Array.from(fileList || []);
  if(!arquivos.length) return;
  const erroArquivos = validarListaArquivos(arquivos, 'planilha');
  if(erroArquivos){ alert(erroArquivos); document.getElementById('deliveryFileInput').value=''; return; }
  if(!window.XLSX){ alert('Não foi possível carregar o leitor de planilhas. Recarregue a página.'); return; }

  abrirProgresso('Lendo vendas delivery…');
  const unicas = new Map();
  const nomesArquivos = [];
  deliveryDuplicadosSelecao = 0;

  try{
    for(let a=0;a<arquivos.length;a++){
      const arquivo = arquivos[a];
      const wb = XLSX.read(await arquivo.arrayBuffer(), { type:'array', cellDates:false });
      let encontradosArquivo = 0;
      for(const nomeAba of wb.SheetNames){
        const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nomeAba], { header:1, raw:true, defval:'' });
        const achado = localizarCabecalhoDelivery(linhas);
        if(!achado) continue;
        const cab = achado.cabecalho;
        const indice = nome=>cab.indexOf(nome);
        const idxVenda = indice('VENDA');
        const idxNome = indice('NOME');
        const idxData = indice('DATA');
        const idxEndereco = indice('ENDERECO');
        const idxTelefone = indice('TELEFONE');
        const idxOrigem = indice('ORIGEM');
        const idxEntrega = indice('TIPO ENTREGA');
        const idxCobranca = indice('TIPO COBRANCA');
        const idxStatus = indice('STATUS');
        const idxValor = indice('VALOR VENDA');

        for(let i=achado.indice+1;i<linhas.length;i++){
          const linha = linhas[i] || [];
          const numero = parseNumeroVenda(linha[idxVenda]);
          const dataVenda = dataExcelDelivery(linha[idxData]);
          const valor = parseNumeroVenda(linha[idxValor]);
          if(numero===null || !dataVenda || valor===null) continue;
          const telefone = normalizarTelefoneDelivery(idxTelefone>=0 ? linha[idxTelefone] : '');
          const statusTexto = idxStatus>=0 ? textoDelivery(linha[idxStatus],80).toUpperCase() : '';
          const registro = {
            loja:lojaAtual,
            numero_venda:Math.trunc(numero),
            nome:idxNome>=0 ? textoDelivery(linha[idxNome],300) || null : null,
            data_venda:dataVenda,
            endereco:idxEndereco>=0 ? textoDelivery(linha[idxEndereco],1000) || null : null,
            telefone_original:telefone.original || null,
            telefone_normalizado:telefone.normalizado,
            telefone_valido:telefone.valido,
            origem:idxOrigem>=0 ? textoDelivery(linha[idxOrigem],80).toUpperCase() || null : null,
            tipo_entrega:idxEntrega>=0 ? textoDelivery(linha[idxEntrega],80).toUpperCase() || null : null,
            tipo_cobranca:idxCobranca>=0 ? textoDelivery(linha[idxCobranca],120).toUpperCase() || null : null,
            status:statusTexto || null,
            valor_venda:Number(valor.toFixed(2)),
            arquivo_origem:textoDelivery(arquivo.name,260)
          };
          const chave = String(registro.numero_venda);
          if(unicas.has(chave)) deliveryDuplicadosSelecao++;
          unicas.set(chave, registro);
          encontradosArquivo++;
        }
      }
      nomesArquivos.push(arquivo.name + ' (' + encontradosArquivo + ' venda(s))');
      atualizarProgresso(((a+1)/arquivos.length)*95);
    }
  }catch(erro){
    fecharProgresso();
    alert('Não foi possível ler a planilha: ' + (erro.message || erro));
    cancelarImportDelivery();
    return;
  }

  deliveryImportacao = Array.from(unicas.values());
  atualizarProgresso(100);
  setTimeout(fecharProgresso,200);
  if(!deliveryImportacao.length){
    alert('Não encontrei uma tabela com as colunas Venda, Nome, Data, Telefone e Valor Venda.');
    cancelarImportDelivery();
    return;
  }
  const ativas = deliveryImportacao.filter(v=>v.status==='VENDA ATIVA').length;
  const semStatus = deliveryImportacao.filter(v=>!v.status).length;
  const validos = deliveryImportacao.filter(v=>v.telefone_valido).length;
  document.getElementById('deliveryPreviewArquivos').textContent = nomesArquivos.join(' · ');
  document.getElementById('deliveryPrevTotal').textContent = deliveryImportacao.length;
  document.getElementById('deliveryPrevAtivas').textContent = ativas;
  document.getElementById('deliveryPrevSemStatus').textContent = semStatus;
  document.getElementById('deliveryPrevValidos').textContent = validos;
  document.getElementById('deliveryPrevInvalidos').textContent = deliveryImportacao.length-validos;
  document.getElementById('deliveryPreviewAviso').textContent = 'Todas as vendas serão salvas. As que não possuem celular válido entram nos totais, mas não formam um cliente no ranking.' + (deliveryDuplicadosSelecao ? ' ' + deliveryDuplicadosSelecao + ' venda(s) repetida(s) dentro dos arquivos foram unificadas.' : '');
  document.getElementById('deliveryPreviewWrap').style.display='block';
}

function cancelarImportDelivery(){
  deliveryImportacao=[];
  deliveryDuplicadosSelecao=0;
  const input=document.getElementById('deliveryFileInput');
  if(input) input.value='';
  document.getElementById('deliveryPreviewWrap').style.display='none';
}

async function confirmarImportDelivery(){
  if(!deliveryImportacao.length) return;
  const btn=document.getElementById('deliveryImportConfirmBtn');
  btn.disabled=true;
  btn.textContent='Importando…';
  abrirProgresso('Salvando vendas delivery…');
  let inseridas=0;
  try{
    const tamanho=250;
    for(let i=0;i<deliveryImportacao.length;i+=tamanho){
      const lote=deliveryImportacao.slice(i,i+tamanho);
      const {data,error}=await sb.from('vendas_delivery').upsert(lote,{onConflict:'loja,numero_venda',ignoreDuplicates:true}).select('id');
      if(error) throw error;
      inseridas+=(data||[]).length;
      atualizarProgresso(Math.min(100,((i+lote.length)/deliveryImportacao.length)*100));
    }
    const ignoradas=deliveryImportacao.length-inseridas;
    cancelarImportDelivery();
    await popularFiltroMesDelivery();
    await carregarDelivery();
    fecharProgresso();
    alert(inseridas + ' venda(s) importada(s).' + (ignoradas>0 ? ' ' + ignoradas + ' já existiam e não foram duplicadas.' : ''));
  }catch(erro){
    fecharProgresso();
    const detalhe=String(erro.message||erro);
    alert((detalhe.includes('vendas_delivery') ? 'A tabela do módulo ainda não existe. Execute primeiro o arquivo SQL no Supabase.\n\n' : 'Erro ao importar: ') + detalhe);
  }finally{
    btn.disabled=false;
    btn.textContent='Confirmar importação';
  }
}

async function popularFiltroMesDelivery(){
  const {data,error}=await buscarTodasLinhas((from,to)=>sb.from('vendas_delivery').select('data_venda').eq('loja',lojaAtual).order('data_venda',{ascending:false}).range(from,to));
  if(error){ console.error('Erro ao carregar meses do delivery:',error); return []; }
  const conjunto=new Set((data||[]).map(v=>String(v.data_venda).slice(0,7)).filter(Boolean));
  conjunto.add(mesAtualPadrao());
  const meses=Array.from(conjunto).sort().reverse();
  const sel=document.getElementById('deliveryFiltroMes');
  const anterior=sel.value||'todos';
  sel.innerHTML='<option value="todos">Todos os meses</option>'+meses.map(chave=>{
    const partes=chave.split('-');
    return `<option value="${chave}">${NOMES_MES[Number(partes[1])-1]} ${partes[0]}</option>`;
  }).join('');
  sel.value=meses.includes(anterior)||anterior==='todos'?anterior:(meses[0]||'todos');
  return meses;
}

function mudarMesDelivery(valor){
  if(valor==='todos'){
    document.getElementById('deliveryFiltroDe').value='';
    document.getElementById('deliveryFiltroAte').value='';
  }else{
    const partes=valor.split('-');
    const ultimo=new Date(Number(partes[0]),Number(partes[1]),0).getDate();
    document.getElementById('deliveryFiltroDe').value=valor+'-01';
    document.getElementById('deliveryFiltroAte').value=valor+'-'+String(ultimo).padStart(2,'0');
  }
  carregarDelivery();
}

async function abrirVendasDelivery(){
  await popularFiltroMesDelivery();
  const sel=document.getElementById('deliveryFiltroMes');
  sel.value=mesAtualPadrao();
  mudarMesDelivery(mesAtualPadrao());
}

async function carregarDelivery(){
  const {data,error}=await buscarTodasLinhas((from,to)=>sb.from('vendas_delivery').select('*').eq('loja',lojaAtual).order('data_venda',{ascending:false}).range(from,to));
  if(error){
    console.error('Erro ao carregar vendas delivery:',error);
    deliveryCache=[];
    renderDelivery();
    if(String(error.message||'').includes('vendas_delivery')) alert('Execute o arquivo modulo_vendas_delivery_supabase.sql no Supabase para ativar este módulo.');
    return;
  }
  deliveryCache=(data||[]).map(v=>({...v,valor_venda:Number(v.valor_venda)||0}));
  renderDelivery();
}

function dataSomenteDelivery(valor){ return String(valor||'').slice(0,10); }

function statusDelivery(valor){
  const status=String(valor||'').trim().toUpperCase();
  if(!status) return 'sem_status';
  if(status==='VENDA ATIVA') return 'ativa';
  return 'outros';
}

function rotuloStatusDelivery(valor){ return valor ? String(valor) : 'SEM OBSERVAÇÃO'; }

function formatarTelefoneDelivery(numero){
  const n=String(numero||'');
  if(n.length===11) return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7);
  if(n.length===10) return '('+n.slice(0,2)+') '+n.slice(2,6)+'-'+n.slice(6);
  return n||'—';
}

function dataHoraDelivery(valor){
  const t=String(valor||'');
  if(!t) return '—';
  const data=t.slice(0,10);
  const hora=t.slice(11,16);
  return fmtData(data)+(hora ? ' '+hora : '');
}

function diasDesdeDelivery(valor){
  const data=new Date(dataSomenteDelivery(valor)+'T12:00:00');
  if(isNaN(data)) return 0;
  const hoje=new Date(); hoje.setHours(12,0,0,0);
  return Math.max(0,Math.floor((hoje-data)/86400000));
}

function vendasDeliveryDoPeriodo(){
  const de=document.getElementById('deliveryFiltroDe').value;
  const ate=document.getElementById('deliveryFiltroAte').value;
  const filtroStatus=document.getElementById('deliveryFiltroStatus').value;
  const origem=document.getElementById('deliveryFiltroOrigem').value;
  return deliveryCache.filter(v=>{
    const data=dataSomenteDelivery(v.data_venda);
    if(de && data<de) return false;
    if(ate && data>ate) return false;
    if(filtroStatus!=='todos' && statusDelivery(v.status)!==filtroStatus) return false;
    if(origem!=='todos' && String(v.origem||'').toUpperCase()!==origem) return false;
    return true;
  });
}

function agruparClientesDelivery(vendas){
  const grupos=new Map();
  const ultimaGlobal=new Map();
  deliveryCache.forEach(v=>{
    const chave=chaveClienteDelivery(v);
    if(chave && (!ultimaGlobal.has(chave)||String(v.data_venda)>String(ultimaGlobal.get(chave)))) ultimaGlobal.set(chave,v.data_venda);
  });
  vendas.forEach(v=>{
    const chave=chaveClienteDelivery(v);
    if(!chave) return;
    const porTelefone=chave.startsWith('tel:');
    if(!grupos.has(chave)) grupos.set(chave,{chave,telefone:porTelefone?v.telefone_normalizado:null,tipoIdentificacao:porTelefone?'telefone':'ifood_nome',pedidos:0,total:0,vendas:[],nome:'Cliente',endereco:'',ultimaPeriodo:null,ultimaGlobal:ultimaGlobal.get(chave)||v.data_venda});
    const g=grupos.get(chave);
    g.pedidos++;
    g.total+=Number(v.valor_venda)||0;
    g.vendas.push(v);
    if(!g.ultimaPeriodo||String(v.data_venda)>String(g.ultimaPeriodo)){
      g.ultimaPeriodo=v.data_venda;
      g.nome=v.nome||'Cliente';
      g.endereco=v.endereco||'';
      g.telefoneOriginal=v.telefone_original||g.telefone||'';
    }
  });
  return Array.from(grupos.values()).map(g=>({...g,ticket:g.pedidos?g.total/g.pedidos:0,diasSemComprar:diasDesdeDelivery(g.ultimaGlobal)}));
}

function chaveClienteDelivery(venda){
  if(venda.telefone_valido && venda.telefone_normalizado) return 'tel:'+venda.telefone_normalizado;
  if(String(venda.origem||'').toUpperCase()==='IFOOD'){
    const nome=normalizarCabecalhoDelivery(venda.nome).replace(/[^A-Z0-9 ]/g,'').replace(/\s+/g,' ').trim();
    if(nome && nome!=='CLIENTE') return 'ifood:'+nome;
  }
  return null;
}

function dadosRelatorioDelivery(){
  const vendas=vendasDeliveryDoPeriodo();
  const gruposTodos=agruparClientesDelivery(vendas);
  const busca=document.getElementById('deliveryBusca').value.trim().toLowerCase();
  const buscaDigitos=busca.replace(/\D/g,'');
  const recorrencia=document.getElementById('deliveryFiltroRecorrencia').value;
  let grupos=gruposTodos.filter(g=>{
    if(busca){
      const alvo=[g.nome,g.telefone||'',g.telefoneOriginal||'',g.endereco].join(' ').toLowerCase();
      if(!alvo.includes(busca) && !(buscaDigitos && g.telefone && g.telefone.includes(buscaDigitos))) return false;
    }
    if(recorrencia==='uma' && g.pedidos!==1) return false;
    if(recorrencia==='duas' && g.pedidos<2) return false;
    if(recorrencia==='tres' && g.pedidos<3) return false;
    if(recorrencia==='inativo30' && g.diasSemComprar<30) return false;
    if(recorrencia==='inativo60' && g.diasSemComprar<60) return false;
    if(recorrencia==='inativo90' && g.diasSemComprar<90) return false;
    return true;
  });
  const ordem=document.getElementById('deliveryOrdenacao').value;
  grupos.sort((a,b)=>ordem==='valor' ? b.total-a.total : ordem==='recente' ? String(b.ultimaGlobal).localeCompare(String(a.ultimaGlobal)) : (b.pedidos-a.pedidos)||(b.total-a.total));
  return {vendas,gruposTodos,grupos};
}

function renderDelivery(){
  const relatorio=dadosRelatorioDelivery();
  const vendas=relatorio.vendas;
  const gruposTodos=relatorio.gruposTodos;
  const grupos=relatorio.grupos;
  const valorTotal=vendas.reduce((s,v)=>s+(Number(v.valor_venda)||0),0);
  const semCelular=vendas.filter(v=>!v.telefone_valido).length;
  document.getElementById('deliveryTotalPedidos').textContent=vendas.length;
  document.getElementById('deliveryValorVendido').textContent=brl(valorTotal);
  document.getElementById('deliveryTotalClientes').textContent=gruposTodos.length;
  document.getElementById('deliveryClientesRecorrentes').textContent=gruposTodos.filter(g=>g.pedidos>=2).length;
  document.getElementById('deliveryTicketMedio').textContent=brl(vendas.length?valorTotal/vendas.length:0);
  document.getElementById('deliverySemCelular').textContent=semCelular;

  const body=document.getElementById('deliveryRankingBody');
  body.innerHTML=grupos.map((g,i)=>`<tr class="delivery-ranking-row" onclick="abrirHistoricoDelivery('${g.chave}')">
    <td>${i+1}</td><td><strong>${escapeHtml(g.nome)}</strong><br><span style="font-size:11px;color:var(--muted);">${escapeHtml(g.endereco||'')}</span></td>
    <td class="delivery-phone">${g.tipoIdentificacao==='telefone' ? formatarTelefoneDelivery(g.telefone) : '<span class="delivery-badge">iFood · pelo nome</span>'}</td><td style="text-align:right;font-family:var(--font-mono);">${g.pedidos}</td>
    <td style="text-align:right;font-family:var(--font-mono);font-weight:600;">${brl(g.total)}</td><td style="text-align:right;font-family:var(--font-mono);">${brl(g.ticket)}</td>
    <td>${dataHoraDelivery(g.ultimaGlobal)}</td><td>${g.diasSemComprar} dia(s)</td></tr>`).join('');
  document.getElementById('deliveryEmpty').style.display=grupos.length?'none':'block';
}

function periodoRelatorioDelivery(vendas){
  const datas=vendas.map(v=>dataSomenteDelivery(v.data_venda)).filter(Boolean).sort();
  if(!datas.length) return 'Sem dados';
  return datas[0]===datas[datas.length-1] ? fmtData(datas[0]) : fmtData(datas[0])+' a '+fmtData(datas[datas.length-1]);
}

function filtrosRelatorioDelivery(){
  const status=document.getElementById('deliveryFiltroStatus');
  const origem=document.getElementById('deliveryFiltroOrigem');
  const clientes=document.getElementById('deliveryFiltroRecorrencia');
  const busca=document.getElementById('deliveryBusca').value.trim();
  return 'Status: '+status.options[status.selectedIndex].text+' · Origem: '+origem.options[origem.selectedIndex].text+' · Clientes: '+clientes.options[clientes.selectedIndex].text+(busca?' · Busca: '+busca:'');
}

function nomeArquivoRelatorioDelivery(extensao){
  const loja=(NOMES_LOJA[lojaAtual]||'loja').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return 'vendas-delivery-'+loja+'-'+new Date().toISOString().slice(0,10)+'.'+extensao;
}

function exportarExcelDelivery(){
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const relatorio=dadosRelatorioDelivery();
  if(!relatorio.vendas.length){ alert('Não há vendas delivery para exportar com os filtros atuais.'); return; }
  const vendas=relatorio.vendas;
  const grupos=relatorio.grupos;
  const gruposTodos=relatorio.gruposTodos;
  const valorTotal=vendas.reduce((s,v)=>s+(Number(v.valor_venda)||0),0);
  const recorrentes=gruposTodos.filter(g=>g.pedidos>=2).length;
  const semCelular=vendas.filter(v=>!v.telefone_valido).length;
  const agora=new Date();
  const resumo=[
    ['Vendas Delivery — '+(NOMES_LOJA[lojaAtual]||'')],
    ['Período: '+periodoRelatorioDelivery(vendas)],
    [filtrosRelatorioDelivery()],
    ['Gerado em: '+fmtData(agora.toISOString().slice(0,10))+' '+agora.toTimeString().slice(0,5)],
    [],
    ['INDICADORES'],
    ['Vendas','Valor vendido','Clientes identificados','Clientes recorrentes','Ticket médio','Sem celular válido'],
    [vendas.length,valorTotal,gruposTodos.length,recorrentes,vendas.length?valorTotal/vendas.length:0,semCelular],
    [],
    ['RANKING DE CLIENTES'],
    ['Posição','Cliente','Identificação','Pedidos','Total comprado','Ticket médio','Última compra','Dias sem comprar'],
    ...grupos.map((g,i)=>[i+1,g.nome,g.tipoIdentificacao==='telefone'?formatarTelefoneDelivery(g.telefone):'iFood - pelo nome',g.pedidos,g.total,g.ticket,dataHoraDelivery(g.ultimaGlobal),g.diasSemComprar])
  ];
  const abaResumo=XLSX.utils.aoa_to_sheet(resumo);
  abaResumo['!cols']=[{wch:10},{wch:30},{wch:24},{wch:12},{wch:18},{wch:16},{wch:20},{wch:18}];
  if(abaResumo['B8']) abaResumo['B8'].z='"R$" #,##0.00';
  if(abaResumo['E8']) abaResumo['E8'].z='"R$" #,##0.00';
  for(let linha=12;linha<12+grupos.length;linha++){
    if(abaResumo['E'+linha]) abaResumo['E'+linha].z='"R$" #,##0.00';
    if(abaResumo['F'+linha]) abaResumo['F'+linha].z='"R$" #,##0.00';
  }

  const detalhes=[['Data','Venda','Cliente','Telefone informado','Identificação','Endereço','Origem','Tipo de entrega','Cobrança','Status','Valor da venda']];
  vendas.slice().sort((a,b)=>String(a.data_venda).localeCompare(String(b.data_venda))).forEach(v=>{
    const chave=chaveClienteDelivery(v);
    detalhes.push([dataHoraDelivery(v.data_venda),v.numero_venda,v.nome||'Cliente',v.telefone_original||'',chave?(chave.startsWith('tel:')?'Telefone':'iFood - pelo nome'):'Não identificado',v.endereco||'',v.origem||'',v.tipo_entrega||'',v.tipo_cobranca||'',rotuloStatusDelivery(v.status),Number(v.valor_venda)||0]);
  });
  const abaDetalhes=XLSX.utils.aoa_to_sheet(detalhes);
  abaDetalhes['!cols']=[{wch:20},{wch:12},{wch:30},{wch:28},{wch:20},{wch:45},{wch:14},{wch:18},{wch:18},{wch:18},{wch:16}];
  abaDetalhes['!autofilter']={ref:'A1:K'+detalhes.length};
  for(let linha=2;linha<=detalhes.length;linha++) if(abaDetalhes['K'+linha]) abaDetalhes['K'+linha].z='"R$" #,##0.00';

  const livro=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro,abaResumo,'Resumo e Ranking');
  XLSX.utils.book_append_sheet(livro,abaDetalhes,'Vendas detalhadas');
  XLSX.writeFile(livro,nomeArquivoRelatorioDelivery('xlsx'));
}

function exportarPdfDelivery(){
  if(!window.jspdf||!window.jspdf.jsPDF){ alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.'); return; }
  const relatorio=dadosRelatorioDelivery();
  if(!relatorio.vendas.length){ alert('Não há vendas delivery para exportar com os filtros atuais.'); return; }
  const vendas=relatorio.vendas;
  const grupos=relatorio.grupos;
  const gruposTodos=relatorio.gruposTodos;
  const valorTotal=vendas.reduce((s,v)=>s+(Number(v.valor_venda)||0),0);
  const recorrentes=gruposTodos.filter(g=>g.pedidos>=2).length;
  const semCelular=vendas.filter(v=>!v.telefone_valido).length;
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF('l');
  doc.setFontSize(16);
  doc.text('Vendas Delivery — '+(NOMES_LOJA[lojaAtual]||''),14,16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Período: '+periodoRelatorioDelivery(vendas),14,23);
  doc.text(filtrosRelatorioDelivery(),14,28);
  doc.autoTable({
    startY:33,
    head:[['Vendas','Valor vendido','Clientes','Recorrentes','Ticket médio','Sem celular válido']],
    body:[[vendas.length,brl(valorTotal),gruposTodos.length,recorrentes,brl(vendas.length?valorTotal/vendas.length:0),semCelular]],
    styles:{fontSize:9,cellPadding:3,halign:'center'},
    headStyles:{fillColor:[38,51,43]}
  });
  const inicio=(doc.lastAutoTable?doc.lastAutoTable.finalY:45)+8;
  if(grupos.length){
    doc.autoTable({
      startY:inicio,
      head:[['#','Cliente','Identificação','Pedidos','Total','Ticket médio','Última compra','Dias sem comprar']],
      body:grupos.map((g,i)=>[i+1,g.nome,g.tipoIdentificacao==='telefone'?formatarTelefoneDelivery(g.telefone):'iFood - pelo nome',g.pedidos,brl(g.total),brl(g.ticket),dataHoraDelivery(g.ultimaGlobal),g.diasSemComprar]),
      styles:{fontSize:7.5,cellPadding:2.3},
      headStyles:{fillColor:[38,51,43]},
      columnStyles:{0:{halign:'center',cellWidth:10},3:{halign:'right',cellWidth:18},4:{halign:'right',cellWidth:27},5:{halign:'right',cellWidth:27},7:{halign:'center',cellWidth:25}}
    });
  }else{
    doc.setTextColor(80);
    doc.text('Nenhum cliente identificado para o ranking com os filtros atuais.',14,inicio);
  }
  doc.save(nomeArquivoRelatorioDelivery('pdf'));
}

function limparFiltrosDelivery(){
  document.getElementById('deliveryFiltroMes').value='todos';
  document.getElementById('deliveryFiltroDe').value='';
  document.getElementById('deliveryFiltroAte').value='';
  document.getElementById('deliveryFiltroStatus').value='todos';
  document.getElementById('deliveryFiltroOrigem').value='todos';
  document.getElementById('deliveryFiltroRecorrencia').value='todos';
  document.getElementById('deliveryOrdenacao').value='pedidos';
  document.getElementById('deliveryBusca').value='';
  renderDelivery();
}

let deliveryExclusaoTipo='periodo';

async function abrirExclusaoDelivery(tipo){
  deliveryExclusaoTipo=tipo==='tudo'?'tudo':'periodo';
  const periodo=document.getElementById('excluirDeliveryPeriodo');
  const loja=NOMES_LOJA[lojaAtual]||'loja atual';
  document.getElementById('excluirDeliveryConfirmacao').value='';
  document.getElementById('excluirDeliveryErro').style.display='none';
  if(deliveryExclusaoTipo==='tudo'){
    document.getElementById('excluirDeliveryTitulo').textContent='Excluir todas as vendas delivery';
    document.getElementById('excluirDeliveryDescricao').textContent='Serão excluídas somente as vendas delivery da '+loja+'. Os dados das outras lojas e dos outros módulos não serão alterados.';
    periodo.style.display='none';
  }else{
    document.getElementById('excluirDeliveryTitulo').textContent='Excluir vendas delivery por período';
    document.getElementById('excluirDeliveryDescricao').textContent='Escolha o período que foi importado na loja errada. A exclusão será feita somente na '+loja+'.';
    periodo.style.display='flex';
    document.getElementById('excluirDeliveryDe').value=document.getElementById('deliveryFiltroDe').value||'';
    document.getElementById('excluirDeliveryAte').value=document.getElementById('deliveryFiltroAte').value||'';
  }
  document.getElementById('excluirDeliveryModal').style.display='flex';
  await atualizarContagemExclusaoDelivery();
}

function fecharExclusaoDelivery(){
  document.getElementById('excluirDeliveryModal').style.display='none';
}

async function atualizarContagemExclusaoDelivery(){
  const info=document.getElementById('excluirDeliveryContagem');
  if(deliveryExclusaoTipo==='periodo'){
    const de=document.getElementById('excluirDeliveryDe').value;
    const ate=document.getElementById('excluirDeliveryAte').value;
    if(!de||!ate){ info.textContent='Informe a data inicial e a data final.'; return; }
    if(de>ate){ info.textContent='A data inicial não pode ser maior que a data final.'; return; }
  }
  info.textContent='Contando vendas…';
  let consulta=sb.from('vendas_delivery').select('id',{count:'exact',head:true}).eq('loja',lojaAtual);
  if(deliveryExclusaoTipo==='periodo'){
    consulta=consulta.gte('data_venda',document.getElementById('excluirDeliveryDe').value+'T00:00:00').lte('data_venda',document.getElementById('excluirDeliveryAte').value+'T23:59:59.999');
  }
  const {count,error}=await consulta;
  info.textContent=error?'Não foi possível contar as vendas.':(count||0)+' venda(s) serão excluída(s).';
}

async function confirmarExclusaoDelivery(){
  const erro=document.getElementById('excluirDeliveryErro');
  erro.style.display='none';
  if(document.getElementById('excluirDeliveryConfirmacao').value.trim().toUpperCase()!=='APAGAR'){
    erro.textContent='Digite APAGAR para confirmar.';
    erro.style.display='block';
    return;
  }
  let de='',ate='';
  if(deliveryExclusaoTipo==='periodo'){
    de=document.getElementById('excluirDeliveryDe').value;
    ate=document.getElementById('excluirDeliveryAte').value;
    if(!de||!ate||de>ate){
      erro.textContent='Informe um período válido.';
      erro.style.display='block';
      return;
    }
  }
  const btn=document.getElementById('excluirDeliveryBtn');
  btn.disabled=true;
  btn.textContent='Excluindo…';
  let consulta=sb.from('vendas_delivery').delete().eq('loja',lojaAtual);
  if(deliveryExclusaoTipo==='periodo') consulta=consulta.gte('data_venda',de+'T00:00:00').lte('data_venda',ate+'T23:59:59.999');
  const {error}=await consulta;
  btn.disabled=false;
  btn.textContent='Excluir vendas';
  if(error){
    erro.textContent='Erro ao excluir: '+error.message;
    erro.style.display='block';
    return;
  }
  fecharExclusaoDelivery();
  await popularFiltroMesDelivery();
  await carregarDelivery();
  alert(deliveryExclusaoTipo==='tudo'?'Todas as vendas delivery da loja atual foram excluídas.':'As vendas delivery do período foram excluídas.');
}

function abrirHistoricoDelivery(chave){
  const vendas=deliveryCache.filter(v=>chaveClienteDelivery(v)===chave).sort((a,b)=>String(b.data_venda).localeCompare(String(a.data_venda)));
  if(!vendas.length) return;
  const recente=vendas[0];
  const antiga=vendas[vendas.length-1];
  const total=vendas.reduce((s,v)=>s+(Number(v.valor_venda)||0),0);
  document.getElementById('deliveryHistoricoTitulo').textContent=recente.nome||'Cliente delivery';
  const identificacao=chave.startsWith('tel:') ? formatarTelefoneDelivery(recente.telefone_normalizado) : 'Cliente identificado pelo nome no iFood';
  document.getElementById('deliveryHistoricoContato').textContent=identificacao+(recente.endereco?' · '+recente.endereco:'');
  document.getElementById('deliveryHistPedidos').textContent=vendas.length;
  document.getElementById('deliveryHistTotal').textContent=brl(total);
  document.getElementById('deliveryHistPrimeira').textContent=dataHoraDelivery(antiga.data_venda);
  document.getElementById('deliveryHistUltima').textContent=dataHoraDelivery(recente.data_venda);
  document.getElementById('deliveryHistoricoBody').innerHTML=vendas.map(v=>{
    const tipo=statusDelivery(v.status);
    const classe=tipo==='ativa'?'ativa':tipo==='sem_status'?'sem-status':'';
    return `<tr><td>${dataHoraDelivery(v.data_venda)}</td><td>${escapeHtml(String(v.numero_venda))}</td><td><span class="delivery-badge ${classe}">${escapeHtml(rotuloStatusDelivery(v.status))}</span></td><td>${escapeHtml(v.origem||'—')}</td><td>${escapeHtml(v.tipo_entrega||'—')}</td><td>${escapeHtml(v.endereco||'—')}</td><td style="text-align:right;font-family:var(--font-mono);font-weight:600;">${brl(v.valor_venda)}</td></tr>`;
  }).join('');
  document.getElementById('deliveryHistoricoModal').style.display='flex';
}

function fecharHistoricoDelivery(){ document.getElementById('deliveryHistoricoModal').style.display='none'; }

/* ================= VENDAS COM CUSTO ================= */

let vendasCache = [];
let vendasArquivosParsed = [];

async function confirmarApagarTudoHoras(){
  if(!bhFuncionarioAtualId){
    alert('Selecione um funcionário primeiro.');
    return;
  }
  const f = bhFuncionarios.find(x=>x.id===bhFuncionarioAtualId);
  const { count } = await sb.from('bh_registros').select('id', { count: 'exact', head: true }).eq('funcionario_id', bhFuncionarioAtualId);
  document.getElementById('apagarHorasQtd').textContent = (count || 0) + ' registro(s)';
  document.getElementById('apagarHorasNome').textContent = f ? f.nome : '';
  document.getElementById('apagarHorasConfirmTexto').value = '';
  document.getElementById('confirmApagarHorasModal').style.display = 'flex';
}

function fecharApagarHorasModal(){
  document.getElementById('confirmApagarHorasModal').style.display = 'none';
}

async function confirmarApagarTudoHorasOk(){
  const texto = document.getElementById('apagarHorasConfirmTexto').value.trim().toUpperCase();
  if(texto !== 'APAGAR'){
    alert('Digite exatamente "APAGAR" (em maiúsculas) para confirmar.');
    return;
  }

  const { error } = await sb.from('bh_registros').delete().eq('funcionario_id', bhFuncionarioAtualId);
  fecharApagarHorasModal();

  if(error){
    alert('Erro ao apagar: ' + error.message);
    return;
  }

  bhRegistros = [];
  renderBancoHoras();
  alert('Todos os registros de ponto desse colaborador foram apagados.');
}

function abrirApagarDiaVendas(){
  document.getElementById('apagarDiaVendas_data').value = '';
  document.getElementById('apagarDiaVendasInfo').textContent = '';
  document.getElementById('apagarDiaVendasErr').style.display = 'none';
  document.getElementById('apagarDiaVendasModal').style.display = 'flex';
}

function fecharApagarDiaVendas(){
  document.getElementById('apagarDiaVendasModal').style.display = 'none';
}

document.addEventListener('change', async (e)=>{
  if(e.target && e.target.id === 'apagarDiaVendas_data'){
    const data = e.target.value;
    const info = document.getElementById('apagarDiaVendasInfo');
    if(!data){ info.textContent = ''; return; }
    const { count } = await sb.from('vendas_itens').select('id', { count: 'exact', head: true }).eq('loja', lojaAtual).eq('data', data);
    info.textContent = (count || 0) + ' item(ns) de venda encontrados nesse dia.';
  }
});

async function confirmarApagarDiaVendas(){
  const data = document.getElementById('apagarDiaVendas_data').value;
  const err = document.getElementById('apagarDiaVendasErr');
  if(!data){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const { error } = await sb.from('vendas_itens').delete().eq('loja', lojaAtual).eq('data', data);
  fecharApagarDiaVendas();

  if(error){
    alert('Erro ao apagar: ' + error.message);
    return;
  }

  await popularFiltroMesVendas();
  await carregarVendas();
  await atualizarUltimoDiaVendas();
  abrirResultadoExclusaoVendas(data);
}

function abrirResultadoExclusaoVendas(data){
  document.getElementById('vendasExclusaoSucessoTexto').textContent='As vendas do dia '+fmtData(data)+' foram apagadas com sucesso e os indicadores já estão atualizados.';
  document.getElementById('vendasExclusaoSucessoModal').style.display='flex';
}

function fecharResultadoExclusaoVendas(){document.getElementById('vendasExclusaoSucessoModal').style.display='none';}

async function confirmarApagarTudoVendas(){
  const { count } = await sb.from('vendas_itens').select('id', { count: 'exact', head: true }).eq('loja', lojaAtual);
  document.getElementById('apagarVendasQtd').textContent = (count || 0) + ' lançamento(s)';
  document.getElementById('apagarVendasLoja').textContent = NOMES_LOJA[lojaAtual] || '';
  document.getElementById('apagarVendasConfirmTexto').value = '';
  document.getElementById('confirmApagarVendasModal').style.display = 'flex';
}

function fecharApagarVendasModal(){
  document.getElementById('confirmApagarVendasModal').style.display = 'none';
}

async function confirmarApagarTudoVendasOk(){
  const texto = document.getElementById('apagarVendasConfirmTexto').value.trim().toUpperCase();
  if(texto !== 'APAGAR'){
    alert('Digite exatamente "APAGAR" (em maiúsculas) para confirmar.');
    return;
  }

  const { error } = await sb.from('vendas_itens').delete().eq('loja', lojaAtual);
  fecharApagarVendasModal();

  if(error){
    alert('Erro ao apagar: ' + error.message);
    return;
  }

  await popularFiltroMesVendas();
  await carregarVendas();
  await atualizarUltimoDiaVendas();
  alert('Todos os lançamentos de Vendas com Custo dessa loja foram apagados.');
}

async function abrirVendas(){
  await popularFiltroMesVendas();
  const mesAtual = new Date().toISOString().slice(0,7);
  document.getElementById('vendasFiltroMes').value = mesAtual;
  mudarMesVendas(mesAtual);
  await atualizarUltimoDiaVendas();
}

async function atualizarUltimoDiaVendas(){
  const { data, error } = await sb.from('vendas_itens')
    .select('data')
    .eq('loja', lojaAtual)
    .order('data', { ascending: false })
    .limit(1);

  const elUltimo = document.getElementById('vendasUltimoDia');
  const elProximo = document.getElementById('vendasProximoDia');

  if(error || !data || data.length===0){
    elUltimo.textContent = 'nenhum ainda';
    elProximo.textContent = '—';
    return;
  }

  const ultimaData = data[0].data;
  elUltimo.textContent = fmtData(ultimaData);

  const proximo = new Date(ultimaData + 'T12:00:00');
  proximo.setDate(proximo.getDate() + 1);
  const proximoStr = proximo.toISOString().slice(0,10);
  elProximo.textContent = fmtData(proximoStr);
}

async function buscarTodasLinhas(construirQuery){
  const tamanho = 1000;
  const LOTE_PARALELO = 5;

  const primeira = await construirQuery(0, tamanho - 1);
  if(primeira.error) return { data: null, error: primeira.error };
  let todos = primeira.data || [];
  if(todos.length < tamanho) return { data: todos, error: null };

  let pagina = 1;
  while(true){
    const promessas = [];
    for(let i=0; i<LOTE_PARALELO; i++){
      const p = pagina + i;
      const from = p * tamanho;
      const to = from + tamanho - 1;
      promessas.push(construirQuery(from, to));
    }
    const resultados = await Promise.all(promessas);
    let acabou = false;
    for(const r of resultados){
      if(r.error) return { data: null, error: r.error };
      const dados = r.data || [];
      todos = todos.concat(dados);
      if(dados.length < tamanho) acabou = true;
    }
    if(acabou) break;
    pagina += LOTE_PARALELO;
  }
  return { data: todos, error: null };
}

async function popularFiltroMesVendas(){
  const { data, error } = await buscarTodasLinhas((from, to) =>
    sb.from('vendas_itens').select('data').eq('loja', lojaAtual).range(from, to)
  );
  if(error){ console.error('Erro ao carregar meses de vendas:', error); return; }
  const mesesSet = new Set((data||[]).map(d=>d.data.slice(0,7)));
  const hoje = new Date();
  mesesSet.add(hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0'));
  const lista = Array.from(mesesSet).sort().reverse();
  const sel = document.getElementById('vendasFiltroMes');
  const atual = sel.value || 'todos';
  sel.innerHTML = '<option value="todos">Todos os meses</option>' + lista.map(chave=>{
    const [ano, mes] = chave.split('-');
    const rotulo = NOMES_MES[parseInt(mes,10)-1] + ' ' + ano;
    return `<option value="${chave}">${rotulo}</option>`;
  }).join('');
  sel.value = lista.includes(atual) || atual==='todos' ? atual : 'todos';
}

function mudarMesVendas(valor){
  if(valor==='todos'){
    document.getElementById('vendasFiltroDe').value = '';
    document.getElementById('vendasFiltroAte').value = '';
  }else{
    const [ano, mes] = valor.split('-');
    const ultimoDia = new Date(parseInt(ano,10), parseInt(mes,10), 0).getDate();
    document.getElementById('vendasFiltroDe').value = valor + '-01';
    document.getElementById('vendasFiltroAte').value = valor + '-' + String(ultimoDia).padStart(2,'0');
  }
  carregarVendas();
}

function parseNumeroVenda(v){
  if(typeof v === 'number') return v;
  if(v===null || v===undefined || v==='') return null;
  let s = String(v).trim();
  s = s.replace(/[^\d,.\-]/g, '');
  if(!s) return null;
  if(s.includes(',') && s.includes('.')){
    s = s.replace(/\./g,'').replace(',', '.');
  }else if(s.includes(',')){
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function extrairDataDoNomeArquivo(nome){
  const m = nome.match(/(\d{1,2})[-_](\d{1,2})[-_](\d{2,4})/);
  if(!m) return null;
  let [, d, mo, y] = m;
  const diaNum = parseInt(d, 10);
  const mesNum = parseInt(mo, 10);
  if(mesNum < 1 || mesNum > 12) return null;
  if(diaNum < 1 || diaNum > 31) return null;
  if(y.length === 2) y = '20' + y;
  return y + '-' + mo.padStart(2,'0') + '-' + d.padStart(2,'0');
}

async function onSelecionarArquivosVendas(fileList){
  const arquivos = Array.from(fileList || []);
  if(arquivos.length===0) return;
  const erroArquivos = validarListaArquivos(arquivos, 'planilha');
  if(erroArquivos){ alert(erroArquivos); document.getElementById('vendasFileInput').value = ''; return; }
  if(!window.XLSX){
    alert('Não foi possível carregar o leitor de planilhas. Recarregue a página e tente de novo.');
    return;
  }

  abrirProgresso('Lendo arquivo(s)…');
  vendasArquivosParsed = [];

  for(let idxArq=0; idxArq<arquivos.length; idxArq++){
    const file = arquivos[idxArq];
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const primeiraAba = wb.SheetNames[0];
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[primeiraAba], { header: 1, raw: true, defval: '' });
    atualizarProgresso(((idxArq+1) / arquivos.length) * 70);
    if(!linhas || linhas.length < 2) continue;

    const cabecalho = linhas[0].map(h => String(h||'').trim().toUpperCase());
    const idxProduto = cabecalho.indexOf('PRODUTO');
    const idxGrupo = cabecalho.indexOf('GRUPO');
    const idxValor = cabecalho.indexOf('VALOR VENDAS');
    const idxCusto = cabecalho.indexOf('CUSTO');
    if(idxProduto===-1 || idxValor===-1 || idxCusto===-1) continue;

    const itens = [];
    for(let i=1; i<linhas.length; i++){
      const linha = linhas[i];
      if(!linha || linha.length===0) continue;
      const produto = String(linha[idxProduto]||'').trim().toUpperCase();
      const categoria = idxGrupo>-1 ? String(linha[idxGrupo]||'').trim().toUpperCase() : '';
      const valor = parseNumeroVenda(linha[idxValor]);
      const custo = parseNumeroVenda(linha[idxCusto]);
      if(!produto || valor===null || custo===null) continue;
      itens.push({ produto, categoria, valor, custo });
    }
    if(itens.length===0) continue;

    const dataDetectada = extrairDataDoNomeArquivo(file.name);
    vendasArquivosParsed.push({ nomeArquivo: file.name, itens: itens, data: dataDetectada || '', dataDetectadaAutomaticamente: !!dataDetectada });
  }

  if(vendasArquivosParsed.length===0){
    fecharProgresso();
    alert('Não encontrei dados válidos (colunas Produto, Valor Vendas, Custo) em nenhum dos arquivos selecionados.');
    document.getElementById('vendasFileInput').value = '';
    return;
  }

  atualizarProgresso(80);
  const datasComData = vendasArquivosParsed.map(a=>a.data).filter(Boolean);
  if(datasComData.length>0){
    const { data: existentes } = await buscarTodasLinhas((from, to) =>
      sb.from('vendas_itens').select('data').eq('loja', lojaAtual).in('data', datasComData).range(from, to)
    );
    const diasComDados = new Set((existentes||[]).map(e=>e.data));
    vendasArquivosParsed.forEach(a=>{
      a.jaTemDados = !!(a.data && diasComDados.has(a.data));
      a.incluir = !a.jaTemDados;
    });
  }

  atualizarProgresso(100);
  renderVendasPreviewLista();
  setTimeout(fecharProgresso, 250);
}

async function atualizarDataArquivoVendas(idx, valor){
  vendasArquivosParsed[idx].data = valor;
  if(valor){
    const { data: existentes } = await sb.from('vendas_itens').select('id').eq('loja', lojaAtual).eq('data', valor).limit(1);
    vendasArquivosParsed[idx].jaTemDados = !!(existentes && existentes.length>0);
    vendasArquivosParsed[idx].incluir = !vendasArquivosParsed[idx].jaTemDados;
  }else{
    vendasArquivosParsed[idx].jaTemDados = false;
    vendasArquivosParsed[idx].incluir = true;
  }
  renderVendasPreviewLista();
}

function alternarIncluirArquivoVendas(idx, marcado){
  vendasArquivosParsed[idx].incluir = marcado;
}

function renderVendasPreviewLista(){
  const lista = document.getElementById('vendasPreviewLista');
  lista.innerHTML = vendasArquivosParsed.map((a, idx)=>{
    const semData = !a.data;
    const avisoData = a.dataDetectadaAutomaticamente
      ? ' · <span style="color:var(--green);">data reconhecida no nome do arquivo ✓</span>'
      : ' · <span style="color:var(--rust);font-weight:600;">⚠️ data não reconhecida — preencha manualmente</span>';
    const avisoDuplicado = a.jaTemDados
      ? '<div style="font-size:12px;color:var(--rust);font-weight:600;margin-top:2px;">⚠️ Esse dia já tem lançamentos importados. Desmarcado por padrão para não duplicar — marque a caixa ao lado se quiser importar mesmo assim.</div>'
      : '';
    const incluirChecked = a.incluir!==false ? 'checked' : '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;${idx>0 ? 'border-top:1px solid var(--paper3);' : ''}">
      <input type="checkbox" ${incluirChecked} title="Incluir este arquivo na importação" onchange="alternarIncluirArquivoVendas(${idx}, this.checked)">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.nomeArquivo)}</div>
        <div style="font-size:12px;color:var(--muted);">${a.itens.length} itens encontrados${avisoData}</div>
        ${avisoDuplicado}
      </div>
      <label style="font-size:11px;color:var(--muted);white-space:nowrap;">Data</label>
      <input type="date" value="${a.data}" style="${semData ? 'border-color:var(--rust);' : ''}" onchange="atualizarDataArquivoVendas(${idx}, this.value)">
    </div>`;
  }).join('');
  document.getElementById('vendasPreviewWrap').style.display = 'block';
}

function cancelarImportVendas(){
  document.getElementById('vendasPreviewWrap').style.display = 'none';
  document.getElementById('vendasFileInput').value = '';
  vendasArquivosParsed = [];
}

async function confirmarImportVendas(){
  if(vendasArquivosParsed.length===0) return;
  for(const a of vendasArquivosParsed){
    if(!a.data){
      alert('Preencha a data de todos os arquivos antes de importar.');
      return;
    }
  }

  const incluidos = vendasArquivosParsed.filter(a => a.incluir !== false);
  if(incluidos.length===0){
    alert('Nenhum arquivo selecionado para importar (todos foram desmarcados por já terem dados nesse dia).');
    return;
  }

  const btn = document.getElementById('vendasImportConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Importando…';
  abrirProgresso('Importando vendas…');

  const registros = [];
  incluidos.forEach(a=>{
    a.itens.forEach(v=>{
      registros.push({
        loja: lojaAtual,
        data: a.data,
        produto: v.produto,
        categoria: v.categoria || null,
        valor_venda: v.valor,
        custo: v.custo
      });
    });
  });

  const tamanhoLote = 500;
  let erroGeral = null;
  for(let i=0; i<registros.length; i+=tamanhoLote){
    const lote = registros.slice(i, i+tamanhoLote);
    const { error } = await sb.from('vendas_itens').insert(lote);
    if(error){ erroGeral = error; break; }
    atualizarProgresso(((i+lote.length) / registros.length) * 70);
  }

  btn.disabled = false;
  btn.textContent = 'Confirmar importação';

  if(erroGeral){
    fecharProgresso();
    alert('Erro ao importar: ' + erroGeral.message);
    return;
  }

  const pulados = vendasArquivosParsed.length - incluidos.length;

  cancelarImportVendas();
  atualizarProgresso(80);
  await popularFiltroMesVendas();
  atualizarProgresso(90);
  await carregarVendas();
  atualizarProgresso(95);
  await atualizarUltimoDiaVendas();
  atualizarProgresso(100);
  fecharProgresso();
  abrirResultadoImportacaoVendas(registros.length, incluidos.length, pulados);
}

function abrirResultadoImportacaoVendas(itens, arquivos, pulados){
  document.getElementById('vendasImportSucessoItens').textContent=Number(itens||0).toLocaleString('pt-BR');
  document.getElementById('vendasImportSucessoArquivos').textContent=Number(arquivos||0).toLocaleString('pt-BR');
  document.getElementById('vendasImportSucessoTexto').textContent=pulados>0
    ? 'Importação finalizada. '+pulados+' arquivo(s) já lançado(s) foram pulados para evitar duplicidade.'
    : 'Todos os arquivos selecionados foram importados e os indicadores já estão atualizados.';
  document.getElementById('vendasImportSucessoModal').style.display='flex';
}

function fecharResultadoImportacaoVendas(){document.getElementById('vendasImportSucessoModal').style.display='none';}

async function carregarVendas(){
  const de = document.getElementById('vendasFiltroDe').value;
  const ate = document.getElementById('vendasFiltroAte').value;
  const { data, error } = await buscarTodasLinhas((from, to)=>{
    let query = sb.from('vendas_itens').select('*').eq('loja', lojaAtual);
    if(de) query = query.gte('data', de);
    if(ate) query = query.lte('data', ate);
    return query.order('data').range(from, to);
  });
  if(error){
    console.error('Erro ao carregar vendas:', error);
    vendasCache = [];
  }else{
    vendasCache = data || [];
  }
  vendasCacheMesAnterior = [];
  vendasMesComparacao = '';
  vendasPeriodoComparacaoTexto = '';
  const mesSelecionado = document.getElementById('vendasFiltroMes').value;
  if(mesSelecionado && mesSelecionado!=='todos'){
    const [ano,mes]=mesSelecionado.split('-').map(Number),anterior=new Date(ano,mes-2,1),anoAnt=anterior.getFullYear(),mesAnt=String(anterior.getMonth()+1).padStart(2,'0');
    vendasMesComparacao=anoAnt+'-'+mesAnt;
    const datasAtuais=vendasCache.map(v=>v.data).filter(d=>d&&d.startsWith(mesSelecionado)).sort(),ultimoAtual=new Date(ano,mes,0).getDate(),hoje=todayStr(),diaLimite=datasAtuais.length?Number(datasAtuais[datasAtuais.length-1].slice(8,10)):(hoje.startsWith(mesSelecionado)?Number(hoje.slice(8,10)):ultimoAtual);
    const ultimoAnt=new Date(anoAnt,anterior.getMonth()+1,0).getDate(),diaAnt=Math.min(diaLimite,ultimoAnt),deAnt=vendasMesComparacao+'-01',ateAnt=vendasMesComparacao+'-'+String(diaAnt).padStart(2,'0');
    vendasPeriodoComparacaoTexto=fmtData(deAnt)+' a '+fmtData(ateAnt);
    const respostaAnterior=await buscarTodasLinhas((from,to)=>sb.from('vendas_itens').select('*').eq('loja',lojaAtual).gte('data',deAnt).lte('data',ateAnt).order('data').range(from,to));
    if(respostaAnterior.error)console.error('Erro ao carregar mês anterior:',respostaAnterior.error);else vendasCacheMesAnterior=respostaAnterior.data||[];
  }
  renderVendasDashboard();
}

function limparFiltroVendas(){
  document.getElementById('vendasFiltroDe').value = '';
  document.getElementById('vendasFiltroAte').value = '';
  document.getElementById('vendasFiltroMes').value = 'todos';
  carregarVendas();
}

let vendasCatOrdenarPor = 'vendido';
let vendasCatOrdemAsc = false;
let vendasCategoriaAtual = [];
let vendasCacheMesAnterior = [];
let vendasMesComparacao = '';
let vendasPeriodoComparacaoTexto = '';
let vendasProdOrdenarPor = 'lucro';
let vendasProdOrdemAsc = false;
let vendasProdutoAtual = [];

function textoPeriodoVendas(){
  // mostra o período REAL dos dados que entraram no relatório (não o que foi selecionado no filtro) —
  // evita mostrar "01/08 a 31/08" quando as vendas na verdade só vão até dia 26, por exemplo
  if(!vendasCache || vendasCache.length===0) return 'Sem dados';
  const datas = vendasCache.map(v=>v.data).filter(Boolean).sort();
  const de = datas[0];
  const ate = datas[datas.length-1];
  return de===ate ? fmtData(de) : (fmtData(de) + ' a ' + fmtData(ate));
}

function exportarExcelVendasCategoria(){
  if(!window.XLSX){
    alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.');
    return;
  }
  if(vendasCategoriaAtual.length===0){
    alert('Não há dados para exportar com o período atual.');
    return;
  }
  const nomeLoja = NOMES_LOJA[lojaAtual] || '';
  const linhasAoa = [
    ['Vendas por Categoria — ' + nomeLoja],
    ['Período: ' + textoPeriodoVendas()],
    [vendasMesComparacao ? 'Comparação com o mesmo período anterior: '+vendasPeriodoComparacaoTexto : 'Comparação mensal indisponível'],
    [],
    ['Categoria', 'Vendido', 'Variação vendas', 'Custo', 'Lucro', 'Variação lucro', 'Margem', 'Variação margem'],
    ...vendasCategoriaAtual.map(c=>[c.nome, brl(c.vendido), vendasMesComparacao?textoVariacaoVendas(c.variacaoVenda,c.nova):'—', brl(c.custo), brl(c.lucro), vendasMesComparacao?textoVariacaoVendas(c.variacaoLucro,c.nova):'—', c.margem.toFixed(1) + '%', vendasMesComparacao?textoVariacaoVendas(c.variacaoMargem,c.nova):'—'])
  ];
  const planilha = XLSX.utils.aoa_to_sheet(linhasAoa);
  planilha['!cols'] = [{wch:24},{wch:14},{wch:18},{wch:14},{wch:14},{wch:17},{wch:12},{wch:18}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Vendas por Categoria');

  const dataArquivo = new Date().toISOString().slice(0,10);
  const nomeArquivo = nomeLoja.toLowerCase().replace(' ','');
  XLSX.writeFile(livro, 'vendas-por-categoria-' + nomeArquivo + '-' + dataArquivo + '.xlsx');
}

function exportarPdfVendasCategoria(){
  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.');
    return;
  }
  if(vendasCategoriaAtual.length===0){
    alert('Não há dados para exportar com o período atual.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'landscape'});

  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);
  const nomeLoja = NOMES_LOJA[lojaAtual] || '';

  doc.setFontSize(16);
  doc.text('Vendas por Categoria — ' + nomeLoja, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Período: ' + textoPeriodoVendas() + '   ·   Gerado em ' + dataHora, 14, 25);
  if(vendasMesComparacao)doc.text('Comparação com o mesmo período anterior: '+vendasPeriodoComparacaoTexto,14,30);

  const linhas = vendasCategoriaAtual.map(c=>[
    c.nome, brl(c.vendido), vendasMesComparacao?textoVariacaoVendas(c.variacaoVenda,c.nova):'—', brl(c.custo), brl(c.lucro), vendasMesComparacao?textoVariacaoVendas(c.variacaoLucro,c.nova):'—', c.margem.toFixed(1) + '%', vendasMesComparacao?textoVariacaoVendas(c.variacaoMargem,c.nova):'—'
  ]);
  const totalVendido = vendasCategoriaAtual.reduce((s,c)=>s+c.vendido, 0);
  const totalCusto = vendasCategoriaAtual.reduce((s,c)=>s+c.custo, 0);
  const totalLucro = totalVendido - totalCusto;
  const margemGeral = totalVendido>0 ? (totalLucro/totalVendido*100) : 0;
  const totalVendidoAnterior=vendasCategoriaAtual.reduce((s,c)=>s+c.vendidoAnterior,0),totalLucroAnterior=vendasCategoriaAtual.reduce((s,c)=>s+c.lucroAnterior,0),margemAnterior=totalVendidoAnterior>0?totalLucroAnterior/totalVendidoAnterior*100:0;

  doc.autoTable({
    startY: vendasMesComparacao?36:32,
    head: [['Categoria','Vendido','Var. vendas','Custo','Lucro','Var. lucro','Margem','Var. margem']],
    body: linhas,
    foot: [['TOTAL', brl(totalVendido), vendasMesComparacao?textoVariacaoVendas(variacaoPercentualVendas(totalVendido,totalVendidoAnterior),totalVendidoAnterior===0&&totalVendido>0):'—', brl(totalCusto), brl(totalLucro), vendasMesComparacao?textoVariacaoVendas(variacaoPercentualVendas(totalLucro,totalLucroAnterior),false):'—', margemGeral.toFixed(1) + '%', vendasMesComparacao?textoVariacaoVendas(variacaoPercentualVendas(margemGeral,margemAnterior),false):'—']],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [38, 51, 43] },
    footStyles: { fillColor: [233, 225, 203], textColor: 20, fontStyle: 'bold' }
  });

  const dataArquivo = agora.toISOString().slice(0,10);
  const nomeArquivo = nomeLoja.toLowerCase().replace(' ','');
  doc.save('vendas-por-categoria-' + nomeArquivo + '-' + dataArquivo + '.pdf');
}

const CAMPOS_VENDAS_CAT = [
  { chave:'nome', label:'Categoria', align:'left' },
  { chave:'vendido', label:'Vendido', align:'right' },
  { chave:'variacaoVenda', label:'Var. vendas', align:'right' },
  { chave:'custo', label:'Custo', align:'right' },
  { chave:'lucro', label:'Lucro', align:'right' },
  { chave:'variacaoLucro', label:'Var. lucro', align:'right' },
  { chave:'margem', label:'Margem', align:'right' },
  { chave:'variacaoMargem', label:'Var. margem', align:'right' }
];

function variacaoPercentualVendas(atual,anterior){
  atual=Number(atual)||0;anterior=Number(anterior)||0;
  if(anterior===0)return atual===0?0:null;
  return ((atual-anterior)/Math.abs(anterior))*100;
}
function textoVariacaoVendas(valor,nova){if(nova)return 'Nova categoria';if(valor===null)return '—';return (valor>0?'+':'')+valor.toFixed(1)+'%';}
function corVariacaoVendas(valor){return valor===null?'var(--gold)':valor>0?'var(--green)':valor<0?'var(--rust)':'var(--muted)';}

function ordenarVendasCategoria(campo){
  if(vendasCatOrdenarPor === campo){
    vendasCatOrdemAsc = !vendasCatOrdemAsc;
  }else{
    vendasCatOrdenarPor = campo;
    vendasCatOrdemAsc = (campo === 'nome');
  }
  renderVendasDashboard();
}

function renderVendasCategoriaHead(){
  const thead = document.getElementById('vendasCategoriaHead');
  thead.innerHTML = '<tr>' + CAMPOS_VENDAS_CAT.map(c=>{
    const seta = vendasCatOrdenarPor===c.chave ? (vendasCatOrdemAsc ? ' ▲' : ' ▼') : '';
    const alinhar = c.align==='right' ? 'text-align:right;' : '';
    return `<th style="cursor:pointer;user-select:none;${alinhar}" onclick="ordenarVendasCategoria('${c.chave}')">${c.label}${seta}</th>`;
  }).join('') + '</tr>';
}

const CAMPOS_VENDAS_PROD = [
  { chave:'nome', label:'Produto', align:'left' },
  { chave:'categoria', label:'Categoria', align:'left' },
  { chave:'vendido', label:'Vendido', align:'right' },
  { chave:'custo', label:'Custo', align:'right' },
  { chave:'lucro', label:'Lucro', align:'right' },
  { chave:'margem', label:'Margem', align:'right' }
];

function ordenarVendasProduto(campo){
  if(vendasProdOrdenarPor === campo){
    vendasProdOrdemAsc = !vendasProdOrdemAsc;
  }else{
    vendasProdOrdenarPor = campo;
    vendasProdOrdemAsc = (campo === 'nome' || campo === 'categoria');
  }
  renderVendasDashboard();
}

function renderVendasProdutoHead(){
  const thead = document.getElementById('vendasProdutoHead');
  thead.innerHTML = '<tr>' + CAMPOS_VENDAS_PROD.map(c=>{
    const seta = vendasProdOrdenarPor===c.chave ? (vendasProdOrdemAsc ? ' ▲' : ' ▼') : '';
    const alinhar = c.align==='right' ? 'text-align:right;' : '';
    return `<th style="cursor:pointer;user-select:none;${alinhar}" onclick="ordenarVendasProduto('${c.chave}')">${c.label}${seta}</th>`;
  }).join('') + '</tr>';
}

function renderVendasDashboard(){
  const totalVendido = vendasCache.reduce((s,v)=>s+Number(v.valor_venda), 0);
  const totalCusto = vendasCache.reduce((s,v)=>s+Number(v.custo), 0);
  const lucro = totalVendido - totalCusto;
  const margem = totalVendido>0 ? (lucro/totalVendido*100) : 0;

  document.getElementById('vendasTotalVendido').textContent = brl(totalVendido);
  document.getElementById('vendasTotalCusto').textContent = brl(totalCusto);
  document.getElementById('vendasLucroTotal').textContent = brl(lucro);
  document.getElementById('vendasMargemMedia').textContent = margem.toFixed(1) + '%';

  const agregarCategorias = lista=>{
    const mapa={};
    lista.forEach(v=>{
    const cat = v.categoria || 'Sem categoria';
      if(!mapa[cat]) mapa[cat]={vendido:0,custo:0};mapa[cat].vendido+=Number(v.valor_venda);mapa[cat].custo+=Number(v.custo);
    });return mapa;
  };
  const porCategoria=agregarCategorias(vendasCache),porCategoriaAnterior=agregarCategorias(vendasCacheMesAnterior),nomesCategorias=new Set([...Object.keys(porCategoria),...Object.keys(porCategoriaAnterior)]);
  let listaCategorias=Array.from(nomesCategorias).map(nome=>{
    const d=porCategoria[nome]||{vendido:0,custo:0},a=porCategoriaAnterior[nome]||{vendido:0,custo:0},lucro=d.vendido-d.custo,lucroAnterior=a.vendido-a.custo,margem=d.vendido>0?lucro/d.vendido*100:0,margemAnterior=a.vendido>0?lucroAnterior/a.vendido*100:0,nova=a.vendido===0&&d.vendido>0;
    return {nome,vendido:d.vendido,custo:d.custo,lucro,margem,vendidoAnterior:a.vendido,lucroAnterior,margemAnterior,nova,variacaoVenda:variacaoPercentualVendas(d.vendido,a.vendido),variacaoLucro:variacaoPercentualVendas(lucro,lucroAnterior),variacaoMargem:variacaoPercentualVendas(margem,margemAnterior)};
  });

  listaCategorias.sort((a,b)=>{
    const va = a[vendasCatOrdenarPor], vb = b[vendasCatOrdenarPor];
    if(typeof va === 'string'){
      return vendasCatOrdemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return vendasCatOrdemAsc ? va-vb : vb-va;
  });

  vendasCategoriaAtual = listaCategorias;
  renderVendasCategoriaHead();

  const resumo=document.getElementById('vendasComparativoResumo'),totalAnterior=vendasCacheMesAnterior.reduce((s,v)=>s+Number(v.valor_venda),0),variacaoGeral=variacaoPercentualVendas(totalVendido,totalAnterior),comparaveis=listaCategorias.filter(c=>!c.nova&&c.variacaoVenda!==null);
  resumo.style.display=vendasMesComparacao?'grid':'none';
  if(vendasMesComparacao){document.getElementById('vendasAnteriorLabel').textContent='Vendido de '+vendasPeriodoComparacaoTexto;document.getElementById('vendasAnteriorTotal').textContent=brl(totalAnterior);const vg=document.getElementById('vendasVariacaoGeral');vg.textContent=textoVariacaoVendas(variacaoGeral,totalAnterior===0&&totalVendido>0);vg.style.color=corVariacaoVendas(variacaoGeral);const maior=[...comparaveis].sort((a,b)=>b.variacaoVenda-a.variacaoVenda)[0],menor=[...comparaveis].sort((a,b)=>a.variacaoVenda-b.variacaoVenda)[0];document.getElementById('vendasMaisCresceu').textContent=maior&&maior.variacaoVenda>0?maior.nome+' ('+textoVariacaoVendas(maior.variacaoVenda,false)+')':'—';document.getElementById('vendasMaisCaiu').textContent=menor&&menor.variacaoVenda<0?menor.nome+' ('+textoVariacaoVendas(menor.variacaoVenda,false)+')':'—';}

  const bodyCat = document.getElementById('vendasCategoriaBody');
  if(listaCategorias.length===0){
    bodyCat.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);font-style:italic;padding:20px;">Nenhuma venda no período.</td></tr>';
  }else{
    bodyCat.innerHTML = listaCategorias.map(c=>`
      <tr>
        <td>${escapeHtml(c.nome)}</td>
        <td class="valor">${brl(c.vendido)}</td>
        <td class="valor" style="color:${corVariacaoVendas(c.variacaoVenda)};font-weight:600;">${vendasMesComparacao?textoVariacaoVendas(c.variacaoVenda,c.nova):'—'}</td>
        <td class="valor">${brl(c.custo)}</td>
        <td class="valor" style="color:var(--green);">${brl(c.lucro)}</td>
        <td class="valor" style="color:${corVariacaoVendas(c.variacaoLucro)};font-weight:600;">${vendasMesComparacao?textoVariacaoVendas(c.variacaoLucro,c.nova):'—'}</td>
        <td class="valor">${c.margem.toFixed(1)}%</td>
        <td class="valor" style="color:${corVariacaoVendas(c.variacaoMargem)};font-weight:600;">${vendasMesComparacao?textoVariacaoVendas(c.variacaoMargem,c.nova):'—'}</td>
      </tr>
    `).join('');
  }

  const porProduto = {};
  vendasCache.forEach(v=>{
    const chave = v.produto;
    if(!porProduto[chave]) porProduto[chave] = { categoria: v.categoria, vendido:0, custo:0 };
    porProduto[chave].vendido += Number(v.valor_venda);
    porProduto[chave].custo += Number(v.custo);
  });
  let listaProdutos = Object.entries(porProduto).map(([nome, d])=>({
    nome, categoria: d.categoria || '—', vendido: d.vendido, custo: d.custo, lucro: d.vendido-d.custo,
    margem: d.vendido>0 ? ((d.vendido-d.custo)/d.vendido*100) : 0
  }));

  listaProdutos.sort((a,b)=>{
    const va = a[vendasProdOrdenarPor], vb = b[vendasProdOrdenarPor];
    if(typeof va === 'string'){
      return vendasProdOrdemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return vendasProdOrdemAsc ? va-vb : vb-va;
  });

  vendasProdutoAtual = listaProdutos;
  renderVendasProdutoHead();

  const bodyProd = document.getElementById('vendasProdutoBody');
  if(listaProdutos.length===0){
    bodyProd.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);font-style:italic;padding:20px;">Nenhuma venda no período.</td></tr>';
  }else{
    bodyProd.innerHTML = listaProdutos.map(p=>`
      <tr>
        <td>${escapeHtml(p.nome)}</td>
        <td class="contato">${escapeHtml(p.categoria || '—')}</td>
        <td class="valor">${brl(p.vendido)}</td>
        <td class="valor">${brl(p.custo)}</td>
        <td class="valor" style="color:var(--green);">${brl(p.lucro)}</td>
        <td class="valor">${p.margem.toFixed(1)}%</td>
      </tr>
    `).join('');
  }
}

/* ================= FLUXO DE CAIXA ================= */

const CONTA_SEM_ID = '__sem_conta__';
let fluxoContasCache = [];
let fluxoContaAtivaId = CONTA_SEM_ID;
let fluxoCache = [];
let fluxoExtratoAtual = [];
let fluxoExtratoTodasContasAtual = []; // usado no Relatório único, que junta TODAS as contas, não só a aba aberta
let fluxoDinheiroAtual = [];
let fluxoFormasAtual = [];
let fluxoPorFormaLinhasAtual = {};
let fluxoFornecedoresAtual = [];
let fluxoResumoTotalAtual = { totalEntradas: 0, totalSaidas: 0, dinheiroEntradas: 0, dinheiroSaidas: 0 };
let fluxoImportParsed = [];
let fluxoImportSaldos = [];

function nomeDaContaFluxo(id){
  if(id === CONTA_SEM_ID) return 'Sem conta específica';
  const c = fluxoContasCache.find(x=>x.id===id);
  return c ? c.nome : '';
}

async function existeDadoSemContaFluxo(){
  const { count } = await sb.from('fluxo_caixa_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('loja', lojaAtual)
    .neq('tipo', 'Dinheiro')
    .is('conta_id', null);
  return (count || 0) > 0;
}

function renderFluxoContaTabs(mostrarSemConta){
  const wrap = document.getElementById('fluxoContaTabsWrap');
  const botoesContas = fluxoContasCache.map(c=>
    `<button class="app-tab" data-conta-id="${c.id}" onclick="mudarSubAbaFluxo('${c.id}')">🏦 ${escapeHtml(c.nome)}</button>`
  ).join('');
  const botaoSemConta = mostrarSemConta
    ? `<button class="app-tab" data-conta-id="${CONTA_SEM_ID}" onclick="mudarSubAbaFluxo('${CONTA_SEM_ID}')">📊 Sem conta específica</button>`
    : '';
  wrap.innerHTML = botoesContas + botaoSemConta;
}

function mudarSubAbaFluxo(aba){
  const ehConta = aba!=='dinheiro' && aba!=='total' && aba!=='projecao';

  document.getElementById('fluxoSubExtrato').style.display = ehConta ? '' : 'none';
  document.getElementById('fluxoSubDinheiro').style.display = (aba==='dinheiro') ? '' : 'none';
  document.getElementById('fluxoSubTotal').style.display = (aba==='total') ? '' : 'none';
  document.getElementById('fluxoSubProjecao').style.display = (aba==='projecao') ? '' : 'none';

  document.querySelectorAll('#fluxoContaTabsWrap .app-tab').forEach(b=>b.classList.toggle('active', ehConta && b.dataset.contaId===aba));
  document.getElementById('fluxoSubTabDinheiro').classList.toggle('active', aba==='dinheiro');
  document.getElementById('fluxoSubTabTotal').classList.toggle('active', aba==='total');
  document.getElementById('fluxoSubTabProjecao').classList.toggle('active', aba==='projecao');

  if(ehConta){
    fluxoContaAtivaId = aba;
    document.getElementById('fluxoContaAtivaTitulo').textContent = nomeDaContaFluxo(aba);
    renderFluxoCaixa();
    atualizarUltimoDiaFluxo();
  }

  if(aba==='dinheiro'){
    // foco automático na descrição, pra já poder digitar sem precisar clicar
    setTimeout(()=>{ const el = document.getElementById('dinheiro_descricao'); if(el) el.focus(); }, 0);
  }

  if(aba==='projecao' && !projecaoJaCarregada){
    projecaoJaCarregada = true;
    abrirProjecao();
  }
}

async function abrirFluxoCaixa(){
  projecaoJaCarregada = false;
  await carregarTiposPagCaixaSeNecessario();
  await carregarMemoriaGlobal();
  if(!document.getElementById('dinheiro_data').value){
    document.getElementById('dinheiro_data').value = todayStr();
  }

  const { data: contas, error: erroContas } = await sb.from('fluxo_caixa_contas').select('*').eq('loja', lojaAtual).order('ordem').order('nome');
  fluxoContasCache = erroContas ? [] : (contas || []);
  const temDadosSemConta = await existeDadoSemContaFluxo();
  renderFluxoContaTabs(temDadosSemConta || fluxoContasCache.length===0);
  let contaAlvo = fluxoContasCache.some(c=>c.id===fluxoContaAtivaId) ? fluxoContaAtivaId : (fluxoContasCache.length>0 ? fluxoContasCache[0].id : CONTA_SEM_ID);
  if(contaAlvo === CONTA_SEM_ID && !temDadosSemConta && fluxoContasCache.length>0) contaAlvo = fluxoContasCache[0].id;
  mudarSubAbaFluxo(contaAlvo);

  await popularFiltroMesFluxo();
  const mesAtual = new Date().toISOString().slice(0,7);
  document.getElementById('fluxoFiltroMes').value = mesAtual;
  mudarMesFluxo(mesAtual);
  await atualizarUltimoDiaFluxo();
}

async function atualizarUltimoDiaFluxo(){
  let query = sb.from('fluxo_caixa_lancamentos')
    .select('data')
    .eq('loja', lojaAtual)
    .neq('tipo', 'Dinheiro');
  query = fluxoContaAtivaId === CONTA_SEM_ID ? query.is('conta_id', null) : query.eq('conta_id', fluxoContaAtivaId);
  const { data, error } = await query.order('data', { ascending: false }).limit(1);

  const elUltimo = document.getElementById('fluxoUltimoDia');
  const elProximo = document.getElementById('fluxoProximoDia');

  if(error || !data || data.length===0){
    elUltimo.textContent = 'nenhum ainda';
    elProximo.textContent = '—';
    return;
  }

  const ultimaData = data[0].data;
  elUltimo.textContent = fmtData(ultimaData);

  const proximo = new Date(ultimaData + 'T12:00:00');
  proximo.setDate(proximo.getDate() + 1);
  elProximo.textContent = fmtData(proximo.toISOString().slice(0,10));
}

async function atualizarFluxoAposAlteracao(){
  await popularFiltroMesFluxo();
  await carregarFluxoCaixa();
  await atualizarUltimoDiaFluxo();
}

let dinheiroTipoAtual = 'entrada';

function setDinheiroTipo(t){
  dinheiroTipoAtual = t;
  document.querySelectorAll('#dinheiroTipoToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipo===t));
}

async function sincronizarHistoricoContasDinheiro(){
  const { data: pagas, error } = await sb.from('lancamentos')
    .select('*')
    .eq('loja', lojaAtual)
    .eq('tipo', 'pagar')
    .eq('status', 'pago')
    .eq('forma_pagamento', 'dinheiro');

  if(error){
    alert('Erro ao buscar contas pagas em dinheiro: ' + error.message);
    return;
  }
  if(!pagas || pagas.length===0){
    alert('Nenhuma conta paga em dinheiro encontrada em Contas a Pagar.');
    return;
  }

  let sincronizadas = 0;
  for(const item of pagas){
    const { data: existente } = await sb.from('fluxo_caixa_lancamentos').select('id').eq('lancamento_origem_id', item.id).maybeSingle();
    if(existente) continue;
    const { error: erroInsert } = await sb.from('fluxo_caixa_lancamentos').insert({
      loja: item.loja,
      data: item.data_pagamento || item.vencimento,
      tipo: 'Dinheiro',
      descricao: item.contato || item.descricao,
      valor: -Math.abs(Number(item.valor)),
      lancamento_origem_id: item.id
    });
    if(!erroInsert) sincronizadas++;
  }

  alert(sincronizadas + ' conta(s) sincronizada(s) com sucesso.' + (sincronizadas < pagas.length ? ' (as demais já estavam sincronizadas)' : ''));
  await popularFiltroMesFluxo();
  await carregarFluxoCaixa();
}

async function salvarLancamentoDinheiro(){
  const btnDinheiro = document.getElementById('addbtnDinheiro');
  if(btnDinheiro.disabled) return; // trava contra chamada dupla
  const descricao = document.getElementById('dinheiro_descricao').value.trim();
  const data = document.getElementById('dinheiro_data').value;
  const valorBruto = parseFloat(document.getElementById('dinheiro_valor').value);
  const tipoId = document.getElementById('dinheiro_categoria').value || null;
  const err = document.getElementById('dinheiroErr');

  if(!descricao || !data || isNaN(valorBruto) || valorBruto<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  btnDinheiro.disabled = true;

  const valor = dinheiroTipoAtual==='entrada' ? valorBruto : -valorBruto;

  const { data: salvo, error } = await sb.from('fluxo_caixa_lancamentos').insert({
    loja: lojaAtual,
    data: data,
    tipo: 'Dinheiro',
    descricao: descricao,
    valor: valor,
    codigo_tipo_id: tipoId
  }).select().single();

  btnDinheiro.disabled = false;

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  if(tipoId) await gravarMemoriaPagCaixa(descricao, tipoId);

  fluxoCache.push(salvo);
  document.getElementById('dinheiro_descricao').value = '';
  document.getElementById('dinheiro_valor').value = '';
  document.getElementById('dinheiro_categoria').value = '';
  document.getElementById('dinheiro_categoria_busca').value = '';
  document.getElementById('dinheiro_descricao').focus();
  renderFluxoCaixa();
  await popularFiltroMesFluxo();
}

let editandoDinheiroId = null;
let edinheiroTipoAtual = 'entrada';

function setEdinheiroTipo(t){
  edinheiroTipoAtual = t;
  document.querySelectorAll('#edinheiroTipoToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipo===t));
}

function abrirEditarDinheiro(id){
  const l = fluxoCache.find(x=>x.id===id);
  if(!l) return;
  editandoDinheiroId = id;
  document.getElementById('edinheiro_descricao').value = l.descricao || '';
  document.getElementById('edinheiro_data').value = l.data;
  document.getElementById('edinheiro_valor').value = Math.abs(Number(l.valor));
  setEdinheiroTipo(Number(l.valor) < 0 ? 'saida' : 'entrada');
  const tipoAtual = l.codigo_tipo_id ? pagCaixaTiposCache.find(t=>String(t.id)===String(l.codigo_tipo_id)) : null;
  document.getElementById('edinheiro_categoria').value = l.codigo_tipo_id || '';
  document.getElementById('edinheiro_categoria_busca').value = tipoAtual ? labelTipoPagCaixa(tipoAtual) : '';
  document.getElementById('edinheiroErr').style.display = 'none';
  document.getElementById('editDinheiroModal').style.display = 'flex';
}

function fecharEditarDinheiro(){
  document.getElementById('editDinheiroModal').style.display = 'none';
  editandoDinheiroId = null;
}

// edição da descrição de um lançamento do extrato bancário (útil pra corrigir
// saídas que caem em "Sem descrição" — bancos como o Sicoob nem sempre trazem
// o nome de quem foi pago em toda transação)
let editandoExtratoId = null;
function abrirEditarExtrato(id){
  const l = fluxoCache.find(x=>x.id===id);
  if(!l) return;
  editandoExtratoId = id;
  document.getElementById('editExtrato_data').value = fmtData(l.data);
  document.getElementById('editExtrato_tipo').value = l.tipo || '—';
  document.getElementById('editExtrato_valor').value = brl(l.valor);
  document.getElementById('editExtrato_descricao').value = l.descricao || '';
  document.getElementById('editExtratoErr').style.display = 'none';
  document.getElementById('editExtratoModal').style.display = 'flex';
  setTimeout(()=>document.getElementById('editExtrato_descricao').focus(), 50);
}

function fecharEditarExtrato(){
  document.getElementById('editExtratoModal').style.display = 'none';
  editandoExtratoId = null;
}

async function salvarEdicaoExtrato(){
  const btn = document.getElementById('editExtratoSalvarBtn');
  if(btn.disabled) return; // trava contra chamada dupla
  const descricao = document.getElementById('editExtrato_descricao').value.trim().toUpperCase();
  const err = document.getElementById('editExtratoErr');

  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const { data: atualizado, error } = await sb.from('fluxo_caixa_lancamentos')
    .update({ descricao: descricao || null })
    .eq('id', editandoExtratoId)
    .select().single();

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  const idx = fluxoCache.findIndex(l=>l.id===editandoExtratoId);
  if(idx>-1) fluxoCache[idx] = atualizado;
  fecharEditarExtrato();
  renderFluxoCaixa();
}

async function salvarEdicaoDinheiro(){
  const btnTravado = document.getElementById('edinheiroSalvarBtn');
  if(btnTravado.disabled) return; // trava contra chamada dupla
  const descricao = document.getElementById('edinheiro_descricao').value.trim();
  const data = document.getElementById('edinheiro_data').value;
  const valorBruto = parseFloat(document.getElementById('edinheiro_valor').value);
  const tipoId = document.getElementById('edinheiro_categoria').value || null;
  const err = document.getElementById('edinheiroErr');

  if(!descricao || !data || isNaN(valorBruto) || valorBruto<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const valor = edinheiroTipoAtual==='entrada' ? valorBruto : -valorBruto;
  const btn = document.getElementById('edinheiroSalvarBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const { data: atualizado, error } = await sb.from('fluxo_caixa_lancamentos').update({
    descricao: descricao,
    data: data,
    valor: valor,
    codigo_tipo_id: tipoId
  }).eq('id', editandoDinheiroId).select().single();

  if(!error && tipoId) await gravarMemoriaPagCaixa(descricao, tipoId);

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  const idx = fluxoCache.findIndex(l=>l.id===editandoDinheiroId);
  if(idx>-1) fluxoCache[idx] = atualizado;
  renderFluxoCaixa();
  fecharEditarDinheiro();
}

async function popularFiltroMesFluxo(){
  const { data, error } = await buscarTodasLinhas((from, to) =>
    sb.from('fluxo_caixa_lancamentos').select('data').eq('loja', lojaAtual).range(from, to)
  );
  if(error){ console.error('Erro ao carregar meses do fluxo de caixa:', error); return; }
  const mesesSet = new Set((data||[]).map(d=>d.data.slice(0,7)));
  const hoje = new Date();
  mesesSet.add(hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0'));
  const lista = Array.from(mesesSet).sort().reverse();
  const opcoesHtml = '<option value="todos">Todos os meses</option>' + lista.map(chave=>{
    const [ano, mes] = chave.split('-');
    const rotulo = NOMES_MES[parseInt(mes,10)-1] + ' ' + ano;
    return `<option value="${chave}">${rotulo}</option>`;
  }).join('');

  const sel = document.getElementById('fluxoFiltroMes');
  const atual = sel.value || 'todos';
  sel.innerHTML = opcoesHtml;
  sel.value = lista.includes(atual) || atual==='todos' ? atual : 'todos';

  const selDinheiro = document.getElementById('dinheiroFiltroMes');
  selDinheiro.innerHTML = opcoesHtml;
  selDinheiro.value = sel.value;
}

function mudarMesFluxo(valor){
  if(valor==='todos'){
    document.getElementById('fluxoFiltroDe').value = '';
    document.getElementById('fluxoFiltroAte').value = '';
  }else{
    const [ano, mes] = valor.split('-');
    const ultimoDia = new Date(parseInt(ano,10), parseInt(mes,10), 0).getDate();
    document.getElementById('fluxoFiltroDe').value = valor + '-01';
    document.getElementById('fluxoFiltroAte').value = valor + '-' + String(ultimoDia).padStart(2,'0');
  }
  document.getElementById('fluxoFiltroMes').value = valor;
  document.getElementById('dinheiroFiltroMes').value = valor;
  carregarFluxoCaixa();
}

function processarExtratoFormatoAntigo(linhas, idxCabecalho, cabecalhoTextos){
  const idxData = cabecalhoTextos.indexOf('DATA');
  const idxTipo = cabecalhoTextos.indexOf('TIPO');
  const idxDescricao = cabecalhoTextos.findIndex(h=>(h||'').includes('DESCRI'));
  const idxEntradas = cabecalhoTextos.findIndex(h=>(h||'').includes('ENTRADA'));
  const idxSaidas = cabecalhoTextos.findIndex(h=>(h||'').includes('SAIDA') || (h||'').includes('SAÍDA'));
  const idxSaldo = cabecalhoTextos.findIndex(h=>(h||'').includes('SALDO'));

  const transacoes = [];
  const saldos = [];

  for(let i=idxCabecalho+1; i<linhas.length; i++){
    const linha = linhas[i];
    if(!linha || linha.length===0) continue;
    const tipo = String(linha[idxTipo]||'').trim();
    if(!tipo) continue;
    const dataTexto = String(linha[idxData]||'').trim();
    const data = parseDataBR(dataTexto);
    if(!data) continue;

    if(tipo.toUpperCase().includes('SALDO DO DIA')){
      const saldoVal = idxSaldo>-1 ? parseNumeroVenda(linha[idxSaldo]) : null;
      if(saldoVal!==null) saldos.push({ data, saldo: saldoVal });
      continue;
    }

    const descricao = idxDescricao>-1 ? String(linha[idxDescricao]||'').trim().toUpperCase() : '';
    const entradaVal = idxEntradas>-1 ? parseNumeroVenda(linha[idxEntradas]) : null;
    const saidaVal = idxSaidas>-1 ? parseNumeroVenda(linha[idxSaidas]) : null;
    let valor = null;
    if(entradaVal!==null && entradaVal!==0) valor = Math.abs(entradaVal);
    else if(saidaVal!==null && saidaVal!==0) valor = -Math.abs(saidaVal);
    if(valor===null) continue;
    transacoes.push({ data, tipo: tipo.toUpperCase(), descricao, valor });
  }
  return { transacoes, saldos };
}

// Formato "quebrado em várias linhas": cada movimentação tem uma linha principal
// (Data, Documento, Histórico, Valor) seguida de um número variável de linhas de
// detalhe (nome de quem pagou/recebeu, observação, etc.) até a próxima linha que
// já tenha uma nova Data preenchida.
function processarExtratoFormatoQuebrado(linhas, idxCabecalho, cabecalhoTextos){
  const idxData = cabecalhoTextos.indexOf('DATA');
  const idxHistorico = cabecalhoTextos.findIndex(h=>(h||'').includes('HIST'));
  const idxValor = cabecalhoTextos.indexOf('VALOR');

  const transacoes = [];
  const saldos = [];
  let i = idxCabecalho + 1;

  while(i < linhas.length){
    const linha = linhas[i] || [];
    const dataTexto = String(linha[idxData]||'').trim();
    if(!dataTexto){ i++; continue; }

    const data = parseDataBR(dataTexto);
    const tipo = String(linha[idxHistorico]||'').trim();
    const valorTexto = String(linha[idxValor]||'').trim();

    let j = i+1;
    const detalhes = [];
    while(j < linhas.length){
      const proxima = linhas[j] || [];
      const proximaDataTexto = String(proxima[idxData]||'').trim();
      if(proximaDataTexto) break;
      const texto = String(proxima[idxHistorico]||'').trim();
      if(texto) detalhes.push(texto);
      j++;
    }

    if(data && valorTexto){
      const tipoUpper = tipo.toUpperCase();
      const marcador = valorTexto.trim().slice(-1).toUpperCase();
      const valorNum = parseNumeroVenda(valorTexto);

      if(tipoUpper === 'SALDO DO DIA'){
        if(valorNum!==null) saldos.push({ data, saldo: valorNum });
      }else if(tipoUpper.includes('SALDO')){
        // "Saldo anterior", "Saldo bloqueado anterior" etc — só informativo, ignora
      }else if(marcador === '*'){
        // marcador especial de linha informativa, ignora
      }else if(valorNum!==null && valorNum!==0){
        const descricao = valorNum > 0 ? '' : detalhes.join(' · ').toUpperCase();
        transacoes.push({ data, tipo: tipo.toUpperCase(), descricao, valor: valorNum });
      }
    }
    i = j;
  }
  return { transacoes, saldos };
}

// Formato Mercado Pago: cada movimentação já vem numa única linha (sem "quebrar"
// em várias linhas como Sicoob), com colunas RELEASE_DATE / TRANSACTION_TYPE /
// REFERENCE_ID / TRANSACTION_NET_AMOUNT / PARTIAL_BALANCE. O valor líquido já vem
// com o sinal certo (positivo = entrada, negativo = saída). Diferente dos bancos
// tradicionais, aqui o nome de quem pagou/recebeu vem junto no próprio texto do
// TRANSACTION_TYPE (ex: "Pagamento com Código QR Pix FULANO", "Pix enviado CICLANO"),
// então separamos isso em categoria (tipo) + nome (descrição). Não vem "SALDO DO DIA"
// resumido — o PARTIAL_BALANCE se acumula a cada linha, então guardamos só o último
// saldo de cada dia (o mais recente).
function extrairTipoEDescricaoMercadoPago(textoOriginal){
  const texto = String(textoOriginal||'').trim();
  const textoLower = texto.toLowerCase();

  if(textoLower.includes('cancelado')){
    return { tipo: 'PIX CANCELADO', descricao: '' };
  }
  let m = texto.match(/^Pagamento com C[oó]digo QR Pix\s+(.*)$/i);
  if(m) return { tipo: 'PIX', descricao: m[1].trim().toUpperCase() };

  m = texto.match(/^Pix enviado\s+(.*)$/i);
  if(m) return { tipo: 'PIX ENVIADO', descricao: m[1].trim().toUpperCase() };

  m = texto.match(/^Pix recebido\s+(.*)$/i);
  if(m) return { tipo: 'PIX RECEBIDO', descricao: m[1].trim().toUpperCase() };

  if(textoLower.includes('liberação de dinheiro') || textoLower.includes('liberacao de dinheiro')){
    return { tipo: 'LIBERAÇÃO DE DINHEIRO', descricao: '' };
  }

  // não reconheceu um padrão conhecido — guarda o texto original inteiro como tipo,
  // sem tentar adivinhar uma descrição separada
  return { tipo: texto.toUpperCase(), descricao: '' };
}

function processarExtratoFormatoMercadoPago(linhas, idxCabecalho, cabecalhoTextos){
  const idxData = cabecalhoTextos.indexOf('RELEASE_DATE');
  const idxTipo = cabecalhoTextos.indexOf('TRANSACTION_TYPE');
  const idxValor = cabecalhoTextos.findIndex(h=>(h||'').includes('NET_AMOUNT'));
  const idxSaldoParcial = cabecalhoTextos.findIndex(h=>(h||'').includes('PARTIAL_BALANCE'));

  const transacoes = [];
  const ultimoSaldoPorDia = new Map(); // guarda só o saldo mais recente de cada dia

  for(let i=idxCabecalho+1; i<linhas.length; i++){
    const linha = linhas[i];
    if(!linha || linha.length===0) continue;

    const dataTexto = String(linha[idxData]||'').trim();
    if(!dataTexto) continue;
    const data = parseDataBR(dataTexto);
    if(!data) continue;

    const valor = idxValor>-1 ? parseNumeroVenda(linha[idxValor]) : null;
    if(valor===null || valor===0) continue;

    const { tipo, descricao } = extrairTipoEDescricaoMercadoPago(linha[idxTipo]);
    // privacidade: assim como nos outros bancos, não guarda nome de quem PAGOU (entrada) —
    // só guarda nome de quem VOCÊ pagou (saída), igual já funciona pro formato quebrado
    const descricaoFinal = valor > 0 ? '' : descricao;
    transacoes.push({ data, tipo, descricao: descricaoFinal, valor });

    if(idxSaldoParcial>-1){
      const saldoVal = parseNumeroVenda(linha[idxSaldoParcial]);
      if(saldoVal!==null) ultimoSaldoPorDia.set(data, saldoVal);
    }
  }

  const saldos = Array.from(ultimoSaldoPorDia, ([data, saldo]) => ({ data, saldo }));
  return { transacoes, saldos };
}

async function onSelecionarArquivosFluxo(fileList){
  const arquivos = Array.from(fileList || []);
  if(arquivos.length===0) return;
  const erroArquivos = validarListaArquivos(arquivos, 'planilha');
  if(erroArquivos){ alert(erroArquivos); document.getElementById('fluxoFileInput').value = ''; return; }
  if(!window.XLSX){
    alert('Não foi possível carregar o leitor de planilhas. Recarregue a página e tente de novo.');
    return;
  }

  try{
    abrirProgresso('Lendo arquivo(s)…');
    let todasLinhas = [];
    let todosSaldos = [];

    for(let idxArq=0; idxArq<arquivos.length; idxArq++){
      const file = arquivos[idxArq];
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const primeiraAba = wb.SheetNames[0];
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[primeiraAba], { header: 1, raw: true, defval: '' });
      atualizarProgresso(((idxArq+1) / arquivos.length) * 60);
      if(!linhas || linhas.length===0) continue;

      let idxCabecalho = -1, cabecalhoTextos = null, formato = null;
      for(let i=0; i<Math.min(linhas.length,15); i++){
        const linha = (linhas[i]||[]).map(c=>String(c||'').trim().toUpperCase());
        const temData = linha.includes('DATA');
        const temEntradasSaidas = linha.some(h=>h.includes('ENTRADA')) || linha.some(h=>h.includes('SAIDA') || h.includes('SAÍDA'));
        const temHistoricoValor = linha.some(h=>h.includes('HIST')) && linha.includes('VALOR');
        const temReleaseDateNetAmount = linha.includes('RELEASE_DATE') && linha.some(h=>h.includes('NET_AMOUNT'));
        if(temData && linha.includes('TIPO') && temEntradasSaidas){
          idxCabecalho = i; cabecalhoTextos = linha; formato = 'antigo';
          break;
        }
        if(temData && temHistoricoValor){
          idxCabecalho = i; cabecalhoTextos = linha; formato = 'quebrado';
          break;
        }
        if(temReleaseDateNetAmount){
          idxCabecalho = i; cabecalhoTextos = linha; formato = 'mercadopago';
          break;
        }
      }
      if(idxCabecalho===-1){
        console.warn('Não reconheci o formato do arquivo:', file.name);
        continue;
      }

      const resultado = formato==='antigo'
        ? processarExtratoFormatoAntigo(linhas, idxCabecalho, cabecalhoTextos)
        : formato==='mercadopago'
        ? processarExtratoFormatoMercadoPago(linhas, idxCabecalho, cabecalhoTextos)
        : processarExtratoFormatoQuebrado(linhas, idxCabecalho, cabecalhoTextos);

      todasLinhas = todasLinhas.concat(resultado.transacoes);
      todosSaldos = todosSaldos.concat(resultado.saldos);
    }

    if(todasLinhas.length===0){
      alert('Não encontrei lançamentos válidos nos arquivos selecionados.');
      document.getElementById('fluxoFileInput').value = '';
      return;
    }

    fluxoImportParsed = todasLinhas;
    fluxoImportSaldos = todosSaldos;
    const datas = todasLinhas.map(l=>l.data).sort();
    const dataMin = datas[0];
    const dataMax = datas[datas.length-1];

    atualizarProgresso(70);
    const { data: existentes } = await buscarTodasLinhas((from, to) => {
      let q = sb.from('fluxo_caixa_lancamentos').select('data')
        .eq('loja', lojaAtual).neq('tipo', 'Dinheiro').gte('data', dataMin).lte('data', dataMax);
      q = fluxoContaAtivaId === CONTA_SEM_ID ? q.is('conta_id', null) : q.eq('conta_id', fluxoContaAtivaId);
      return q.range(from, to);
    });
    atualizarProgresso(95);
    const diasComDados = new Set((existentes||[]).map(l=>l.data));

    const diasNoArquivo = new Set(todasLinhas.map(l=>l.data));
    const diasJaImportados = Array.from(diasNoArquivo).filter(d=>diasComDados.has(d)).sort();

    const novos = todasLinhas.filter(l=>!diasComDados.has(l.data));
    fluxoImportParsed = novos;

    const btnConfirmar = document.getElementById('fluxoImportConfirmBtn');
    if(novos.length===0){
      document.getElementById('fluxoPreviewResumo').textContent =
        'Todos os dias desse(s) arquivo(s) já têm lançamentos importados (' + diasJaImportados.map(fmtData).join(', ') + '). Nada novo para adicionar. Se quiser reimportar mesmo assim, apague esses dias primeiro em "Apagar lançamentos importados (período)".';
      btnConfirmar.style.display = 'none';
    }else{
      let resumo = novos.length + ' lançamento(s) novo(s) encontrado(s), de ' + fmtData(dataMin) + ' até ' + fmtData(dataMax) + '.';
      if(diasJaImportados.length>0){
        resumo += ' Os dias ' + diasJaImportados.map(fmtData).join(', ') + ' já tinham dados e foram pulados inteiros (para não duplicar nem descartar lançamentos legítimos repetidos). Se quiser reimportar esses dias, apague-os primeiro.';
      }
      document.getElementById('fluxoPreviewResumo').textContent = resumo;
      btnConfirmar.style.display = '';
    }
    document.getElementById('fluxoPreviewWrap').style.display = 'block';
    atualizarProgresso(100);
    setTimeout(fecharProgresso, 250);
  }catch(e){
    console.error('Erro ao processar arquivo(s) de fluxo de caixa:', e);
    fecharProgresso();
    alert('Não foi possível ler o(s) arquivo(s). Detalhe: ' + (e && e.message ? e.message : e));
    document.getElementById('fluxoFileInput').value = '';
  }
}

function cancelarImportFluxo(){
  document.getElementById('fluxoPreviewWrap').style.display = 'none';
  document.getElementById('fluxoFileInput').value = '';
  document.getElementById('fluxoImportConfirmBtn').style.display = '';
  fluxoImportParsed = [];
  fluxoImportSaldos = [];
}

async function confirmarImportFluxo(){
  if(fluxoImportParsed.length===0) return;

  const btn = document.getElementById('fluxoImportConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Importando…';
  abrirProgresso('Importando lançamentos do extrato…');

  const contaParaSalvar = fluxoContaAtivaId === CONTA_SEM_ID ? null : fluxoContaAtivaId;

  const registros = fluxoImportParsed.map(l=>({
    loja: lojaAtual,
    conta_id: contaParaSalvar,
    data: l.data,
    tipo: l.tipo,
    descricao: l.descricao || null,
    valor: l.valor
  }));

  const tamanhoLote = 500;
  let erroGeral = null;
  for(let i=0; i<registros.length; i+=tamanhoLote){
    const lote = registros.slice(i, i+tamanhoLote);
    const { error } = await sb.from('fluxo_caixa_lancamentos').insert(lote);
    if(error){ erroGeral = error; break; }
    atualizarProgresso(((i+lote.length) / registros.length) * 65);
  }

  if(!erroGeral && fluxoImportSaldos.length>0){
    atualizarProgresso(70);
    const saldosRegistros = fluxoImportSaldos.map(s=>({
      loja: lojaAtual, conta_id: contaParaSalvar, data: s.data, saldo: s.saldo
    }));
    const { error: erroSaldo } = await sb.from('fluxo_caixa_saldos').upsert(saldosRegistros, { onConflict: 'loja,conta_id,data' });
    if(erroSaldo) console.error('Erro ao salvar saldos do extrato:', erroSaldo);
  }

  btn.disabled = false;
  btn.textContent = 'Confirmar importação';

  if(erroGeral){
    fecharProgresso();
    alert('Erro ao importar: ' + erroGeral.message);
    return;
  }

  cancelarImportFluxo();
  atualizarProgresso(80);
  await atualizarFluxoAposAlteracao();
  atualizarProgresso(100);
  setTimeout(fecharProgresso, 300);
}

async function carregarFluxoCaixa(){
  const de = document.getElementById('fluxoFiltroDe').value;
  const ate = document.getElementById('fluxoFiltroAte').value;
  document.getElementById('dinheiroFiltroDe').value = de;
  document.getElementById('dinheiroFiltroAte').value = ate;
  const { data, error } = await buscarTodasLinhas((from, to)=>{
    let query = sb.from('fluxo_caixa_lancamentos').select('*').eq('loja', lojaAtual);
    if(de) query = query.gte('data', de);
    if(ate) query = query.lte('data', ate);
    return query.order('data').range(from, to);
  });
  if(error){
    console.error('Erro ao carregar fluxo de caixa:', error);
    fluxoCache = [];
  }else{
    fluxoCache = data || [];
  }
  renderFluxoCaixa();
  await carregarSaldoExtrato();
}

async function carregarSaldoExtrato(){
  const de = document.getElementById('fluxoFiltroDe').value;
  const ate = document.getElementById('fluxoFiltroAte').value;
  let query = sb.from('fluxo_caixa_saldos').select('*').eq('loja', lojaAtual);
  query = fluxoContaAtivaId === CONTA_SEM_ID ? query.is('conta_id', null) : query.eq('conta_id', fluxoContaAtivaId);
  if(de) query = query.gte('data', de);
  if(ate) query = query.lte('data', ate);
  const { data, error } = await query.order('data', { ascending: false }).limit(1);
  const elValor = document.getElementById('fluxoSaldoExtrato');
  const elData = document.getElementById('fluxoSaldoExtratoData');
  if(error || !data || data.length===0){
    elValor.textContent = '—';
    elData.textContent = '';
    return;
  }
  elValor.textContent = brl(data[0].saldo);
  elData.textContent = 'em ' + fmtData(data[0].data);
}

function limparFiltroFluxo(){
  document.getElementById('fluxoFiltroDe').value = '';
  document.getElementById('fluxoFiltroAte').value = '';
  document.getElementById('fluxoFiltroMes').value = 'todos';
  document.getElementById('dinheiroFiltroDe').value = '';
  document.getElementById('dinheiroFiltroAte').value = '';
  document.getElementById('dinheiroFiltroMes').value = 'todos';
  carregarFluxoCaixa();
}

function mudarPeriodoDinheiro(){
  const de = document.getElementById('dinheiroFiltroDe').value;
  const ate = document.getElementById('dinheiroFiltroAte').value;
  document.getElementById('fluxoFiltroDe').value = de;
  document.getElementById('fluxoFiltroAte').value = ate;
  document.getElementById('fluxoFiltroMes').value = 'todos';
  document.getElementById('dinheiroFiltroMes').value = 'todos';
  carregarFluxoCaixa();
}

function classificarFormaPagamentoVenda(tipo, descricao, ehContaComVendas){
  const t = (tipo||'').toUpperCase();
  const d = (descricao||'').toUpperCase();
  const texto = t + ' ' + d;
  // "Pix via chave" só existe em contas que também têm o tipo "VENDAS" (padrão PagSeguro/maquininha) —
  // nessas contas, "PIX RECEBIDO" é uma transferência avulsa separada das vendas.
  // Em contas de banco comum (Sicoob, etc.) não existe essa distinção — lá, todo Pix recebido é só "Pix",
  // mesmo que o histórico do banco diga "PIX RECEBIDO" (é assim que o banco descreve qualquer Pix, venda ou não).
  if(ehContaComVendas && t.includes('PIX RECEBIDO')) return 'Pix via chave';
  if(texto.includes('PIX')) return 'Pix';
  if(texto.includes('BOLETO')) return 'Boleto';
  if(t.includes('ANTECIPA')) return 'Cartão Crédito';
  if(t.includes('COMPRAS')) return 'Cartão Débito';
  if(d.includes('DEBITO') || d.includes('DÉBITO')) return 'Cartão Débito';
  if(d.includes('CREDITO') || d.includes('CRÉDITO')) return 'Cartão Crédito';
  if(texto.includes('MASTERCARD') || texto.includes('VISA') || texto.includes('ELO') || texto.includes('MAESTRO') || texto.includes('HIPERCARD') || texto.includes('AMEX')) return 'Cartão';
  return 'Outros';
}

function filtrarExtratoFluxo(){
  renderFluxoCaixa();
}

function filtrarDinheiroFluxo(){
  renderFluxoCaixa();
}

function renderFluxoCaixa(){
  const somenteExtrato = fluxoCache.filter(l=>{
    if(l.tipo==='Dinheiro') return false;
    return fluxoContaAtivaId === CONTA_SEM_ID ? !l.conta_id : l.conta_id === fluxoContaAtivaId;
  });
  const totalEntradas = somenteExtrato.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor), 0);
  const totalSaidas = somenteExtrato.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)), 0);
  const saldo = totalEntradas - totalSaidas;

  // "Total de Entradas e Saídas" e Projeção somam TODAS as contas juntas, não só a conta ativa
  const todosExtratoContas = fluxoCache.filter(l=>l.tipo!=='Dinheiro');
  fluxoExtratoTodasContasAtual = todosExtratoContas; // também usado no Relatório único (PDF/Excel completo)
  const totalEntradasTodasContas = todosExtratoContas.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor), 0);
  const totalSaidasTodasContas = todosExtratoContas.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)), 0);

  document.getElementById('fluxoTotalEntradas').textContent = brl(totalEntradas);
  document.getElementById('fluxoTotalSaidas').textContent = brl(totalSaidas);
  document.getElementById('fluxoSaldoLiquido').textContent = brl(saldo);

  const entradasClassificaveis = fluxoCache.filter(l=>Number(l.valor)>0);
  // detecta quais contas têm o padrão PagSeguro (tipo "VENDAS"), pra só nessas separar "Pix via chave"
  const contasComVendas = new Set(fluxoCache.filter(l=>(l.tipo||'').toUpperCase()==='VENDAS').map(l=>l.conta_id));
  const porForma = {};
  const porFormaLinhas = {};
  entradasClassificaveis.forEach(v=>{
    let forma;
    if((v.tipo||'').toUpperCase().includes('RENDIMENTO DA CONTA')) forma = 'Rendimento da conta';
    else if(v.tipo==='Dinheiro') forma = 'Dinheiro';
    else forma = classificarFormaPagamentoVenda(v.tipo, v.descricao, contasComVendas.has(v.conta_id));
    porForma[forma] = (porForma[forma]||0) + Number(v.valor);
    if(!porFormaLinhas[forma]) porFormaLinhas[forma] = [];
    porFormaLinhas[forma].push(v);
  });
  fluxoPorFormaLinhasAtual = porFormaLinhas;
  const bodyForma = document.getElementById('fluxoFormaBody');
  const ORDEM_FORMAS_ENTRADA = ['Cartão Débito', 'Cartão Crédito', 'Pix', 'Pix via chave', 'Boleto', 'Rendimento da conta', 'Dinheiro'];
  const formas = Object.entries(porForma).sort((a,b)=>{
    const ia = ORDEM_FORMAS_ENTRADA.indexOf(a[0]);
    const ib = ORDEM_FORMAS_ENTRADA.indexOf(b[0]);
    if(ia===-1 && ib===-1) return b[1]-a[1];
    if(ia===-1) return 1;
    if(ib===-1) return -1;
    return ia-ib;
  });
  if(formas.length===0){
    bodyForma.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhuma venda no período.</td></tr>';
  }else{
    bodyForma.innerHTML = formas.map(([forma, valor])=>`
      <tr style="cursor:pointer;" onclick="abrirDetalheFormaPagamento('${forma.replace(/'/g,"\\'")}')" title="Clique pra ver os lançamentos dessa categoria">
        <td>${forma} <span style="font-size:10px;color:var(--muted);">🔍</span></td><td class="valor" style="color:var(--green);">${brl(valor)}</td>
      </tr>
    `).join('');
  }
  fluxoFormasAtual = formas;

  const pagamentos = fluxoCache.filter(l=>Number(l.valor)<0 && l.tipo!=='Vendas');
  const porFornecedor = {};
  pagamentos.forEach(p=>{
    const nome = p.descricao || 'Sem descrição';
    porFornecedor[nome] = (porFornecedor[nome]||0) + Math.abs(Number(p.valor));
  });
  const bodyForn = document.getElementById('fluxoFornecedorBody');
  const fornecedores = Object.entries(porFornecedor).sort((a,b)=>b[1]-a[1]);
  if(fornecedores.length===0){
    bodyForn.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum pagamento no período.</td></tr>';
  }else{
    bodyForn.innerHTML = fornecedores.map(([nome, valor])=>`
      <tr><td>${escapeHtml(nome)}</td><td class="valor" style="color:var(--rust);">${brl(valor)}</td></tr>
    `).join('');
  }
  fluxoFornecedoresAtual = fornecedores;

  let extrato = fluxoCache.filter(l=>{
    if(l.tipo==='Dinheiro') return false;
    return fluxoContaAtivaId === CONTA_SEM_ID ? !l.conta_id : l.conta_id === fluxoContaAtivaId;
  });
  const buscaExtrato = (document.getElementById('fluxoExtratoBusca').value || '').trim().toLowerCase();
  if(buscaExtrato){
    extrato = extrato.filter(l=>{
      const texto = [fmtData(l.data), l.tipo, l.descricao, brl(l.valor), String(l.valor).replace('.',',')].join(' ').toLowerCase();
      return texto.includes(buscaExtrato);
    });
  }
  fluxoExtratoAtual = extrato;
  const bodyExtrato = document.getElementById('fluxoExtratoBody');
  const emptyExtrato = document.getElementById('fluxoExtratoEmpty');
  if(extrato.length===0){
    bodyExtrato.innerHTML = '';
    emptyExtrato.style.display = 'block';
    emptyExtrato.textContent = buscaExtrato ? 'Nenhum lançamento encontrado para essa busca.' : 'Nenhum lançamento do extrato importado ainda.';
  }else{
    emptyExtrato.style.display = 'none';
    bodyExtrato.innerHTML = extrato.map(l=>`
      <tr>
        <td class="data">${fmtData(l.data)}</td>
        <td>${escapeHtml(l.tipo)}</td>
        <td class="contato">${escapeHtml(l.descricao || '—')}</td>
        <td class="valor" style="color:${Number(l.valor)<0?'var(--rust)':'var(--green)'};">${brl(l.valor)}</td>
        <td><div class="rowactions">
          <button class="iconbtn edit" title="Editar descrição" onclick="abrirEditarExtrato('${l.id}')">✎</button>
          <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoFluxo('${l.id}')">✕</button>
        </div></td>
      </tr>
    `).join('');
  }

  const dinheiro = fluxoCache.filter(l=>l.tipo==='Dinheiro');

  const dinheiroEntradas = dinheiro.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor), 0);
  const dinheiroSaidas = dinheiro.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)), 0);
  document.getElementById('dinheiroTotalEntradas').textContent = brl(dinheiroEntradas);
  document.getElementById('dinheiroTotalSaidas').textContent = brl(dinheiroSaidas);
  document.getElementById('dinheiroSaldoLiquido').textContent = brl(dinheiroEntradas - dinheiroSaidas);

  document.getElementById('fluxoCombinadoEntradas').textContent = brl(totalEntradasTodasContas + dinheiroEntradas);
  document.getElementById('fluxoCombinadoSaidas').textContent = brl(totalSaidasTodasContas + dinheiroSaidas);
  document.getElementById('fluxoCombinadoSaldo').textContent = brl((totalEntradasTodasContas + dinheiroEntradas) - (totalSaidasTodasContas + dinheiroSaidas));
  fluxoResumoTotalAtual = { totalEntradas: totalEntradasTodasContas, totalSaidas: totalSaidasTodasContas, dinheiroEntradas, dinheiroSaidas };

  let dinheiroExibido = dinheiro;
  const filtroTipoDinheiro = document.getElementById('fluxoDinheiroFiltroTipo').value;
  if(filtroTipoDinheiro === 'entrada') dinheiroExibido = dinheiroExibido.filter(l=>Number(l.valor)>0);
  else if(filtroTipoDinheiro === 'saida') dinheiroExibido = dinheiroExibido.filter(l=>Number(l.valor)<0);

  const buscaDinheiro = (document.getElementById('fluxoDinheiroBusca').value || '').trim().toLowerCase();
  if(buscaDinheiro){
    dinheiroExibido = dinheiroExibido.filter(l=>{
      const texto = [fmtData(l.data), l.descricao, brl(l.valor), String(l.valor).replace('.',',')].join(' ').toLowerCase();
      return texto.includes(buscaDinheiro);
    });
  }
  fluxoDinheiroAtual = dinheiroExibido;

  const bodyDinheiro = document.getElementById('fluxoDinheiroBody');
  const emptyDinheiro = document.getElementById('fluxoDinheiroEmpty');
  if(dinheiroExibido.length===0){
    bodyDinheiro.innerHTML = '';
    emptyDinheiro.style.display = 'block';
    emptyDinheiro.textContent = buscaDinheiro ? 'Nenhum lançamento encontrado para essa busca.' : 'Nenhum lançamento em dinheiro ainda.';
  }else{
    emptyDinheiro.style.display = 'none';
    bodyDinheiro.innerHTML = dinheiroExibido.map(l=>`
      <tr>
        <td class="data">${fmtData(l.data)}</td>
        <td class="contato">${escapeHtml(l.descricao || '—')}</td>
        <td>${celulaTipoFluxo(l, 'dinheiro')}</td>
        <td class="valor" style="color:${Number(l.valor)<0?'var(--rust)':'var(--green)'};">${brl(l.valor)}</td>
        <td><div class="rowactions">
          <button class="iconbtn edit" title="Editar" onclick="abrirEditarDinheiro('${l.id}')">✎</button>
          <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoFluxo('${l.id}')">✕</button>
        </div></td>
      </tr>
    `).join('');
  }
}

function textoPeriodoFluxo(){
  const de = document.getElementById('fluxoFiltroDe').value;
  const ate = document.getElementById('fluxoFiltroAte').value;
  if(de || ate){
    return (de ? fmtData(de) : 'início') + ' a ' + (ate ? fmtData(ate) : 'hoje');
  }
  return 'Todos os períodos';
}

/* ---------- Exportação: helpers genéricos ---------- */

function gerarLinhasExcelLancamentos(linhas, comTipo){
  return linhas.map(l=>{
    const linha = { 'Data': fmtData(l.data) };
    if(comTipo) linha['Tipo'] = l.tipo;
    linha['Descrição'] = l.descricao || '—';
    linha['Valor'] = brl(l.valor);
    return linha;
  });
}

function baixarExcel(planilhaDados, larguras, nomeAba, nomeArquivo){
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const planilha = XLSX.utils.json_to_sheet(planilhaDados);
  planilha['!cols'] = larguras;
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, nomeAba);
  XLSX.writeFile(livro, nomeArquivo);
}

function iniciarPdf(titulo, subtitulo){
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.'); return null; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);
  doc.setFontSize(16);
  doc.text(titulo, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(subtitulo + '   ·   Gerado em ' + dataHora, 14, 25);
  return doc;
}

function nomeArquivoFluxo(prefixo, extensao){
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  const dataArquivo = new Date().toISOString().slice(0,10);
  return prefixo + '-' + nomeLoja + '-' + dataArquivo + '.' + extensao;
}

/* ---------- Extrato bancário ---------- */

function exportarExcelExtrato(){
  if(fluxoExtratoAtual.length===0){ alert('Não há lançamentos do extrato para exportar.'); return; }
  const dados = gerarLinhasExcelLancamentos(fluxoExtratoAtual, true);
  baixarExcel(dados, [{wch:12},{wch:26},{wch:40},{wch:14}], 'Extrato', nomeArquivoFluxo('extrato-bancario','xlsx'));
}

function exportarPdfExtrato(){
  if(fluxoExtratoAtual.length===0){ alert('Não há lançamentos do extrato para exportar.'); return; }
  const doc = iniciarPdf('Extrato Bancário — ' + (NOMES_LOJA[lojaAtual]||''), 'Período: ' + textoPeriodoFluxo());
  if(!doc) return;
  const corpo = fluxoExtratoAtual.map(l=>[fmtData(l.data), l.tipo, l.descricao||'—', brl(l.valor)]);
  const totalEnt = fluxoExtratoAtual.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor),0);
  const totalSai = fluxoExtratoAtual.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)),0);
  doc.autoTable({
    startY: 32,
    head: [['Data','Tipo','Descrição','Valor']],
    body: corpo,
    foot: [['TOTAL','','Entradas: '+brl(totalEnt)+'  ·  Saídas: '+brl(totalSai), 'Líquido: '+brl(totalEnt-totalSai)]],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [38,51,43] },
    footStyles: { fillColor: [233,225,203], textColor:20, fontStyle:'bold' }
  });
  doc.save(nomeArquivoFluxo('extrato-bancario','pdf'));
}

/* ---------- Lançamentos em dinheiro ---------- */

function exportarExcelDinheiro(){
  if(fluxoDinheiroAtual.length===0){ alert('Não há lançamentos em dinheiro para exportar.'); return; }
  const dados = gerarLinhasExcelLancamentos(fluxoDinheiroAtual, false);
  baixarExcel(dados, [{wch:12},{wch:40},{wch:14}], 'Dinheiro', nomeArquivoFluxo('lancamentos-dinheiro','xlsx'));
}

function exportarPdfDinheiro(){
  if(fluxoDinheiroAtual.length===0){ alert('Não há lançamentos em dinheiro para exportar.'); return; }
  const doc = iniciarPdf('Lançamentos em Dinheiro — ' + (NOMES_LOJA[lojaAtual]||''), 'Período: ' + textoPeriodoFluxo());
  if(!doc) return;
  const corpo = fluxoDinheiroAtual.map(l=>[fmtData(l.data), l.descricao||'—', brl(l.valor)]);
  const totalEnt = fluxoDinheiroAtual.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor),0);
  const totalSai = fluxoDinheiroAtual.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)),0);
  doc.autoTable({
    startY: 32,
    head: [['Data','Descrição','Valor']],
    body: corpo,
    foot: [['TOTAL','Entradas: '+brl(totalEnt)+'  ·  Saídas: '+brl(totalSai), 'Líquido: '+brl(totalEnt-totalSai)]],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [38,51,43] },
    footStyles: { fillColor: [233,225,203], textColor:20, fontStyle:'bold' }
  });
  doc.save(nomeArquivoFluxo('lancamentos-dinheiro','pdf'));
}

/* ---------- Total de entradas e saídas (por forma / por fornecedor) ---------- */

function exportarExcelTotalFluxo(){
  if(fluxoFormasAtual.length===0 && fluxoFornecedoresAtual.length===0){ alert('Não há dados para exportar com o período atual.'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const livro = XLSX.utils.book_new();
  const r = fluxoResumoTotalAtual;

  const resumo = [
    ['Período', textoPeriodoFluxo()],
    [],
    ['', 'Entradas', 'Saídas', 'Resultado'],
    ['Dinheiro', brl(r.dinheiroEntradas), brl(r.dinheiroSaidas), brl(r.dinheiroEntradas - r.dinheiroSaidas)],
    ['Extrato bancário (todas as contas)', brl(r.totalEntradas), brl(r.totalSaidas), brl(r.totalEntradas - r.totalSaidas)],
    ['Total', brl(r.totalEntradas + r.dinheiroEntradas), brl(r.totalSaidas + r.dinheiroSaidas), brl((r.totalEntradas + r.dinheiroEntradas) - (r.totalSaidas + r.dinheiroSaidas))],
    []
  ];
  const planResumo = XLSX.utils.aoa_to_sheet(resumo);
  planResumo['!cols'] = [{wch:36},{wch:16},{wch:16},{wch:16}];
  XLSX.utils.book_append_sheet(livro, planResumo, 'Resumo');

  const planForma = XLSX.utils.json_to_sheet(fluxoFormasAtual.map(([forma,valor])=>({ 'Forma': forma, 'Valor': brl(valor) })));
  planForma['!cols'] = [{wch:22},{wch:16}];
  XLSX.utils.book_append_sheet(livro, planForma, 'Por forma de pagamento');

  const planForn = XLSX.utils.json_to_sheet(fluxoFornecedoresAtual.map(([nome,valor])=>({ 'Fornecedor': nome, 'Valor': brl(valor) })));
  planForn['!cols'] = [{wch:36},{wch:16}];
  XLSX.utils.book_append_sheet(livro, planForn, 'Por fornecedor');

  XLSX.writeFile(livro, nomeArquivoFluxo('total-entradas-saidas','xlsx'));
}

function exportarPdfTotalFluxo(){
  if(fluxoFormasAtual.length===0 && fluxoFornecedoresAtual.length===0){ alert('Não há dados para exportar com o período atual.'); return; }
  const doc = iniciarPdf('Total de Entradas e Saídas — ' + (NOMES_LOJA[lojaAtual]||''), 'Período: ' + textoPeriodoFluxo());
  if(!doc) return;
  const r = fluxoResumoTotalAtual;

  doc.autoTable({
    startY: 32,
    head: [['', 'Entradas', 'Saídas', 'Resultado']],
    body: [
      ['Dinheiro', brl(r.dinheiroEntradas), brl(r.dinheiroSaidas), brl(r.dinheiroEntradas - r.dinheiroSaidas)],
      ['Extrato bancário (todas as contas)', brl(r.totalEntradas), brl(r.totalSaidas), brl(r.totalEntradas - r.totalSaidas)]
    ],
    foot: [['Total', brl(r.totalEntradas + r.dinheiroEntradas), brl(r.totalSaidas + r.dinheiroSaidas), brl((r.totalEntradas + r.dinheiroEntradas) - (r.totalSaidas + r.dinheiroSaidas))]],
    styles: { fontSize: 9.5, cellPadding: 4 },
    headStyles: { fillColor: [38,51,43] },
    footStyles: { fillColor: [233,225,203], textColor:20, fontStyle:'bold' },
    columnStyles: { 0: { fontStyle: 'bold' } },
    theme: 'grid'
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 12,
    head: [['Entradas por forma de pagamento','Valor']],
    body: fluxoFormasAtual.map(([forma,valor])=>[forma, brl(valor)]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [38,51,43] }
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 12,
    head: [['Pagamentos por fornecedor','Valor']],
    body: fluxoFornecedoresAtual.map(([nome,valor])=>[nome, brl(valor)]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [38,51,43] }
  });

  doc.save(nomeArquivoFluxo('total-entradas-saidas','pdf'));
}

/* ---------- Relatório único (extrato + dinheiro juntos) ---------- */

function montarListaFluxoCompleto(){
  return [...fluxoExtratoTodasContasAtual, ...fluxoDinheiroAtual]
    .slice()
    .sort((a,b)=> a.data.localeCompare(b.data));
}

function exportarExcelFluxoCompleto(){
  const todos = montarListaFluxoCompleto();
  if(todos.length===0){ alert('Não há lançamentos para exportar com o período/busca atual.'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }

  const dinheiroEnt = fluxoDinheiroAtual.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor),0);
  const dinheiroSai = fluxoDinheiroAtual.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)),0);
  const extratoEnt = fluxoExtratoTodasContasAtual.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor),0);
  const extratoSai = fluxoExtratoTodasContasAtual.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)),0);

  const resumo = [
    ['Período', textoPeriodoFluxo()],
    [],
    ['', 'Entradas', 'Saídas', 'Resultado'],
    ['Dinheiro', brl(dinheiroEnt), brl(dinheiroSai), brl(dinheiroEnt - dinheiroSai)],
    ['Conta bancária (extrato)', brl(extratoEnt), brl(extratoSai), brl(extratoEnt - extratoSai)],
    ['Total', brl(dinheiroEnt + extratoEnt), brl(dinheiroSai + extratoSai), brl((dinheiroEnt + extratoEnt) - (dinheiroSai + extratoSai))],
    []
  ];
  const cabecalho = ['Data','Origem','Tipo','Descrição','Valor'];
  const linhas = todos.map(l=>[
    fmtData(l.data),
    l.tipo==='Dinheiro' ? 'Dinheiro' : nomeDaContaFluxo(l.conta_id || CONTA_SEM_ID),
    l.tipo,
    l.descricao || '—',
    brl(l.valor)
  ]);

  const planilha = XLSX.utils.aoa_to_sheet([...resumo, cabecalho, ...linhas]);
  planilha['!cols'] = [{wch:12},{wch:16},{wch:26},{wch:40},{wch:14}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Fluxo de Caixa');
  XLSX.writeFile(livro, nomeArquivoFluxo('fluxo-de-caixa-completo','xlsx'));
}

function exportarPdfFluxoCompleto(){
  const todos = montarListaFluxoCompleto();
  if(todos.length===0){ alert('Não há lançamentos para exportar com o período/busca atual.'); return; }
  const doc = iniciarPdf('Fluxo de Caixa Completo — ' + (NOMES_LOJA[lojaAtual]||''), 'Período: ' + textoPeriodoFluxo());
  if(!doc) return;

  const dinheiroEnt = fluxoDinheiroAtual.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor),0);
  const dinheiroSai = fluxoDinheiroAtual.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)),0);
  const extratoEnt = fluxoExtratoTodasContasAtual.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor),0);
  const extratoSai = fluxoExtratoTodasContasAtual.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)),0);

  doc.autoTable({
    startY: 32,
    head: [['', 'Entradas', 'Saídas', 'Resultado']],
    body: [
      ['Dinheiro', brl(dinheiroEnt), brl(dinheiroSai), brl(dinheiroEnt - dinheiroSai)],
      ['Conta bancária (extrato)', brl(extratoEnt), brl(extratoSai), brl(extratoEnt - extratoSai)]
    ],
    foot: [['Total', brl(dinheiroEnt + extratoEnt), brl(dinheiroSai + extratoSai), brl((dinheiroEnt + extratoEnt) - (dinheiroSai + extratoSai))]],
    styles: { fontSize: 9.5, cellPadding: 4 },
    headStyles: { fillColor: [38,51,43] },
    footStyles: { fillColor: [233,225,203], textColor:20, fontStyle:'bold' },
    columnStyles: { 0: { fontStyle: 'bold' } },
    theme: 'grid'
  });

  const corpo = todos.map(l=>[fmtData(l.data), l.tipo==='Dinheiro'?'Dinheiro':nomeDaContaFluxo(l.conta_id || CONTA_SEM_ID), l.tipo, l.descricao||'—', brl(l.valor)]);
  const totalEnt = todos.filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor),0);
  const totalSai = todos.filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)),0);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 12,
    head: [['Data','Origem','Tipo','Descrição','Valor']],
    body: corpo,
    foot: [['TOTAL','','','Entradas: '+brl(totalEnt)+'  ·  Saídas: '+brl(totalSai), 'Líquido: '+brl(totalEnt-totalSai)]],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [38,51,43] },
    footStyles: { fillColor: [233,225,203], textColor:20, fontStyle:'bold' }
  });
  doc.save(nomeArquivoFluxo('fluxo-de-caixa-completo','pdf'));
}

function confirmarLimpezaExtrato(){
  document.getElementById('limpezaExtratoPeriodo').textContent = textoPeriodoFluxo() + ' — ' + nomeDaContaFluxo(fluxoContaAtivaId);
  document.getElementById('confirmLimpezaExtratoModal').style.display = 'flex';
}

function abrirDetalheFormaPagamento(forma){
  const linhas = (fluxoPorFormaLinhasAtual[forma] || []).slice().sort((a,b)=>a.data.localeCompare(b.data));
  document.getElementById('detalheFormaTitulo').textContent = 'Lançamentos — ' + forma + ' (' + linhas.length + ')';
  const body = document.getElementById('detalheFormaBody');
  if(linhas.length===0){
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum lançamento encontrado.</td></tr>';
  }else{
    body.innerHTML = linhas.map(l=>`
      <tr>
        <td class="data">${fmtData(l.data)}</td>
        <td>${escapeHtml(l.tipo)}</td>
        <td class="contato">${escapeHtml(l.descricao || '—')}</td>
        <td class="valor" style="color:var(--green);">${brl(l.valor)}</td>
      </tr>
    `).join('');
  }
  document.getElementById('detalheFormaModal').style.display = 'flex';
}

function fecharDetalheFormaPagamento(){
  document.getElementById('detalheFormaModal').style.display = 'none';
}

function fecharConfirmacaoLimpezaExtrato(){
  document.getElementById('confirmLimpezaExtratoModal').style.display = 'none';
}

async function confirmarLimpezaExtratoOk(){
  const de = document.getElementById('fluxoFiltroDe').value;
  const ate = document.getElementById('fluxoFiltroAte').value;

  let query = sb.from('fluxo_caixa_lancamentos').delete().eq('loja', lojaAtual).neq('tipo', 'Dinheiro');
  query = fluxoContaAtivaId === CONTA_SEM_ID ? query.is('conta_id', null) : query.eq('conta_id', fluxoContaAtivaId);
  if(de) query = query.gte('data', de);
  if(ate) query = query.lte('data', ate);
  const { error } = await query;

  let query2 = sb.from('fluxo_caixa_saldos').delete().eq('loja', lojaAtual);
  query2 = fluxoContaAtivaId === CONTA_SEM_ID ? query2.is('conta_id', null) : query2.eq('conta_id', fluxoContaAtivaId);
  if(de) query2 = query2.gte('data', de);
  if(ate) query2 = query2.lte('data', ate);
  await query2;

  fecharConfirmacaoLimpezaExtrato();

  if(error){
    alert('Erro ao apagar: ' + error.message);
    return;
  }

  await atualizarFluxoAposAlteracao();
}

let excluindoFluxoId = null;

function confirmarExclusaoFluxo(id){
  excluindoFluxoId = id;
  document.getElementById('confirmFluxoModal').style.display = 'flex';
}

function fecharConfirmacaoFluxo(){
  document.getElementById('confirmFluxoModal').style.display = 'none';
  excluindoFluxoId = null;
}

async function confirmarExclusaoFluxoOk(){
  if(!excluindoFluxoId) return;
  const { error } = await sb.from('fluxo_caixa_lancamentos').delete().eq('id', excluindoFluxoId);
  if(!error){
    await atualizarFluxoAposAlteracao();
  }
  fecharConfirmacaoFluxo();
}

/* ================= COMPRAS ================= */

let comprasEmpresas = [];
let comprasMarcas = [];
let comprasProdutos = [];
let comprasBuscaTexto = '';
let comprasLinhasAtuais = [];
let comprasEmpresaFiltro = '';
let comprasMarcaFiltro = '';
let produtoFotoObjectUrl = null;

function marcaEstaCompleta(marcaId){
  const produtos = comprasProdutos.filter(p=>p.marca_id===marcaId);
  return produtos.length>0 && produtos.every(p=>p.revisado);
}

function empresaEstaCompleta(empresaId){
  const marcasDaEmpresa = comprasMarcas.filter(m=>m.empresa_id===empresaId);
  if(marcasDaEmpresa.length===0) return false;
  return marcasDaEmpresa.every(m=>marcaEstaCompleta(m.id));
}

function renderComprasNav(){
  const navEmp = document.getElementById('comprasNavEmpresas');
  navEmp.innerHTML = `<button class="compras-chip ${!comprasEmpresaFiltro?'active':''}" onclick="filtrarPorEmpresa('')">Todas as empresas</button>` +
    comprasEmpresas.map(e=>`<button class="compras-chip ${empresaEstaCompleta(e.id)?'compras-chip-ok':''} ${comprasEmpresaFiltro===e.id?'active':''}" onclick="filtrarPorEmpresa('${e.id}')">${escapeHtml(e.nome)}</button>`).join('');

  const navMarca = document.getElementById('comprasNavMarcas');
  if(!comprasEmpresaFiltro){
    navMarca.style.display = 'none';
    navMarca.innerHTML = '';
  }else{
    const marcasDaEmpresa = comprasMarcas.filter(m=>m.empresa_id===comprasEmpresaFiltro);
    navMarca.style.display = 'flex';
    navMarca.innerHTML = `<button class="compras-chip ${!comprasMarcaFiltro?'active':''}" onclick="filtrarPorMarca('')">Todas as marcas</button>` +
      marcasDaEmpresa.map(m=>`<button class="compras-chip ${marcaEstaCompleta(m.id)?'compras-chip-ok':''} ${comprasMarcaFiltro===m.id?'active':''}" onclick="filtrarPorMarca('${m.id}')">${escapeHtml(m.nome)}</button>`).join('');
  }
}

function filtrarPorEmpresa(id){
  comprasEmpresaFiltro = id;
  comprasMarcaFiltro = '';
  renderComprasNav();
  renderCompras();
}

function filtrarPorMarca(id){
  comprasMarcaFiltro = id;
  renderComprasNav();
  renderCompras();
}
let produtoEditandoId = null;

async function carregarCompras(){
  const [rEmpresas, rMarcas, rProdutos] = await Promise.all([
    sb.from('compras_empresas').select('*').eq('loja', lojaAtual).order('nome'),
    sb.from('compras_marcas').select('*').eq('loja', lojaAtual).order('nome'),
    sb.from('compras_produtos').select('*').eq('loja', lojaAtual).order('nome')
  ]);
  if(rEmpresas.error || rMarcas.error || rProdutos.error){
    console.error('Erro ao carregar compras:', rEmpresas.error || rMarcas.error || rProdutos.error);
  }
  comprasEmpresas = rEmpresas.data || [];
  comprasMarcas = rMarcas.data || [];
  comprasProdutos = rProdutos.data || [];
  await carregarFotosProdutosCompras();
  comprasEmpresaFiltro = '';
  comprasMarcaFiltro = '';
  renderComprasNav();
  renderCompras();
}

async function carregarFotosProdutosCompras(){
  const comFoto=comprasProdutos.filter(p=>p.foto_caminho);
  comprasProdutos.forEach(p=>p.foto_url=null);
  if(!comFoto.length)return;
  const caminhos=comFoto.map(p=>p.foto_caminho);
  const {data,error}=await sb.storage.from('compras-produtos').createSignedUrls(caminhos,3600);
  if(error){console.warn('Não foi possível carregar as fotos dos produtos:',error);return;}
  (data||[]).forEach((item,i)=>{if(comFoto[i])comFoto[i].foto_url=item.signedUrl||null;});
}

async function abrirFotoProduto(caminho){
  const {data,error}=await sb.storage.from('compras-produtos').createSignedUrl(caminho,3600);
  if(error||!data?.signedUrl){alert('Não foi possível abrir a foto do produto.');return;}
  window.open(data.signedUrl,'_blank','noopener');
}

function filtrarCompras(){
  comprasBuscaTexto = document.getElementById('comprasBusca').value.trim().toLowerCase();
  renderCompras();
}

function renderCompras(){
  let linhas = comprasProdutos.map(p=>{
    const marca = comprasMarcas.find(m=>m.id===p.marca_id);
    const empresa = marca ? comprasEmpresas.find(e=>e.id===marca.empresa_id) : null;
    return { produto: p, marcaNome: marca ? marca.nome : '—', empresaNome: empresa ? empresa.nome : '—' };
  });

  if(comprasEmpresaFiltro){
    linhas = linhas.filter(l=>{
      const marca = comprasMarcas.find(m=>m.id===l.produto.marca_id);
      return marca && marca.empresa_id === comprasEmpresaFiltro;
    });
  }
  if(comprasMarcaFiltro){
    linhas = linhas.filter(l=>l.produto.marca_id===comprasMarcaFiltro);
  }

  if(comprasBuscaTexto){
    linhas = linhas.filter(l=>
      l.produto.nome.toLowerCase().includes(comprasBuscaTexto) ||
      l.marcaNome.toLowerCase().includes(comprasBuscaTexto) ||
      l.empresaNome.toLowerCase().includes(comprasBuscaTexto)
    );
  }

  linhas.sort((a,b)=> a.empresaNome.localeCompare(b.empresaNome) || a.marcaNome.localeCompare(b.marcaNome) || a.produto.nome.localeCompare(b.produto.nome));

  comprasLinhasAtuais = linhas;

  const body = document.getElementById('comprasBody');
  const empty = document.getElementById('comprasEmpty');
  if(linhas.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = linhas.map(l=>{
    const p = l.produto;
    const temFalta = Number(p.quantidade_comprar) > 0;
    const embalagemLabel = p.tipo_embalagem==='fardo' ? 'Fardo' : 'Caixa';
    return `<div class="compras-row">
      <div class="campo"><span class="lbl-mobile">Foto</span>${p.foto_url?`<button type="button" class="compras-foto com-imagem" title="Abrir foto de ${escapeHtml(p.nome)}" data-caminho="${escapeHtml(p.foto_caminho)}" onclick="abrirFotoProduto(this.dataset.caminho)"><img src="${escapeHtml(p.foto_url)}" alt="${escapeHtml(p.nome)}"></button>`:'<div class="compras-foto" title="Produto sem foto">📷</div>'}</div>
      <div class="campo"><span class="lbl-mobile">Empresa</span>${escapeHtml(l.empresaNome)}</div>
      <div class="campo"><span class="lbl-mobile">Marca</span>${escapeHtml(l.marcaNome)}</div>
      <div class="campo"><span class="lbl-mobile">Produto</span>${escapeHtml(p.nome)}</div>
      <div class="campo"><span class="lbl-mobile">Embalagem</span>${embalagemLabel}</div>
      <div class="campo"><span class="lbl-mobile">Mín. (un)</span>${p.estoque_min_unidades ?? 0}</div>
      <div class="campo"><span class="lbl-mobile">Mín. (emb)</span>${p.estoque_min_caixas ?? 0}</div>
      <div class="campo"><span class="lbl-mobile">Atual (un)</span><input class="comprar-input" data-compra-campo="estoque_atual_unidades" data-produto-id="${p.id}" type="number" min="0" step="1" value="${p.estoque_atual_unidades ?? 0}" onblur="atualizarEstoqueAtual('${p.id}', 'estoque_atual_unidades', this.value)" onkeydown="avancarCompraAoEnter(event, '${p.id}', 'estoque_atual_unidades')"></div>
      <div class="campo"><span class="lbl-mobile">Atual (emb)</span><input class="comprar-input" data-compra-campo="estoque_atual_caixas" data-produto-id="${p.id}" type="number" min="0" step="1" value="${p.estoque_atual_caixas ?? 0}" onblur="atualizarEstoqueAtual('${p.id}', 'estoque_atual_caixas', this.value)" onkeydown="avancarCompraAoEnter(event, '${p.id}', 'estoque_atual_caixas')"></div>
      <div class="campo"><span class="lbl-mobile">Comprar</span><input class="comprar-input ${temFalta?'tem-falta':''}" data-compra-campo="quantidade_comprar" data-produto-id="${p.id}" type="number" min="0" step="1" value="${p.quantidade_comprar ?? 0}" onblur="atualizarQuantidadeComprar('${p.id}', this.value)" onkeydown="avancarCompraAoEnter(event, '${p.id}', 'quantidade_comprar')"></div>
      <div class="campo"><span class="lbl-mobile">Ações</span><div class="rowactions">
        <button class="iconbtn edit" title="Editar" onclick="abrirEditarProduto('${p.id}')">✎</button>
        <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoProduto('${p.id}')">✕</button>
      </div></div>
    </div>`;
  }).join('');
}

function itensParaComprar(){
  return comprasLinhasAtuais.filter(l=>Number(l.produto.quantidade_comprar) > 0)
    .sort((a,b)=> a.empresaNome.localeCompare(b.empresaNome) || a.marcaNome.localeCompare(b.marcaNome) || a.produto.nome.localeCompare(b.produto.nome));
}

function itensRevisados(){
  return comprasLinhasAtuais.filter(l=>l.produto.revisado)
    .sort((a,b)=> a.empresaNome.localeCompare(b.empresaNome) || a.marcaNome.localeCompare(b.marcaNome) || a.produto.nome.localeCompare(b.produto.nome));
}

function exportarExcelListaCompras(){
  const itens = itensParaComprar();
  if(itens.length===0){ alert('Nenhum item com quantidade a comprar preenchida (com o filtro/busca atual).'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const dados = itens.map(l=>({
    'Empresa': l.empresaNome,
    'Marca': l.marcaNome,
    'Produto': l.produto.nome,
    'Embalagem': l.produto.tipo_embalagem==='fardo' ? 'Fardo' : 'Caixa',
    'Comprar': l.produto.quantidade_comprar
  }));
  const planilha = XLSX.utils.json_to_sheet(dados);
  planilha['!cols'] = [{wch:22},{wch:18},{wch:36},{wch:12},{wch:10}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Lista de Compras');
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  const dataArquivo = new Date().toISOString().slice(0,10);
  XLSX.writeFile(livro, 'lista-de-compras-' + nomeLoja + '-' + dataArquivo + '.xlsx');
}

async function exportarPdfListaCompras(){
  const itens = itensParaComprar();
  if(itens.length===0){ alert('Nenhum item com quantidade a comprar preenchida (com o filtro/busca atual).'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);

  doc.setFontSize(16);
  doc.text('Lista de Compras — ' + (NOMES_LOJA[lojaAtual]||''), 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Gerado em ' + dataHora, 14, 25);

  abrirProgresso('Preparando pedido com fotos…');
  const fotos=new Map();
  await Promise.all(itens.map(async l=>{if(l.produto.foto_caminho){const foto=await fotoProdutoParaPdf(l.produto.foto_caminho);if(foto)fotos.set(l.produto.id,foto);}}));
  let corpo = [];
  let empresaAnterior = null;
  itens.forEach(l=>{
    if(l.empresaNome !== empresaAnterior){
      corpo.push([{ content: l.empresaNome, colSpan: 5, styles: { fontStyle:'bold', fillColor:[233,225,203], textColor:20 } }]);
      empresaAnterior = l.empresaNome;
    }
    const embalagemLabel = l.produto.tipo_embalagem==='fardo' ? 'Fardo' : 'Caixa';
    corpo.push([{content:'',fotoData:fotos.get(l.produto.id)||null,styles:{minCellHeight:16}},l.marcaNome,l.produto.nome,embalagemLabel,String(l.produto.quantidade_comprar)]);
  });

  doc.autoTable({
    startY: 32,
    head: [['Foto','Marca','Produto','Embalagem','Comprar']],
    body: corpo,
    styles: { fontSize: 9, cellPadding: 3.5 },
    headStyles: { fillColor: [38,51,43] },
    columnStyles:{0:{cellWidth:18,halign:'center'},4:{halign:'center'}},
    didDrawCell:data=>{if(data.section==='body'&&data.column.index===0&&data.cell.raw&&data.cell.raw.fotoData){try{doc.addImage(data.cell.raw.fotoData,undefined,data.cell.x+2,data.cell.y+2,14,12);}catch(e){console.warn('Foto não incluída no PDF:',e);}}}
  });

  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  const dataArquivo = agora.toISOString().slice(0,10);
  fecharProgresso();
  doc.save('lista-de-compras-' + nomeLoja + '-' + dataArquivo + '.pdf');
}

async function fotoProdutoParaPdf(caminho){
  try{
    const {data,error}=await sb.storage.from('compras-produtos').createSignedUrl(caminho,600);
    if(error||!data?.signedUrl)return null;
    const resposta=await fetch(data.signedUrl);if(!resposta.ok)return null;
    const blob=await resposta.blob();
    return await new Promise(resolve=>{const leitor=new FileReader();leitor.onload=()=>resolve(leitor.result);leitor.onerror=()=>resolve(null);leitor.readAsDataURL(blob);});
  }catch(e){console.warn('Não foi possível preparar uma foto para o PDF:',e);return null;}
}

function confirmarZerarComprar(){
  const itens = itensRevisados();
  if(itens.length===0){
    alert('Nenhum item revisado (com o filtro/busca atual). Preencha o campo "Atual" de pelo menos um produto primeiro.');
    return;
  }
  document.getElementById('zerarComprarTexto').textContent =
    'Isso zera a quantidade a comprar E o estoque atual (unidades e embalagem) de ' + itens.length + ' produto(s) já revisados, que estão visíveis com o filtro/busca atual. Os mínimos cadastrados não mudam.';
  document.getElementById('confirmZerarComprarModal').style.display = 'flex';
}

function fecharZerarComprar(){
  document.getElementById('confirmZerarComprarModal').style.display = 'none';
}

async function confirmarZerarComprarOk(){
  const itens = itensRevisados();
  const ids = itens.map(l=>l.produto.id);
  const { error } = await sb.from('compras_produtos').update({
    quantidade_comprar: 0,
    estoque_atual_unidades: 0,
    estoque_atual_caixas: 0,
    revisado: false
  }).in('id', ids);
  fecharZerarComprar();
  if(error){
    alert('Erro ao zerar: ' + error.message);
    return;
  }
  ids.forEach(id=>{
    const p = comprasProdutos.find(x=>x.id===id);
    if(p){
      p.quantidade_comprar = 0;
      p.estoque_atual_unidades = 0;
      p.estoque_atual_caixas = 0;
      p.revisado = false;
    }
  });
  renderComprasNav();
  renderCompras();
}

async function atualizarQuantidadeComprar(id, valor){
  const num = parseFloat(valor);
  const v = isNaN(num) || num<0 ? 0 : num;
  const p = comprasProdutos.find(x=>x.id===id);
  if(p) p.quantidade_comprar = v;
  const input = document.querySelector(`[data-compra-campo="quantidade_comprar"][data-produto-id="${id}"]`);
  if(input){
    input.value = v;
    input.classList.toggle('tem-falta', v > 0);
  }
  const { error } = await sb.from('compras_produtos').update({ quantidade_comprar: v }).eq('id', id);
  if(error) console.error('Erro ao salvar quantidade a comprar:', error);
}

function avancarCompraAoEnter(event, id, campo){
  if(event.key !== 'Enter') return;
  event.preventDefault();
  event.stopPropagation();

  const campos = Array.from(document.querySelectorAll(`[data-compra-campo="${campo}"]`));
  const indiceAtual = campos.findIndex(input=>input.dataset.produtoId===id);
  const proximoCampo = indiceAtual >= 0 && indiceAtual < campos.length - 1
    ? campos[indiceAtual + 1]
    : null;

  if(proximoCampo){
    proximoCampo.focus({ preventScroll: true });
    proximoCampo.select();
  }else{
    event.currentTarget.blur();
  }
}

async function atualizarEstoqueAtual(id, campo, valor){
  const num = parseFloat(valor);
  const v = isNaN(num) || num<0 ? 0 : num;
  const p = comprasProdutos.find(x=>x.id===id);

  const atualizacao = { [campo]: v, revisado: true };
  if(p){
    const estoqueMinimo = campo === 'estoque_atual_unidades'
      ? Number(p.estoque_min_unidades||0)
      : Number(p.estoque_min_caixas||0);
    atualizacao.quantidade_comprar = Math.max(0, estoqueMinimo - v);
  }

  if(p){
    Object.assign(p, atualizacao);
    const inputComprar = document.querySelector(`[data-compra-campo="quantidade_comprar"][data-produto-id="${id}"]`);
    if(inputComprar){
      inputComprar.value = atualizacao.quantidade_comprar;
      inputComprar.classList.toggle('tem-falta', atualizacao.quantidade_comprar > 0);
    }
  }
  const { error } = await sb.from('compras_produtos').update(atualizacao).eq('id', id);
  if(error) console.error('Erro ao salvar estoque atual:', error);
}

function popularSelectEmpresaProduto(selecionarId){
  const sel = document.getElementById('produto_empresa');
  sel.innerHTML = '<option value="">Selecione</option>' +
    comprasEmpresas.map(e=>`<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('') +
    '<option value="__nova__">+ Nova empresa</option>';
  sel.value = selecionarId || '';
}

function popularSelectMarcaProduto(empresaId, selecionarId){
  const sel = document.getElementById('produto_marca');
  if(!empresaId){
    sel.innerHTML = '<option value="">Selecione a empresa primeiro</option>';
    return;
  }
  const marcasDaEmpresa = comprasMarcas.filter(m=>m.empresa_id===empresaId);
  sel.innerHTML = '<option value="">Selecione</option>' +
    marcasDaEmpresa.map(m=>`<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('') +
    '<option value="__nova__">+ Nova marca</option>';
  sel.value = selecionarId || '';
}

function onMudarEmpresaProduto(){
  const val = document.getElementById('produto_empresa').value;
  document.getElementById('produto_empresa_nova').style.display = (val==='__nova__') ? 'block' : 'none';
  document.getElementById('produto_marca_nova').style.display = 'none';
  if(val==='__nova__'){
    // empresa ainda não existe, então só é possível criar uma marca nova também
    const sel = document.getElementById('produto_marca');
    sel.innerHTML = '<option value="__nova__">+ Nova marca</option>';
    sel.value = '__nova__';
    document.getElementById('produto_marca_nova').style.display = 'block';
  }else if(val){
    popularSelectMarcaProduto(val);
  }else{
    popularSelectMarcaProduto(null);
  }
}

function onMudarMarcaProduto(){
  const val = document.getElementById('produto_marca').value;
  document.getElementById('produto_marca_nova').style.display = (val==='__nova__') ? 'block' : 'none';
}

function abrirNovoProduto(){
  produtoEditandoId = null;
  document.getElementById('produtoModalTitulo').textContent = 'Novo produto';
  popularSelectEmpresaProduto();
  popularSelectMarcaProduto(null);
  document.getElementById('produto_empresa_nova').style.display = 'none';
  document.getElementById('produto_empresa_nova').value = '';
  document.getElementById('produto_marca_nova').style.display = 'none';
  document.getElementById('produto_marca_nova').value = '';
  document.getElementById('produto_nome').value = '';
  limparFotoProdutoModal();
  setTipoEmbalagem('caixa');
  document.getElementById('produto_fator_embalagem').value = '';
  document.getElementById('produto_min_unidades').value = '';
  document.getElementById('produto_min_caixas').value = '';
  document.getElementById('produto_atual_unidades').value = '';
  document.getElementById('produto_atual_caixas').value = '';
  document.getElementById('produto_qtd_comprar').value = '';
  document.getElementById('produtoErr').style.display = 'none';
  document.getElementById('produtoModal').style.display = 'flex';
}

function limparFotoProdutoModal(){
  if(produtoFotoObjectUrl){URL.revokeObjectURL(produtoFotoObjectUrl);produtoFotoObjectUrl=null;}
  document.getElementById('produto_foto').value='';document.getElementById('produto_remover_foto').checked=false;
  document.getElementById('produtoRemoverFotoWrap').style.display='none';document.getElementById('produtoFotoPreview').style.display='none';document.getElementById('produtoFotoPreview').removeAttribute('src');
  document.getElementById('produtoFotoSemImagem').style.display='flex';document.getElementById('produtoFotoNome').textContent='Nenhuma foto cadastrada.';
}

function definirFotoProdutoModal(url,nome,temAtual){
  const img=document.getElementById('produtoFotoPreview');img.src=url;img.style.display='block';document.getElementById('produtoFotoSemImagem').style.display='none';
  document.getElementById('produtoFotoNome').textContent=nome||'Foto do produto';document.getElementById('produtoRemoverFotoWrap').style.display=temAtual?'block':'none';
}

function preverFotoProduto(arquivo){
  if(!arquivo)return;
  const erro=validarArquivoLocal(arquivo,'documento');
  if(erro||!['image/jpeg','image/png','image/webp'].includes(String(arquivo.type||'').toLowerCase())){alert(erro||'Selecione uma imagem JPG, PNG ou WEBP.');document.getElementById('produto_foto').value='';return;}
  if(arquivo.size>6*1024*1024){alert('A foto não pode ultrapassar 6 MB.');document.getElementById('produto_foto').value='';return;}
  if(produtoFotoObjectUrl)URL.revokeObjectURL(produtoFotoObjectUrl);produtoFotoObjectUrl=URL.createObjectURL(arquivo);document.getElementById('produto_remover_foto').checked=false;definirFotoProdutoModal(produtoFotoObjectUrl,arquivo.name,false);
}

async function compactarFotoProduto(arquivo){
  let bitmap=null;
  try{bitmap=await createImageBitmap(arquivo);const limite=1200,escala=Math.min(1,limite/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*escala)),h=Math.max(1,Math.round(bitmap.height*escala));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));if(blob)return {blob,tipo:'image/jpeg',ext:'jpg'};}catch(e){console.warn('Não foi possível reduzir a foto:',e);}finally{if(bitmap&&bitmap.close)bitmap.close();}
  const tipo=String(arquivo.type||'image/jpeg').toLowerCase(),ext=tipo==='image/png'?'png':tipo==='image/webp'?'webp':'jpg';return {blob:arquivo,tipo,ext};
}

function setTipoEmbalagem(tipo){
  document.querySelectorAll('#embalagemToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.emb===tipo));
  const rotulo = tipo==='fardo' ? 'fardos' : 'caixas';
  const rotuloSingular = tipo==='fardo' ? 'fardo' : 'caixa';
  document.getElementById('lbl_min_caixas').textContent = 'Estoque mínimo (' + rotulo + ')';
  document.getElementById('lbl_atual_caixas').textContent = 'Estoque atual (' + rotulo + ')';
  document.getElementById('lbl_fator_embalagem').textContent = 'Fator de embalagem (unidades por ' + rotuloSingular + ')';
}

function calcularUnidadesPorFator(idCampoCaixa, idCampoUnidades){
  const fator = parseFloat(document.getElementById('produto_fator_embalagem').value);
  const caixas = parseFloat(document.getElementById(idCampoCaixa).value);
  if(!isNaN(fator) && fator>0 && !isNaN(caixas)){
    document.getElementById(idCampoUnidades).value = Math.round(caixas * fator);
  }
}

function calcularQuantidadeComprarModal(){
  const min = parseFloat(document.getElementById('produto_min_caixas').value);
  const atual = parseFloat(document.getElementById('produto_atual_caixas').value);
  if(!isNaN(min) && !isNaN(atual)){
    document.getElementById('produto_qtd_comprar').value = Math.max(0, min - atual);
  }
}

function abrirEditarProduto(id){
  const p = comprasProdutos.find(x=>x.id===id);
  if(!p) return;
  const marca = comprasMarcas.find(m=>m.id===p.marca_id);
  const empresaId = marca ? marca.empresa_id : null;

  produtoEditandoId = id;
  document.getElementById('produtoModalTitulo').textContent = 'Editar produto';
  popularSelectEmpresaProduto(empresaId);
  popularSelectMarcaProduto(empresaId, p.marca_id);
  document.getElementById('produto_empresa_nova').style.display = 'none';
  document.getElementById('produto_empresa_nova').value = '';
  document.getElementById('produto_marca_nova').style.display = 'none';
  document.getElementById('produto_marca_nova').value = '';
  document.getElementById('produto_nome').value = p.nome;
  limparFotoProdutoModal();
  if(p.foto_url)definirFotoProdutoModal(p.foto_url,p.foto_nome||'Foto atual',true);
  setTipoEmbalagem(p.tipo_embalagem || 'caixa');
  document.getElementById('produto_fator_embalagem').value = p.fator_embalagem ?? '';
  document.getElementById('produto_min_unidades').value = p.estoque_min_unidades ?? '';
  document.getElementById('produto_min_caixas').value = p.estoque_min_caixas ?? '';
  document.getElementById('produto_atual_unidades').value = p.estoque_atual_unidades ?? '';
  document.getElementById('produto_atual_caixas').value = p.estoque_atual_caixas ?? '';
  document.getElementById('produto_qtd_comprar').value = p.quantidade_comprar ?? '';
  document.getElementById('produtoErr').style.display = 'none';
  document.getElementById('produtoModal').style.display = 'flex';
}

function fecharProdutoModal(){
  document.getElementById('produtoModal').style.display = 'none';
  produtoEditandoId = null;
}

async function salvarProduto(){
  const err = document.getElementById('produtoErr');
  let empresaId = document.getElementById('produto_empresa').value;
  let marcaId = document.getElementById('produto_marca').value;
  const nomeProduto = document.getElementById('produto_nome').value.trim();
  const tipoEmbalagem = document.querySelector('#embalagemToggle .tipo-btn.active').dataset.emb;
  const fatorEmbalagem = parseFloat(document.getElementById('produto_fator_embalagem').value) || null;
  const minUnidades = parseFloat(document.getElementById('produto_min_unidades').value) || 0;
  const minCaixas = parseFloat(document.getElementById('produto_min_caixas').value) || 0;
  const atualUnidades = parseFloat(document.getElementById('produto_atual_unidades').value) || 0;
  const atualCaixas = parseFloat(document.getElementById('produto_atual_caixas').value) || 0;
  const qtdComprar = parseFloat(document.getElementById('produto_qtd_comprar').value) || 0;
  const novaEmpresaNome = document.getElementById('produto_empresa_nova').value.trim();
  const novaMarcaNome = document.getElementById('produto_marca_nova').value.trim();
  const fotoArquivo=document.getElementById('produto_foto').files[0]||null;
  const removerFoto=document.getElementById('produto_remover_foto').checked;
  const produtoAtual=produtoEditandoId?comprasProdutos.find(p=>p.id===produtoEditandoId):null;

  if(empresaId==='__nova__' && !novaEmpresaNome){
    err.textContent = 'Digite o nome da nova empresa.'; err.style.display = 'block'; return;
  }
  if(marcaId==='__nova__' && !novaMarcaNome){
    err.textContent = 'Digite o nome da nova marca.'; err.style.display = 'block'; return;
  }
  if(!nomeProduto){
    err.textContent = 'Preencha o nome do produto.'; err.style.display = 'block'; return;
  }
  if(empresaId!=='__nova__' && !empresaId){
    err.textContent = 'Selecione ou crie uma empresa.'; err.style.display = 'block'; return;
  }
  if(marcaId!=='__nova__' && !marcaId){
    err.textContent = 'Selecione ou crie uma marca.'; err.style.display = 'block'; return;
  }
  err.style.display = 'none';

  if(empresaId==='__nova__'){
    const { data: novaEmpresa, error: erroEmp } = await sb.from('compras_empresas').insert({ loja: lojaAtual, nome: novaEmpresaNome }).select().single();
    if(erroEmp){ err.textContent = 'Erro ao criar empresa: ' + erroEmp.message; err.style.display='block'; return; }
    comprasEmpresas.push(novaEmpresa);
    empresaId = novaEmpresa.id;
  }

  if(marcaId==='__nova__'){
    const { data: novaMarca, error: erroMarca } = await sb.from('compras_marcas').insert({ loja: lojaAtual, empresa_id: empresaId, nome: novaMarcaNome }).select().single();
    if(erroMarca){ err.textContent = 'Erro ao criar marca: ' + erroMarca.message; err.style.display='block'; return; }
    comprasMarcas.push(novaMarca);
    marcaId = novaMarca.id;
  }

  const payload = {
    loja: lojaAtual, marca_id: marcaId, nome: nomeProduto, tipo_embalagem: tipoEmbalagem,
    fator_embalagem: fatorEmbalagem,
    estoque_min_unidades: minUnidades, estoque_min_caixas: minCaixas,
    estoque_atual_unidades: atualUnidades, estoque_atual_caixas: atualCaixas,
    quantidade_comprar: qtdComprar, revisado: true
  };

  let novoCaminho=null;
  if(fotoArquivo){
    const fotoPreparada=await compactarFotoProduto(fotoArquivo);novoCaminho=lojaAtual+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,9)+'.'+fotoPreparada.ext;
    const {error:erroUpload}=await sb.storage.from('compras-produtos').upload(novoCaminho,fotoPreparada.blob,{contentType:fotoPreparada.tipo,upsert:false});
    if(erroUpload){err.textContent='Não foi possível enviar a foto. Execute primeiro o SQL de fotos dos produtos no Supabase.';err.style.display='block';console.error(erroUpload);return;}
    payload.foto_caminho=novoCaminho;payload.foto_nome=fotoArquivo.name;payload.foto_tipo=fotoPreparada.tipo;
  }else if(removerFoto&&produtoAtual?.foto_caminho){payload.foto_caminho=null;payload.foto_nome=null;payload.foto_tipo=null;}

  if(produtoEditandoId){
    const { data, error } = await sb.from('compras_produtos').update(payload).eq('id', produtoEditandoId).select().single();
    if(error){if(novoCaminho)await sb.storage.from('compras-produtos').remove([novoCaminho]);err.textContent = 'Erro ao salvar: ' + error.message; err.style.display='block'; return; }
    const idx = comprasProdutos.findIndex(p=>p.id===produtoEditandoId);
    if(idx>-1) comprasProdutos[idx] = data;
  }else{
    const { data, error } = await sb.from('compras_produtos').insert(payload).select().single();
    if(error){if(novoCaminho)await sb.storage.from('compras-produtos').remove([novoCaminho]);err.textContent = 'Erro ao salvar: ' + error.message; err.style.display='block'; return; }
    comprasProdutos.push(data);
  }

  if(produtoAtual?.foto_caminho&&(novoCaminho||removerFoto))await sb.storage.from('compras-produtos').remove([produtoAtual.foto_caminho]);
  await carregarFotosProdutosCompras();

  renderComprasNav();
  renderCompras();
  fecharProdutoModal();
}

let excluindoProdutoId = null;

function confirmarExclusaoProduto(id){
  excluindoProdutoId = id;
  document.getElementById('confirmProdutoModal').style.display = 'flex';
}

function fecharConfirmacaoProduto(){
  document.getElementById('confirmProdutoModal').style.display = 'none';
  excluindoProdutoId = null;
}

async function confirmarExclusaoProdutoOk(){
  if(!excluindoProdutoId) return;
  const produtoExcluido=comprasProdutos.find(p=>p.id===excluindoProdutoId);
  const { error } = await sb.from('compras_produtos').delete().eq('id', excluindoProdutoId);
  if(!error){
    if(produtoExcluido?.foto_caminho)await sb.storage.from('compras-produtos').remove([produtoExcluido.foto_caminho]);
    comprasProdutos = comprasProdutos.filter(p=>p.id!==excluindoProdutoId);
    renderCompras();
  }
  fecharConfirmacaoProduto();
}

/* ================= PAGAMENTOS (extrato bancário) ================= */

let pagamentosCache = [];
let pagamentosMesAtual = 'todos';
let pagamentosBuscaTexto = '';
let pagamentoEditandoId = null;
let excluindoPagamentoId = null;

async function abrirPagamentos(){
  if(!document.getElementById('novoPag_data').value){
    document.getElementById('novoPag_data').value = todayStr();
  }
  await carregarTiposPagCaixaSeNecessario();
  await carregarMemoriaGlobal();
  await popularFiltroMesPagamentos();
  const mesAtual = new Date().toISOString().slice(0,7);
  document.getElementById('pagamentosFiltroMes').value = mesAtual;
  pagamentosMesAtual = mesAtual;
  await carregarPagamentos();
}

async function salvarNovoPagamento(){
  const descricao = document.getElementById('novoPag_descricao').value.trim();
  const data = document.getElementById('novoPag_data').value;
  const valorBruto = parseFloat(document.getElementById('novoPag_valor').value);
  const tipoId = document.getElementById('novoPag_tipo').value || null;
  const err = document.getElementById('novoPagamentoErr');

  if(!descricao || !data || isNaN(valorBruto) || valorBruto<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const { data: salvo, error } = await sb.from('fluxo_caixa_lancamentos').insert({
    loja: lojaAtual,
    data: data,
    tipo: 'Pagamento',
    descricao: descricao,
    valor: -Math.abs(valorBruto),
    codigo_tipo_id: tipoId
  }).select().single();

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  if(tipoId) await gravarMemoriaPagCaixa(descricao, tipoId);

  pagamentosCache.push(salvo);
  document.getElementById('novoPag_descricao').value = '';
  document.getElementById('novoPag_valor').value = '';
  document.getElementById('novoPag_tipo').value = '';
  document.getElementById('novoPag_tipo_busca').value = '';
  renderPagamentos();
  await popularFiltroMesPagamentos();
}

async function popularFiltroMesPagamentos(){
  const { data, error } = await buscarTodasLinhas((from, to)=>
    sb.from('fluxo_caixa_lancamentos').select('data').eq('loja', lojaAtual).neq('tipo','Dinheiro').lt('valor', 0).range(from, to)
  );
  if(error){ console.error('Erro ao carregar meses de pagamentos:', error); return; }
  const mesesSet = new Set((data||[]).map(d=>d.data.slice(0,7)));
  const hoje = new Date();
  mesesSet.add(hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0'));
  const lista = Array.from(mesesSet).sort().reverse();
  const sel = document.getElementById('pagamentosFiltroMes');
  const atual = sel.value || 'todos';
  sel.innerHTML = '<option value="todos">Todos os meses</option>' + lista.map(chave=>{
    const [ano, mes] = chave.split('-');
    return `<option value="${chave}">${NOMES_MES[parseInt(mes,10)-1]} ${ano}</option>`;
  }).join('');
  sel.value = lista.includes(atual) || atual==='todos' ? atual : 'todos';
}

function mudarMesPagamentos(valor){
  pagamentosMesAtual = valor;
  carregarPagamentos();
}

async function carregarPagamentos(){
  let de = null, ate = null;
  if(pagamentosMesAtual !== 'todos'){
    const [ano, mes] = pagamentosMesAtual.split('-');
    const ultimoDia = new Date(parseInt(ano,10), parseInt(mes,10), 0).getDate();
    de = pagamentosMesAtual + '-01';
    ate = pagamentosMesAtual + '-' + String(ultimoDia).padStart(2,'0');
  }

  const { data, error } = await buscarTodasLinhas((from, to)=>{
    let q = sb.from('fluxo_caixa_lancamentos').select('*').eq('loja', lojaAtual).neq('tipo','Dinheiro').lt('valor', 0);
    if(de) q = q.gte('data', de);
    if(ate) q = q.lte('data', ate);
    return q.order('data').range(from, to);
  });

  if(error){
    console.error('Erro ao carregar pagamentos:', error);
    pagamentosCache = [];
  }else{
    pagamentosCache = data || [];
  }
  renderPagamentos();
}

function filtrarPagamentos(){
  pagamentosBuscaTexto = document.getElementById('pagamentosBusca').value.trim().toLowerCase();
  renderPagamentos();
}

function renderPagamentos(){
  let linhas = pagamentosCache;
  if(pagamentosBuscaTexto){
    linhas = linhas.filter(l=>{
      const texto = [fmtData(l.data), l.descricao, brl(l.valor), String(l.valor).replace('.',',')].join(' ').toLowerCase();
      return texto.includes(pagamentosBuscaTexto);
    });
  }

  const total = linhas.reduce((s,l)=>s+Math.abs(Number(l.valor)), 0);
  document.getElementById('pagamentosTotal').textContent = brl(total);
  document.getElementById('pagamentosQtd').textContent = linhas.length;

  const body = document.getElementById('pagamentosBody');
  const empty = document.getElementById('pagamentosEmpty');
  if(linhas.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = pagamentosBuscaTexto ? 'Nenhum pagamento encontrado para essa busca.' : 'Nenhum pagamento nesse período.';
  }else{
    empty.style.display = 'none';
    body.innerHTML = linhas.map(l=>`
      <tr>
        <td class="data">${fmtData(l.data)}</td>
        <td class="contato">${escapeHtml(l.descricao || '—')}</td>
        <td>${celulaTipoFluxo(l, 'pagamentos')}</td>
        <td class="valor" style="color:var(--rust);">${brl(l.valor)}</td>
        <td><div class="rowactions">
          <button class="iconbtn edit" title="Editar" onclick="abrirEditarPagamento('${l.id}')">✎</button>
          <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoPagamento('${l.id}')">✕</button>
        </div></td>
      </tr>
    `).join('');
  }
}

// mostra o tipo já classificado, ou — se ainda não tiver um e a memória souber uma sugestão pra
// essa descrição — mostra um botão de confirmação de um clique (nunca salva sozinho sem confirmar)
function celulaTipoFluxo(l, origem){
  if(l.codigo_tipo_id){
    const tipo = pagCaixaTiposCache.find(t=>String(t.id)===String(l.codigo_tipo_id));
    return tipo ? escapeHtml(labelTipoPagCaixa(tipo)) : '—';
  }
  const chave = (l.descricao||'').trim().toLowerCase();
  const tipoSugeridoId = chave ? mapaMemoriaGlobal[chave] : null;
  if(tipoSugeridoId){
    const tipo = pagCaixaTiposCache.find(t=>String(t.id)===String(tipoSugeridoId));
    if(tipo){
      return `<button class="filter-btn" style="padding:3px 8px;font-size:11px;color:var(--gold);" title="Sugestão baseada em classificações anteriores — clique pra confirmar" onclick="confirmarSugestaoTipoFluxo('${l.id}', '${tipo.id}', '${origem}')">💡 ${escapeHtml(labelTipoPagCaixa(tipo))}</button>`;
    }
  }
  return '<span style="color:var(--muted);">—</span>';
}

async function confirmarSugestaoTipoFluxo(id, tipoId, origem){
  const { data, error } = await sb.from('fluxo_caixa_lancamentos').update({ codigo_tipo_id: tipoId }).eq('id', id).select().single();
  if(error){ alert('Erro ao salvar: ' + error.message); return; }
  if(origem==='pagamentos'){
    const idx = pagamentosCache.findIndex(l=>String(l.id)===String(id));
    if(idx>-1) pagamentosCache[idx] = data;
    renderPagamentos();
  }else{
    const idx = fluxoCache.findIndex(l=>String(l.id)===String(id));
    if(idx>-1) fluxoCache[idx] = data;
    renderFluxoCaixa();
  }
}

function abrirEditarPagamento(id){
  const l = pagamentosCache.find(x=>x.id===id);
  if(!l) return;
  pagamentoEditandoId = id;
  document.getElementById('pag_descricao').value = l.descricao || '';
  document.getElementById('pag_data').value = l.data;
  document.getElementById('pag_valor').value = Math.abs(Number(l.valor));
  const tipoAtual = l.codigo_tipo_id ? pagCaixaTiposCache.find(t=>String(t.id)===String(l.codigo_tipo_id)) : null;
  document.getElementById('pag_tipo').value = l.codigo_tipo_id || '';
  document.getElementById('pag_tipo_busca').value = tipoAtual ? labelTipoPagCaixa(tipoAtual) : '';
  document.getElementById('pagamentoErr').style.display = 'none';
  document.getElementById('editPagamentoModal').style.display = 'flex';
}

function fecharEditarPagamento(){
  document.getElementById('editPagamentoModal').style.display = 'none';
  pagamentoEditandoId = null;
}

async function salvarEdicaoPagamento(){
  const descricao = document.getElementById('pag_descricao').value.trim();
  const data = document.getElementById('pag_data').value;
  const valorBruto = parseFloat(document.getElementById('pag_valor').value);
  const tipoId = document.getElementById('pag_tipo').value || null;
  const err = document.getElementById('pagamentoErr');

  if(!data || isNaN(valorBruto) || valorBruto<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const btn = document.getElementById('pagamentoSalvarBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const { data: atualizado, error } = await sb.from('fluxo_caixa_lancamentos').update({
    descricao: descricao || null,
    data: data,
    valor: -Math.abs(valorBruto),
    codigo_tipo_id: tipoId
  }).eq('id', pagamentoEditandoId).select().single();

  if(!error && tipoId && descricao) await gravarMemoriaPagCaixa(descricao, tipoId);

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  const idx = pagamentosCache.findIndex(l=>l.id===pagamentoEditandoId);
  if(idx>-1) pagamentosCache[idx] = atualizado;
  renderPagamentos();
  fecharEditarPagamento();
  await popularFiltroMesPagamentos();
}

function confirmarExclusaoPagamento(id){
  excluindoPagamentoId = id;
  document.getElementById('confirmExclusaoPagamentoModal').style.display = 'flex';
}

function fecharConfirmacaoPagamento(){
  document.getElementById('confirmExclusaoPagamentoModal').style.display = 'none';
  excluindoPagamentoId = null;
}

async function confirmarExclusaoPagamentoOk(){
  if(!excluindoPagamentoId) return;
  const { error } = await sb.from('fluxo_caixa_lancamentos').delete().eq('id', excluindoPagamentoId);
  if(!error){
    pagamentosCache = pagamentosCache.filter(l=>l.id!==excluindoPagamentoId);
    renderPagamentos();
  }
  fecharConfirmacaoPagamento();
}

function exportarExcelPagamentos(){
  if(pagamentosCache.length===0){ alert('Não há pagamentos para exportar.'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const dados = pagamentosCache.map(l=>({
    'Data': fmtData(l.data),
    'Descrição': l.descricao || '—',
    'Valor': brl(l.valor)
  }));
  const planilha = XLSX.utils.json_to_sheet(dados);
  planilha['!cols'] = [{wch:12},{wch:40},{wch:14}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Pagamentos');
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  XLSX.writeFile(livro, 'pagamentos-' + nomeLoja + '-' + new Date().toISOString().slice(0,10) + '.xlsx');
}

function exportarPdfPagamentos(){
  if(pagamentosCache.length===0){ alert('Não há pagamentos para exportar.'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);

  doc.setFontSize(16);
  doc.text('Pagamentos Feitos pela Conta — ' + (NOMES_LOJA[lojaAtual]||''), 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Gerado em ' + dataHora, 14, 25);

  const corpo = pagamentosCache.map(l=>[fmtData(l.data), l.descricao||'—', brl(l.valor)]);
  const total = pagamentosCache.reduce((s,l)=>s+Math.abs(Number(l.valor)),0);

  doc.autoTable({
    startY: 32,
    head: [['Data','Descrição','Valor']],
    body: corpo,
    foot: [['TOTAL','', brl(-total)]],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [38,51,43] },
    footStyles: { fillColor: [233,225,203], textColor:20, fontStyle:'bold' }
  });

  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  doc.save('pagamentos-' + nomeLoja + '-' + agora.toISOString().slice(0,10) + '.pdf');
}

/* ================= PAGAMENTO NO CAIXA (independente, sem ligação com outros módulos) ================= */

let pagCaixaTiposCache = [];
let pagCaixaCache = [];
let pagCaixaMesAtual = 'todos';
let pagCaixaBuscaTexto = '';
let pagCaixaEditandoId = null;
let excluindoPagCaixaId = null;

// carrega os 49 códigos de tipo de pagamento uma única vez (reaproveitado por Pagamento no Caixa,
// Pagamentos e Lançamentos em Dinheiro — é a mesma lista de códigos nos três lugares)
async function carregarTiposPagCaixaSeNecessario(){
  if(pagCaixaTiposCache.length>0) return;
  const { data, error } = await sb.from('pagamentos_caixa_tipos').select('*').order('codigo');
  pagCaixaTiposCache = error ? [] : (data || []);
  document.getElementById('pagCaixaTiposDatalist').innerHTML = pagCaixaTiposCache.map(t=>
    `<option value="${escapeHtml(labelTipoPagCaixa(t))}">`
  ).join('');
}

// memória global de sugestão (descrição → código), compartilhada entre Pagamento no Caixa,
// Pagamentos e Lançamentos em Dinheiro — quanto mais lugares alimentam ela, melhor a sugestão fica
let mapaMemoriaGlobal = {};
async function carregarMemoriaGlobal(){
  const { data } = await buscarTodasLinhas((from, to) =>
    sb.from('pagamentos_caixa_memoria').select('descricao_normalizada,codigo_tipo_id').range(from, to)
  );
  mapaMemoriaGlobal = {};
  (data||[]).forEach(h=>{ mapaMemoriaGlobal[h.descricao_normalizada] = h.codigo_tipo_id; });
}

// ao sair do campo Descrição, se a memória já souber o tipo dessa descrição, preenche sozinho —
// mas só se o campo de tipo ainda estiver vazio (nunca sobrescreve uma escolha manual) e sempre
// deixa visível pra confirmar antes de salvar, nunca salva escondido
function aplicarSugestaoTipoPagamento(idDescricao, idTipoBusca, idTipoHidden){
  const jaTemTipo = document.getElementById(idTipoHidden).value;
  if(jaTemTipo) return;
  const descricao = document.getElementById(idDescricao).value.trim().toLowerCase();
  if(!descricao) return;
  const tipoId = mapaMemoriaGlobal[descricao];
  if(!tipoId) return;
  const tipo = pagCaixaTiposCache.find(t=>String(t.id)===String(tipoId));
  if(!tipo) return;
  document.getElementById(idTipoBusca).value = labelTipoPagCaixa(tipo);
  document.getElementById(idTipoHidden).value = tipo.id;
}

async function abrirPagamentoCaixa(){
  if(!document.getElementById('pagCaixa_data').value){
    document.getElementById('pagCaixa_data').value = todayStr();
  }
  await carregarTiposPagCaixaSeNecessario();
  await carregarMemoriaGlobal();
  await popularFiltroMesPagCaixa();
  const mesAtual = new Date().toISOString().slice(0,7);
  document.getElementById('pagCaixaFiltroMes').value = mesAtual;
  pagCaixaMesAtual = mesAtual;
  await carregarPagamentoCaixa();
}

async function gravarMemoriaPagCaixa(descricao, tipoId){
  const chave = descricao.trim().toLowerCase();
  if(!chave || !tipoId) return;
  mapaMemoriaGlobal[chave] = tipoId;
  // memória compartilhada entre as duas lojas de propósito — "Água e Esgoto" é o mesmo tipo
  // de pagamento em qualquer loja, não faz sentido classificar de novo em cada uma
  await sb.from('pagamentos_caixa_memoria').upsert({
    descricao_normalizada: chave,
    codigo_tipo_id: tipoId,
    atualizado_em: new Date().toISOString()
  }, { onConflict: 'descricao_normalizada' });
}

function matchTipoPagCaixa(idBusca, idHidden){
  const texto = document.getElementById(idBusca).value.trim();
  const tipo = pagCaixaTiposCache.find(t=>labelTipoPagCaixa(t).toLowerCase()===texto.toLowerCase());
  document.getElementById(idHidden).value = tipo ? tipo.id : '';
}

async function popularFiltroMesPagCaixa(){
  const { data, error } = await buscarTodasLinhas((from, to) =>
    sb.from('pagamentos_caixa').select('data').eq('loja', lojaAtual).range(from, to)
  );
  if(error){ console.error('Erro ao carregar meses de pagamento no caixa:', error); return; }
  const mesesSet = new Set((data||[]).map(d=>d.data.slice(0,7)));
  const hoje = new Date();
  for(let i=0;i<12;i++){
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
    mesesSet.add(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
  }
  const lista = Array.from(mesesSet).sort().reverse();
  const sel = document.getElementById('pagCaixaFiltroMes');
  const atual = sel.value || 'todos';
  sel.innerHTML = '<option value="todos">Todos os meses</option>' + lista.map(chave=>{
    const [ano, mes] = chave.split('-');
    return `<option value="${chave}">${NOMES_MES[parseInt(mes,10)-1]} ${ano}</option>`;
  }).join('');
  sel.value = lista.includes(atual) || atual==='todos' ? atual : 'todos';
}

function mudarMesPagamentoCaixa(valor){
  pagCaixaMesAtual = valor;
  if(valor !== 'todos'){
    const hojeStr = todayStr();
    if(valor === hojeStr.slice(0,7)){
      document.getElementById('pagCaixa_data').value = hojeStr;
    }else{
      document.getElementById('pagCaixa_data').value = valor + '-01';
    }
  }
  carregarPagamentoCaixa();
}

async function carregarPagamentoCaixa(){
  let de = null, ate = null;
  if(pagCaixaMesAtual !== 'todos'){
    const [ano, mes] = pagCaixaMesAtual.split('-');
    const ultimoDia = new Date(parseInt(ano,10), parseInt(mes,10), 0).getDate();
    de = pagCaixaMesAtual + '-01';
    ate = pagCaixaMesAtual + '-' + String(ultimoDia).padStart(2,'0');
  }

  const { data, error } = await buscarTodasLinhas((from, to)=>{
    let q = sb.from('pagamentos_caixa').select('*, pagamentos_caixa_tipos(codigo,descricao)').eq('loja', lojaAtual);
    if(de) q = q.gte('data', de);
    if(ate) q = q.lte('data', ate);
    return q.order('data').range(from, to);
  });

  if(error){
    console.error('Erro ao carregar pagamento no caixa:', error);
    pagCaixaCache = [];
  }else{
    pagCaixaCache = data || [];
  }
  renderPagamentoCaixa();
}

function filtrarPagamentoCaixa(){
  pagCaixaBuscaTexto = document.getElementById('pagCaixaBusca').value.trim().toLowerCase();
  renderPagamentoCaixa();
}

function renderPagamentoCaixa(){
  let linhas = pagCaixaCache;
  if(pagCaixaBuscaTexto){
    linhas = linhas.filter(l=>{
      const tipo = l.pagamentos_caixa_tipos;
      const texto = [fmtData(l.data), l.descricao_pagamento, tipo?String(tipo.codigo):'', tipo?tipo.descricao:'', brl(l.valor_pagamento)].join(' ').toLowerCase();
      return texto.includes(pagCaixaBuscaTexto);
    });
  }

  const total = linhas.reduce((s,l)=>s+Number(l.valor_pagamento), 0);
  document.getElementById('pagCaixaTotal').textContent = brl(total);
  document.getElementById('pagCaixaQtd').textContent = linhas.length;

  const body = document.getElementById('pagCaixaBody');
  const empty = document.getElementById('pagCaixaEmpty');
  if(linhas.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = pagCaixaBuscaTexto ? 'Nenhum pagamento encontrado para essa busca.' : 'Nenhum pagamento nesse período.';
  }else{
    empty.style.display = 'none';
    body.innerHTML = linhas.map(l=>{
      const tipo = l.pagamentos_caixa_tipos;
      return `<tr>
        <td class="data">${fmtData(l.data)}</td>
        <td>${tipo ? tipo.codigo : '—'}</td>
        <td>${tipo ? escapeHtml(tipo.descricao) : '—'}</td>
        <td class="contato">${escapeHtml(l.descricao_pagamento)}</td>
        <td class="valor">${brl(l.valor_pagamento)}</td>
        <td><div class="rowactions">
          <button class="iconbtn edit" title="Editar" onclick="abrirEditarPagamentoCaixa('${l.id}')">✎</button>
          <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoPagCaixa('${l.id}')">✕</button>
        </div></td>
      </tr>`;
    }).join('');
  }
}

async function salvarPagamentoCaixa(){
  const descricao = document.getElementById('pagCaixa_descricao').value.trim();
  const tipoId = document.getElementById('pagCaixa_tipo').value;
  const valorBruto = parseFloat(document.getElementById('pagCaixa_valor').value);
  const data = document.getElementById('pagCaixa_data').value;
  const err = document.getElementById('pagCaixaErr');

  if(!descricao || !tipoId || !data || isNaN(valorBruto) || valorBruto<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const { data: salvo, error } = await sb.from('pagamentos_caixa').insert({
    loja: lojaAtual,
    codigo_tipo_id: tipoId,
    descricao_pagamento: descricao,
    valor_pagamento: valorBruto,
    data: data
  }).select('*, pagamentos_caixa_tipos(codigo,descricao)').single();

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  pagCaixaCache.push(salvo);
  gravarMemoriaPagCaixa(descricao, tipoId);
  document.getElementById('pagCaixa_descricao').value = '';
  document.getElementById('pagCaixa_tipo').value = '';
  document.getElementById('pagCaixa_tipo_busca').value = '';
  document.getElementById('pagCaixa_valor').value = '';
  renderPagamentoCaixa();
  await popularFiltroMesPagCaixa();
}

function abrirEditarPagamentoCaixa(id){
  const l = pagCaixaCache.find(x=>x.id===id);
  if(!l) return;
  pagCaixaEditandoId = id;
  document.getElementById('editPagCaixa_descricao').value = l.descricao_pagamento;
  document.getElementById('editPagCaixa_tipo').value = l.codigo_tipo_id;
  const tipoAtual = pagCaixaTiposCache.find(t=>t.id===l.codigo_tipo_id);
  document.getElementById('editPagCaixa_tipo_busca').value = tipoAtual ? labelTipoPagCaixa(tipoAtual) : '';
  document.getElementById('editPagCaixa_valor').value = l.valor_pagamento;
  document.getElementById('editPagCaixa_data').value = l.data;
  document.getElementById('editPagCaixaErr').style.display = 'none';
  document.getElementById('editPagCaixaModal').style.display = 'flex';
}

function fecharEditarPagamentoCaixa(){
  document.getElementById('editPagCaixaModal').style.display = 'none';
  pagCaixaEditandoId = null;
}

async function salvarEdicaoPagamentoCaixa(){
  const descricao = document.getElementById('editPagCaixa_descricao').value.trim();
  const tipoId = document.getElementById('editPagCaixa_tipo').value;
  const valorBruto = parseFloat(document.getElementById('editPagCaixa_valor').value);
  const data = document.getElementById('editPagCaixa_data').value;
  const err = document.getElementById('editPagCaixaErr');

  if(!descricao || !tipoId || !data || isNaN(valorBruto) || valorBruto<=0){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const btn = document.getElementById('editPagCaixaSalvarBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const { data: atualizado, error } = await sb.from('pagamentos_caixa').update({
    descricao_pagamento: descricao,
    codigo_tipo_id: tipoId,
    valor_pagamento: valorBruto,
    data: data
  }).eq('id', pagCaixaEditandoId).select('*, pagamentos_caixa_tipos(codigo,descricao)').single();

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  const idx = pagCaixaCache.findIndex(l=>l.id===pagCaixaEditandoId);
  if(idx>-1) pagCaixaCache[idx] = atualizado;
  gravarMemoriaPagCaixa(descricao, tipoId);
  renderPagamentoCaixa();
  fecharEditarPagamentoCaixa();
}

function confirmarExclusaoPagCaixa(id){
  excluindoPagCaixaId = id;
  document.getElementById('confirmExclusaoPagCaixaModal').style.display = 'flex';
}

function fecharConfirmacaoPagCaixa(){
  document.getElementById('confirmExclusaoPagCaixaModal').style.display = 'none';
  excluindoPagCaixaId = null;
}

async function confirmarExclusaoPagCaixaOk(){
  if(!excluindoPagCaixaId) return;
  const { error } = await sb.from('pagamentos_caixa').delete().eq('id', excluindoPagCaixaId);
  if(!error){
    pagCaixaCache = pagCaixaCache.filter(l=>l.id!==excluindoPagCaixaId);
    renderPagamentoCaixa();
  }
  fecharConfirmacaoPagCaixa();
}

function confirmarApagarTudoPagCaixa(){
  if(pagCaixaCache.length===0){
    alert('Não há pagamentos nesse período pra apagar.');
    return;
  }
  const periodo = pagCaixaMesAtual==='todos' ? 'todos os meses' : (()=>{
    const [ano, mes] = pagCaixaMesAtual.split('-');
    return NOMES_MES[parseInt(mes,10)-1] + ' de ' + ano;
  })();
  document.getElementById('apagarTudoPagCaixaTexto').textContent =
    'Isso apaga os ' + pagCaixaCache.length + ' pagamento(s) lançado(s) em "' + periodo + '" (loja ' + (NOMES_LOJA[lojaAtual]||'') + '). Essa ação não pode ser desfeita.';
  document.getElementById('apagarTudoPagCaixaConfirmTexto').value = '';
  document.getElementById('confirmApagarTudoPagCaixaModal').style.display = 'flex';
}

function fecharApagarTudoPagCaixa(){
  document.getElementById('confirmApagarTudoPagCaixaModal').style.display = 'none';
}

async function confirmarApagarTudoPagCaixaOk(){
  const texto = document.getElementById('apagarTudoPagCaixaConfirmTexto').value.trim().toUpperCase();
  if(texto !== 'APAGAR'){
    alert('Digite exatamente "APAGAR" (em maiúsculas) para confirmar.');
    return;
  }

  const ids = pagCaixaCache.map(l=>l.id);
  const { error } = await sb.from('pagamentos_caixa').delete().in('id', ids);
  fecharApagarTudoPagCaixa();

  if(error){
    alert('Erro ao apagar: ' + error.message);
    return;
  }

  pagCaixaCache = [];
  renderPagamentoCaixa();
  await popularFiltroMesPagCaixa();
  alert('Pagamentos apagados.');
}

function exportarExcelPagamentoCaixa(){
  if(pagCaixaCache.length===0){ alert('Não há pagamentos para exportar.'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const dados = pagCaixaCache.map(l=>{
    const tipo = l.pagamentos_caixa_tipos;
    return {
      'Cód Tipo Pagamento.': tipo ? tipo.codigo : '',
      'Descrição Tipo': tipo ? tipo.descricao : '',
      'Descricao Pagamento': l.descricao_pagamento,
      'Valor Pagamento': Number(l.valor_pagamento)
    };
  });
  const planilha = XLSX.utils.json_to_sheet(dados);
  planilha['!cols'] = [{wch:18},{wch:30},{wch:30},{wch:16}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Pagamentos');
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  XLSX.writeFile(livro, 'pagamento-caixa-' + nomeLoja + '-' + new Date().toISOString().slice(0,10) + '.xlsx');
}

/* ================= ESTOQUE > INVENTÁRIO ================= */

let invCache = [];
let invMesAtual = 'todos';
let invEditandoId = null;
let excluindoInvId = null;

function calcularResultadoInventario(sobras, faltas, vencidos, negativos){
  return (negativos||0) + (sobras||0) - (faltas||0) - (vencidos||0);
}

function num(v){
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function calcularPreviaInventario(){
  const inicial = num(document.getElementById('inv_inicial').value);
  const negativos = num(document.getElementById('inv_negativos').value);
  const sobras = num(document.getElementById('inv_sobras').value);
  const faltas = num(document.getElementById('inv_faltas').value);
  const vencidos = num(document.getElementById('inv_vencidos').value);
  const resultado = calcularResultadoInventario(sobras, faltas, vencidos, negativos);
  const final = inicial + resultado;

  const elResultado = document.getElementById('invPreviaResultado');
  const elLbl = document.getElementById('invPreviaResultadoLbl');
  elLbl.textContent = resultado>=0 ? 'Sobra geral' : 'Falta geral';
  elResultado.textContent = brl(Math.abs(resultado));
  elResultado.style.color = resultado>=0 ? 'var(--green)' : 'var(--rust)';
  document.getElementById('invPreviaFinal').textContent = brl(final);
}

function calcularPreviaInventarioEdit(){
  const inicial = num(document.getElementById('editInv_inicial').value);
  const negativos = num(document.getElementById('editInv_negativos').value);
  const sobras = num(document.getElementById('editInv_sobras').value);
  const faltas = num(document.getElementById('editInv_faltas').value);
  const vencidos = num(document.getElementById('editInv_vencidos').value);
  const resultado = calcularResultadoInventario(sobras, faltas, vencidos, negativos);
  const final = inicial + resultado;

  const elResultado = document.getElementById('editInvPreviaResultado');
  const elLbl = document.getElementById('editInvPreviaResultadoLbl');
  elLbl.textContent = resultado>=0 ? 'Sobra geral' : 'Falta geral';
  elResultado.textContent = brl(Math.abs(resultado));
  elResultado.style.color = resultado>=0 ? 'var(--green)' : 'var(--rust)';
  document.getElementById('editInvPreviaFinal').textContent = brl(final);
}

async function abrirInventario(){
  if(!document.getElementById('inv_data').value){
    document.getElementById('inv_data').value = todayStr();
  }
  calcularPreviaInventario();
  await popularFiltroMesInventario();
  const mesAtual = new Date().toISOString().slice(0,7);
  document.getElementById('invFiltroMes').value = mesAtual;
  invMesAtual = mesAtual;
  await carregarInventario();
}

async function popularFiltroMesInventario(){
  const { data, error } = await buscarTodasLinhas((from, to) =>
    sb.from('estoque_inventarios').select('data').eq('loja', lojaAtual).range(from, to)
  );
  if(error){ console.error('Erro ao carregar meses de inventário:', error); return; }
  const mesesSet = new Set((data||[]).map(d=>d.data.slice(0,7)));
  const hoje = new Date();
  for(let i=0;i<12;i++){
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
    mesesSet.add(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
  }
  const lista = Array.from(mesesSet).sort().reverse();
  const sel = document.getElementById('invFiltroMes');
  const atual = sel.value || 'todos';
  sel.innerHTML = '<option value="todos">Todos os meses</option>' + lista.map(chave=>{
    const [ano, mes] = chave.split('-');
    return `<option value="${chave}">${NOMES_MES[parseInt(mes,10)-1]} ${ano}</option>`;
  }).join('');
  sel.value = lista.includes(atual) || atual==='todos' ? atual : 'todos';
}

function mudarMesInventario(valor){
  invMesAtual = valor;
  carregarInventario();
}

async function carregarInventario(){
  let de = null, ate = null;
  if(invMesAtual !== 'todos'){
    const [ano, mes] = invMesAtual.split('-');
    const ultimoDia = new Date(parseInt(ano,10), parseInt(mes,10), 0).getDate();
    de = invMesAtual + '-01';
    ate = invMesAtual + '-' + String(ultimoDia).padStart(2,'0');
  }

  const { data, error } = await buscarTodasLinhas((from, to)=>{
    let q = sb.from('estoque_inventarios').select('*').eq('loja', lojaAtual);
    if(de) q = q.gte('data', de);
    if(ate) q = q.lte('data', ate);
    return q.order('data').range(from, to);
  });

  if(error){
    console.error('Erro ao carregar inventário:', error);
    invCache = [];
  }else{
    invCache = data || [];
  }
  renderInventario();
}

function renderInventario(){
  const body = document.getElementById('invBody');
  const empty = document.getElementById('invEmpty');
  if(invCache.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
  }else{
    empty.style.display = 'none';
    body.innerHTML = invCache.map(l=>{
      const resultado = calcularResultadoInventario(l.sobras, l.faltas, l.vencidos, l.negativos);
      const final = Number(l.estoque_inicial) + resultado;
      const rotuloResultado = resultado>=0 ? 'Sobra' : 'Falta';
      return `<tr>
        <td class="data">${fmtData(l.data)}</td>
        <td class="valor">${brl(l.estoque_inicial)}</td>
        <td class="valor">${brl(l.negativos)}</td>
        <td class="valor" style="color:var(--green);">${brl(l.sobras)}</td>
        <td class="valor" style="color:var(--rust);">${brl(l.faltas)}</td>
        <td class="valor">${brl(l.vencidos)}</td>
        <td class="valor" style="color:${resultado>=0?'var(--green)':'var(--rust)'};font-weight:600;">${rotuloResultado} ${brl(Math.abs(resultado))}</td>
        <td class="valor" style="font-weight:600;">${brl(final)}</td>
        <td><div class="rowactions">
          <button class="iconbtn edit" title="Editar" onclick="abrirEditarInventario('${l.id}')">✎</button>
          <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoInv('${l.id}')">✕</button>
        </div></td>
      </tr>`;
    }).join('');
  }
}

async function salvarInventario(){
  const data = document.getElementById('inv_data').value;
  const inicial = document.getElementById('inv_inicial').value;
  const err = document.getElementById('invErr');

  if(!data || inicial===''){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const payload = {
    loja: lojaAtual,
    data: data,
    estoque_inicial: num(inicial),
    negativos: num(document.getElementById('inv_negativos').value),
    sobras: num(document.getElementById('inv_sobras').value),
    faltas: num(document.getElementById('inv_faltas').value),
    vencidos: num(document.getElementById('inv_vencidos').value)
  };

  const { data: salvo, error } = await sb.from('estoque_inventarios').insert(payload).select().single();

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  invCache.push(salvo);
  invCache.sort((a,b)=>a.data.localeCompare(b.data));
  document.getElementById('inv_inicial').value = '';
  document.getElementById('inv_negativos').value = '';
  document.getElementById('inv_sobras').value = '';
  document.getElementById('inv_faltas').value = '';
  document.getElementById('inv_vencidos').value = '';
  calcularPreviaInventario();
  renderInventario();
  await popularFiltroMesInventario();
}

function abrirEditarInventario(id){
  const l = invCache.find(x=>x.id===id);
  if(!l) return;
  invEditandoId = id;
  document.getElementById('editInv_data').value = l.data;
  document.getElementById('editInv_inicial').value = l.estoque_inicial;
  document.getElementById('editInv_negativos').value = l.negativos;
  document.getElementById('editInv_sobras').value = l.sobras;
  document.getElementById('editInv_faltas').value = l.faltas;
  document.getElementById('editInv_vencidos').value = l.vencidos;
  calcularPreviaInventarioEdit();
  document.getElementById('editInvErr').style.display = 'none';
  document.getElementById('editInvModal').style.display = 'flex';
}

function fecharEditarInventario(){
  document.getElementById('editInvModal').style.display = 'none';
  invEditandoId = null;
}

async function salvarEdicaoInventario(){
  const data = document.getElementById('editInv_data').value;
  const inicial = document.getElementById('editInv_inicial').value;
  const err = document.getElementById('editInvErr');

  if(!data || inicial===''){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const btn = document.getElementById('editInvSalvarBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const payload = {
    data: data,
    estoque_inicial: num(inicial),
    negativos: num(document.getElementById('editInv_negativos').value),
    sobras: num(document.getElementById('editInv_sobras').value),
    faltas: num(document.getElementById('editInv_faltas').value),
    vencidos: num(document.getElementById('editInv_vencidos').value)
  };

  const { data: atualizado, error } = await sb.from('estoque_inventarios').update(payload).eq('id', invEditandoId).select().single();

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  const idx = invCache.findIndex(l=>l.id===invEditandoId);
  if(idx>-1) invCache[idx] = atualizado;
  invCache.sort((a,b)=>a.data.localeCompare(b.data));
  renderInventario();
  fecharEditarInventario();
}

function confirmarExclusaoInv(id){
  excluindoInvId = id;
  document.getElementById('confirmExclusaoInvModal').style.display = 'flex';
}

function fecharConfirmacaoInv(){
  document.getElementById('confirmExclusaoInvModal').style.display = 'none';
  excluindoInvId = null;
}

async function confirmarExclusaoInvOk(){
  if(!excluindoInvId) return;
  const { error } = await sb.from('estoque_inventarios').delete().eq('id', excluindoInvId);
  if(!error){
    invCache = invCache.filter(l=>l.id!==excluindoInvId);
    renderInventario();
  }
  fecharConfirmacaoInv();
}

function exportarExcelInventario(){
  if(invCache.length===0){ alert('Não há inventários para exportar.'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const dados = invCache.map(l=>{
    const resultado = calcularResultadoInventario(l.sobras, l.faltas, l.vencidos, l.negativos);
    const final = Number(l.estoque_inicial) + resultado;
    return {
      'Data': fmtData(l.data),
      'Estoque inicial': Number(l.estoque_inicial),
      'Negativos': Number(l.negativos),
      'Sobras': Number(l.sobras),
      'Faltas': Number(l.faltas),
      'Vencidos': Number(l.vencidos),
      'Resultado (sobra/falta geral)': resultado,
      'Estoque final': final
    };
  });
  const planilha = XLSX.utils.json_to_sheet(dados);
  planilha['!cols'] = [{wch:12},{wch:14},{wch:12},{wch:12},{wch:12},{wch:12},{wch:20},{wch:14}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Inventário');
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  XLSX.writeFile(livro, 'inventario-' + nomeLoja + '-' + new Date().toISOString().slice(0,10) + '.xlsx');
}

function exportarPdfInventario(){
  if(invCache.length===0){ alert('Não há inventários para exportar.'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l');
  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);

  doc.setFontSize(16);
  doc.text('Inventário — ' + (NOMES_LOJA[lojaAtual]||''), 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Gerado em ' + dataHora, 14, 25);

  const corpo = invCache.map(l=>{
    const resultado = calcularResultadoInventario(l.sobras, l.faltas, l.vencidos, l.negativos);
    const final = Number(l.estoque_inicial) + resultado;
    const rotulo = resultado>=0 ? 'Sobra' : 'Falta';
    return [fmtData(l.data), brl(l.estoque_inicial), brl(l.negativos), brl(l.sobras), brl(l.faltas), brl(l.vencidos), rotulo+' '+brl(Math.abs(resultado)), brl(final)];
  });

  doc.autoTable({
    startY: 32,
    head: [['Data','Estoque inicial','Negativos','Sobras','Faltas','Vencidos','Resultado','Estoque final']],
    body: corpo,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [38,51,43] }
  });

  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  doc.save('inventario-' + nomeLoja + '-' + agora.toISOString().slice(0,10) + '.pdf');
}

/* ================= CONTAGENS DE ESTOQUE ================= */

let contagensEstoqueLista = [];
let contagemEstoqueAtualId = null;
let contagemEstoqueItens = [];
let contEstParsed = null; // itens lidos da planilha, aguardando confirmação de importação

async function abrirContagensEstoque(){
  document.getElementById('contEst_data').value = todayStr();
  cancelarUploadContagemEstoque();
  await carregarListaContagensEstoque();
}

async function carregarListaContagensEstoque(){
  const { data, error } = await sb.from('contagens_estoque')
    .select('*')
    .eq('loja', lojaAtual)
    .order('data', { ascending: false });
  contagensEstoqueLista = error ? [] : (data || []);

  const sel = document.getElementById('contEstSeletor');
  sel.innerHTML = '<option value="nova">+ Nova contagem</option>' +
    contagensEstoqueLista.map(c => `<option value="${c.id}">${fmtData(c.data)}</option>`).join('');

  if(contagensEstoqueLista.length>0){
    contagemEstoqueAtualId = contagensEstoqueLista[0].id;
    sel.value = String(contagemEstoqueAtualId);
    await carregarItensContagemEstoque(contagemEstoqueAtualId);
    document.getElementById('contEstUploadWrap').style.display = 'none';
    document.getElementById('contEstResultadoWrap').style.display = 'block';
    document.getElementById('contEstEmpty').style.display = 'none';
  }else{
    contagemEstoqueAtualId = null;
    sel.value = 'nova';
    document.getElementById('contEstUploadWrap').style.display = 'block';
    document.getElementById('contEstResultadoWrap').style.display = 'none';
    document.getElementById('contEstEmpty').style.display = 'block';
  }
}

async function mudarContagemEstoqueSelecionada(valor){
  if(valor === 'nova'){
    contagemEstoqueAtualId = null;
    cancelarUploadContagemEstoque();
    document.getElementById('contEstUploadWrap').style.display = 'block';
    document.getElementById('contEstResultadoWrap').style.display = 'none';
    return;
  }
  contagemEstoqueAtualId = Number(valor);
  document.getElementById('contEstUploadWrap').style.display = 'none';
  document.getElementById('contEstEmpty').style.display = 'none';
  await carregarItensContagemEstoque(contagemEstoqueAtualId);
  document.getElementById('contEstResultadoWrap').style.display = 'block';
}

async function carregarItensContagemEstoque(contagemId){
  const { data, error } = await sb.from('contagens_estoque_itens')
    .select('*')
    .eq('contagem_id', contagemId)
    .order('codigo', { ascending: true });
  contagemEstoqueItens = error ? [] : (data || []);
  renderTabelaContagemEstoque();
}

function normalizarCabecalhoContagem(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
}

async function onSelecionarContagemEstoque(fileList){
  const arquivo = fileList && fileList[0];
  const err = document.getElementById('contEstUploadErr');
  err.style.display = 'none';
  document.getElementById('contEstConfirmWrap').style.display = 'none';
  document.getElementById('contEstBtnConfirmar').disabled = true;
  contEstParsed = null;

  if(!arquivo) return;
  const erroArquivo = validarArquivoLocal(arquivo, 'planilha');
  if(erroArquivo){ err.textContent = erroArquivo; err.style.display = 'block'; document.getElementById('contEstFileInput').value = ''; return; }
  document.getElementById('contEstUploadStatus').textContent = arquivo.name;

  if(!window.XLSX){
    err.textContent = 'Não foi possível carregar o leitor de planilhas. Recarregue a página e tente de novo.';
    err.style.display = 'block';
    return;
  }

  abrirProgresso('Lendo planilha…');
  try{
    const buffer = await arquivo.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const primeiraAba = wb.SheetNames[0];
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[primeiraAba], { header: 1, raw: true, defval: '' });
    atualizarProgresso(60);

    if(!linhas || linhas.length < 2){
      throw new Error('Planilha vazia ou sem linhas de dados.');
    }

    // acha a linha de cabeçalho nas primeiras linhas — aceita nomes de coluna parecidos
    // (ex: "Código", "Cód. Produto", "Descrição", "Produto", "Quantidade", "Qtd")
    let idxCabecalho = -1, idxCodigo = -1, idxDescricao = -1, idxQuantidade = -1;
    for(let i=0; i<Math.min(linhas.length,5); i++){
      const cab = (linhas[i]||[]).map(normalizarCabecalhoContagem);
      const c = cab.findIndex(h=>h.includes('COD'));
      // procura descrição só nas colunas que sobraram (nunca reaproveita a mesma coluna do código —
      // ex: "Código do Produto" não pode contar como coluna de descrição só por conter "PRODUTO")
      const d = cab.findIndex((h, idx)=> idx!==c && h.includes('DESC'));
      const dFallback = d>-1 ? d : cab.findIndex((h, idx)=> idx!==c && (h.includes('PRODUTO') || h==='NOME'));
      const q = cab.findIndex(h=>h.includes('QUANT') || h.includes('QTD') || h.includes('SALDO') || h.includes('ESTOQUE'));
      if(c>-1 && q>-1){
        idxCabecalho = i; idxCodigo = c; idxDescricao = dFallback; idxQuantidade = q;
        break;
      }
    }
    if(idxCabecalho===-1){
      throw new Error('Não encontrei as colunas de Código e Quantidade na planilha. Confira se a primeira linha tem os nomes das colunas.');
    }

    const itens = [];
    for(let i=idxCabecalho+1; i<linhas.length; i++){
      const linha = linhas[i];
      if(!linha || linha.length===0) continue;
      const codigo = String(linha[idxCodigo]||'').trim();
      const descricao = idxDescricao>-1 ? String(linha[idxDescricao]||'').trim() : '';
      const qtd = parseNumeroVenda(linha[idxQuantidade]);
      if(!codigo && !descricao) continue;
      itens.push({ codigo, descricao, qtd_sistema: qtd===null ? 0 : qtd });
    }

    if(itens.length===0){
      throw new Error('Não encontrei nenhum item válido na planilha.');
    }

    contEstParsed = itens;
    document.getElementById('contEstConfirmWrap').style.display = 'block';
    document.getElementById('contEstBtnConfirmar').disabled = false;
    document.getElementById('contEstUploadStatus').textContent = arquivo.name + ' — ' + itens.length + ' item(ns) encontrado(s)';
    atualizarProgresso(100);
  }catch(e){
    err.textContent = e.message || 'Não foi possível ler a planilha.';
    err.style.display = 'block';
  }
  setTimeout(fecharProgresso, 200);
}

async function confirmarImportacaoContagemEstoque(){
  if(!contEstParsed || contEstParsed.length===0) return;
  const data = document.getElementById('contEst_data').value;
  const err = document.getElementById('contEstUploadErr');
  if(!data){
    err.textContent = 'Escolha a data da contagem antes de confirmar.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const btn = document.getElementById('contEstBtnConfirmar');
  btn.disabled = true;
  abrirProgresso('Salvando contagem…');

  const { data: contagemSalva, error: erroContagem } = await sb.from('contagens_estoque')
    .insert({ loja: lojaAtual, data: data }).select().single();
  atualizarProgresso(30);

  if(erroContagem){
    fecharProgresso();
    btn.disabled = false;
    alert('Erro ao criar contagem: ' + erroContagem.message);
    return;
  }

  const registros = contEstParsed.map(it => ({
    contagem_id: contagemSalva.id,
    codigo: it.codigo,
    descricao: it.descricao,
    qtd_sistema: it.qtd_sistema,
    qtd_contada: null
  }));

  const tamanhoLote = 500;
  let erroItens = null;
  for(let i=0; i<registros.length; i+=tamanhoLote){
    const lote = registros.slice(i, i+tamanhoLote);
    const { error } = await sb.from('contagens_estoque_itens').insert(lote);
    if(error){ erroItens = error; break; }
    atualizarProgresso(30 + ((i+lote.length) / registros.length) * 60);
  }

  btn.disabled = false;

  if(erroItens){
    // limpa a contagem órfã pra não deixar lixo no banco
    await sb.from('contagens_estoque').delete().eq('id', contagemSalva.id);
    fecharProgresso();
    alert('Erro ao salvar os itens: ' + erroItens.message);
    return;
  }

  cancelarUploadContagemEstoque();
  await carregarListaContagensEstoque();
  document.getElementById('contEstSeletor').value = String(contagemSalva.id);
  contagemEstoqueAtualId = contagemSalva.id;
  await carregarItensContagemEstoque(contagemSalva.id);
  document.getElementById('contEstUploadWrap').style.display = 'none';
  document.getElementById('contEstResultadoWrap').style.display = 'block';
  atualizarProgresso(100);
  setTimeout(fecharProgresso, 250);
}

function cancelarUploadContagemEstoque(){
  contEstParsed = null;
  const input = document.getElementById('contEstFileInput');
  if(input) input.value = '';
  document.getElementById('contEstUploadStatus').textContent = 'Nenhum arquivo selecionado.';
  document.getElementById('contEstUploadErr').style.display = 'none';
  document.getElementById('contEstConfirmWrap').style.display = 'none';
}

function formatarNumeroContagem(n, comSinal){
  const num = Number(n||0);
  const texto = num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  if(comSinal && num>0) return '+' + texto;
  return texto;
}

function renderTabelaContagemEstoque(){
  const buscaEl = document.getElementById('contEstBusca');
  const busca = buscaEl ? buscaEl.value.trim().toLowerCase() : '';
  const itensFiltrados = contagemEstoqueItens.filter(it=>{
    if(!busca) return true;
    return String(it.codigo||'').toLowerCase().includes(busca) || String(it.descricao||'').toLowerCase().includes(busca);
  });

  document.getElementById('contEstQtdItens').textContent = contagemEstoqueItens.length;
  document.getElementById('contEstQtdContados').textContent = contagemEstoqueItens.filter(it=>it.qtd_contada!==null && it.qtd_contada!==undefined).length;
  document.getElementById('contEstQtdDiferenca').textContent = contagemEstoqueItens.filter(it=>it.qtd_contada!==null && it.qtd_contada!==undefined && Number(it.qtd_contada)!==Number(it.qtd_sistema)).length;

  document.getElementById('contEstBody').innerHTML = itensFiltrados.length===0
    ? '<div style="text-align:center;color:var(--muted);font-style:italic;padding:24px 16px;">Nenhum item encontrado.</div>'
    : itensFiltrados.map(it=>{
        const temContagem = it.qtd_contada!==null && it.qtd_contada!==undefined;
        const diff = temContagem ? Number(it.qtd_contada) - Number(it.qtd_sistema) : null;
        return `
        <div class="contest-row">
          <div class="campo"><span class="lbl-mobile">Código</span><span>${escapeHtml(it.codigo||'')}</span></div>
          <div class="campo"><span class="lbl-mobile">Descrição</span><span>${escapeHtml(it.descricao||'')}</span></div>
          <div class="campo" style="text-align:right;"><span class="lbl-mobile">Qtd. sistema</span><span>${formatarNumeroContagem(it.qtd_sistema)}</span></div>
          <div class="campo"><span class="lbl-mobile">Qtd. contada</span><input class="contest-input" type="text" inputmode="text" data-id="${it.id}" value="${temContagem ? it.qtd_contada : ''}" placeholder="ex: 30+20" title="Pode somar, ex: 30+20+50" onchange="salvarQtdContadaEstoque(this)" onkeydown="if(event.key==='Enter'){this.blur();}"></div>
          <div class="campo" style="text-align:right;color:${diff===null?'var(--muted)':(diff===0?'var(--green)':'var(--rust)')};"><span class="lbl-mobile">Diferença</span><span>${diff===null ? '—' : formatarNumeroContagem(diff, true)}</span></div>
        </div>
      `;}).join('');
}

// aceita somar vários números separados por "+", ex: "30+20+50" → 100
// (útil pra contar em lugares diferentes: prateleira + depósito, por exemplo)
function parseSomaContagemEstoque(texto){
  texto = String(texto||'').trim();
  if(texto === '') return null;
  const partes = texto.split('+');
  let soma = 0;
  for(const parte of partes){
    const limpo = parte.trim().replace(',', '.');
    if(limpo === '') return NaN; // ex: "30+" incompleto — inválido, mas diferente de vazio
    const n = parseFloat(limpo);
    if(isNaN(n)) return NaN;
    soma += n;
  }
  return soma;
}

async function salvarQtdContadaEstoque(input){
  const id = Number(input.dataset.id);
  const valorTexto = input.value.trim();
  const valor = parseSomaContagemEstoque(valorTexto);

  if(Number.isNaN(valor)){
    input.style.borderColor = 'var(--rust)';
    input.title = 'Não entendi essa soma. Use números separados por "+", ex: 30+20+50';
    return; // não salva — deixa o texto como está pro usuário corrigir
  }
  input.style.borderColor = '';
  input.title = 'Pode somar, ex: 30+20+50';
  if(valor !== null) input.value = valor; // troca o "30+20" pelo resultado (50) depois de salvar

  const item = contagemEstoqueItens.find(it=>it.id===id);
  if(item) item.qtd_contada = valor;

  const { error } = await sb.from('contagens_estoque_itens').update({ qtd_contada: valor }).eq('id', id);
  if(error){
    alert('Erro ao salvar: ' + error.message);
    return;
  }
  renderTabelaContagemEstoque();
}

let contEstIdParaApagar = null;
function confirmarApagarContagemEstoque(){
  if(!contagemEstoqueAtualId) return;
  contEstIdParaApagar = contagemEstoqueAtualId;
  document.getElementById('confirmApagarContagemEstoqueModal').style.display = 'flex';
}
function fecharConfirmacaoApagarContagemEstoque(){
  contEstIdParaApagar = null;
  document.getElementById('confirmApagarContagemEstoqueModal').style.display = 'none';
}
async function confirmarApagarContagemEstoqueOk(){
  if(!contEstIdParaApagar) return;
  abrirProgresso('Apagando…');
  await sb.from('contagens_estoque_itens').delete().eq('contagem_id', contEstIdParaApagar);
  const { error } = await sb.from('contagens_estoque').delete().eq('id', contEstIdParaApagar);
  fecharProgresso();
  fecharConfirmacaoApagarContagemEstoque();
  if(error){
    alert('Erro ao apagar: ' + error.message);
    return;
  }
  contagemEstoqueAtualId = null;
  await carregarListaContagensEstoque();
}

function exportarExcelContagemEstoque(){
  if(!contagemEstoqueItens || contagemEstoqueItens.length===0){ alert('Nenhum item pra exportar.'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const planilha = XLSX.utils.json_to_sheet(contagemEstoqueItens.map(it=>({
    'Código': it.codigo,
    'Descrição': it.descricao,
    'Qtd. sistema': Number(it.qtd_sistema||0),
    'Qtd. contada': (it.qtd_contada===null || it.qtd_contada===undefined) ? '' : Number(it.qtd_contada),
    'Diferença': (it.qtd_contada===null || it.qtd_contada===undefined) ? '' : Number(it.qtd_contada) - Number(it.qtd_sistema)
  })));
  planilha['!cols'] = [{wch:16},{wch:40},{wch:14},{wch:14},{wch:12}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Contagem');
  const contagem = contagensEstoqueLista.find(c=>c.id===contagemEstoqueAtualId);
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  XLSX.writeFile(livro, 'contagem-estoque-' + nomeLoja + '-' + (contagem?contagem.data:'') + '.xlsx');
}

function exportarPdfContagemEstoque(){
  if(!contagemEstoqueItens || contagemEstoqueItens.length===0){ alert('Nenhum item pra exportar.'); return; }
  const contagem = contagensEstoqueLista.find(c=>c.id===contagemEstoqueAtualId);
  const doc = iniciarPdf('Contagem de Estoque — ' + (NOMES_LOJA[lojaAtual]||''), contagem ? ('Data da contagem: ' + fmtData(contagem.data)) : '');
  if(!doc) return;
  doc.autoTable({
    startY: 32,
    head: [['Código','Descrição','Qtd. sistema','Qtd. contada','Diferença']],
    body: contagemEstoqueItens.map(it=>{
      const temContagem = it.qtd_contada!==null && it.qtd_contada!==undefined;
      const diff = temContagem ? Number(it.qtd_contada) - Number(it.qtd_sistema) : null;
      return [it.codigo||'', it.descricao||'', formatarNumeroContagem(it.qtd_sistema), temContagem?formatarNumeroContagem(it.qtd_contada):'—', diff===null?'—':formatarNumeroContagem(diff,true)];
    }),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [38,51,43] }
  });
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  doc.save('contagem-estoque-' + nomeLoja + '-' + (contagem?contagem.data:'') + '.pdf');
}

/* ================= COMBINAÇÃO DE PAGAMENTOS (ferramenta, não grava no banco) ================= */

let combPagMesAtual = '';
let comprasCombParsed = null;
let pagamentosCombParsed = null;
let combPagResultado = { pares: [], grupos: [], comprasSemPar: [], pagamentosSemPar: [], bonificacoes: [] };
let combPagBusca = { combinados:'', grupos:'', manuais:'', bonificacoes:'', comprasSemPar:'', pagamentosSemPar:'' };

// busca simples por nome ou valor: casa se a query aparecer em qualquer um dos textos/valores passados
function combPagBate(query, ...valores){
  if(!query || !query.trim()) return true;
  const q = query.trim().toLowerCase();
  return valores.some(v => String(v ?? '').toLowerCase().includes(q));
}
let combPagSelecaoCompras = new Set();
let combPagSelecaoPagamentos = new Set();

const PALAVRAS_IGNORADAS_COMB = new Set(['LTDA','LTD','EIRELI','COMERCIO','INDUSTRIA','DISTRIBUIDORA','ALIMENTOS','BEBIDAS','BRASIL','LOJA','PRODUTOS','SOCIAL','RAZAO','MINAS','PAGAMENTO','DESCRICAO']);

async function abrirCombinacaoPagamentos(){
  await carregarFornecedoresComb();
  const sel = document.getElementById('combPagFiltroMes');
  const inicio = new Date(2026, 6, 1); // Julho 2026
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 1);
  const meses = [];
  let cursor = new Date(inicio);
  while(cursor <= fim){
    meses.push(cursor.getFullYear() + '-' + String(cursor.getMonth()+1).padStart(2,'0'));
    cursor.setMonth(cursor.getMonth()+1);
  }
  sel.innerHTML = meses.map(chave=>{
    const [ano, mes] = chave.split('-');
    return `<option value="${chave}">${NOMES_MES[parseInt(mes,10)-1]} ${ano}</option>`;
  }).join('');
  const mesAtualStr = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0');
  sel.value = meses.includes(mesAtualStr) ? mesAtualStr : meses[0];
  combPagMesAtual = sel.value;

  await carregarOuPrepararCombinacaoPagamentos();
}

function limparSelecaoArquivosComb(){
  comprasCombParsed = null;
  pagamentosCombParsed = null;
  document.getElementById('combPagComprasStatus').textContent = 'Nenhum arquivo selecionado.';
  document.getElementById('combPagPagamentosStatus').textContent = 'Nenhum arquivo selecionado.';
  document.getElementById('combPagComprasInput').value = '';
  document.getElementById('combPagPagamentosInput').value = '';
  document.getElementById('combPagBtnCombinar').disabled = true;
}

async function carregarOuPrepararCombinacaoPagamentos(){
  limparSelecaoArquivosComb();
  document.getElementById('combPagResultadoWrap').style.display = 'none';

  const { data: comprasSalvas, error } = await sb.from('comb_pag_compras')
    .select('*, comb_pag_pagamentos(*)')
    .eq('loja', lojaAtual).eq('mes', combPagMesAtual);
  const { data: pagamentosOrfaos } = await sb.from('comb_pag_pagamentos')
    .select('*')
    .eq('loja', lojaAtual).eq('mes', combPagMesAtual);

  if(error){ console.error('Erro ao carregar combinação salva:', error); return; }

  if((comprasSalvas && comprasSalvas.length>0) || (pagamentosOrfaos && pagamentosOrfaos.length>0)){
    document.getElementById('combPagJaSalvoAviso').style.display = 'flex';
    document.getElementById('combPagUploadWrap').style.display = 'none';

    const idsPagamentosUsados = new Set(comprasSalvas.filter(c=>c.pagamento_id).map(c=>c.pagamento_id));
    const pares = comprasSalvas.filter(c=>c.pagamento_id).map(c=>({
      compra: { id: c.id, numCompra: c.num_compra, numNF: c.num_nf, emissao: c.emissao, entrada: c.entrada, razaoSocial: c.razao_social, nomeFantasia: c.nome_fantasia, valor: Number(c.valor) },
      pagamento: { id: c.comb_pag_pagamentos.id, data: c.comb_pag_pagamentos.data, descricao: c.comb_pag_pagamentos.descricao, valor: Number(c.comb_pag_pagamentos.valor) },
      diff: Number(c.diferenca || 0)
    }));

    // reconstrói os grupos (por soma automática OU vinculados manualmente) a partir do grupo_id
    const gruposMap = {};
    comprasSalvas.filter(c=>c.grupo_id).forEach(c=>{
      if(!gruposMap[c.grupo_id]) gruposMap[c.grupo_id] = { compras: [], pagamentos: [], manual: false };
      gruposMap[c.grupo_id].compras.push({ id: c.id, numCompra: c.num_compra, numNF: c.num_nf, emissao: c.emissao, entrada: c.entrada, razaoSocial: c.razao_social, nomeFantasia: c.nome_fantasia, valor: Number(c.valor) });
      if(c.grupo_manual) gruposMap[c.grupo_id].manual = true;
    });
    (pagamentosOrfaos||[]).filter(p=>p.grupo_id).forEach(p=>{
      if(!gruposMap[p.grupo_id]) gruposMap[p.grupo_id] = { compras: [], pagamentos: [], manual: false };
      gruposMap[p.grupo_id].pagamentos.push({ id: p.id, data: p.data, descricao: p.descricao, valor: Number(p.valor) });
      if(p.grupo_manual) gruposMap[p.grupo_id].manual = true;
    });
    const grupos = Object.values(gruposMap).map(g=>({
      compras: g.compras, pagamentos: g.pagamentos, manual: g.manual,
      diff: Math.abs(g.compras.reduce((s,c)=>s+c.valor,0) - g.pagamentos.reduce((s,p)=>s+p.valor,0))
    }));

    const comprasSemPar = comprasSalvas.filter(c=>!c.pagamento_id && !c.grupo_id && !c.bonificacao).map(c=>({
      id: c.id, numCompra: c.num_compra, numNF: c.num_nf, emissao: c.emissao, entrada: c.entrada, razaoSocial: c.razao_social, nomeFantasia: c.nome_fantasia, valor: Number(c.valor)
    }));
    const bonificacoes = comprasSalvas.filter(c=>c.bonificacao).map(c=>({
      id: c.id, numCompra: c.num_compra, numNF: c.num_nf, emissao: c.emissao, entrada: c.entrada, razaoSocial: c.razao_social, nomeFantasia: c.nome_fantasia, valor: Number(c.valor)
    }));
    const pagamentosSemPar = (pagamentosOrfaos||[]).filter(p=>!idsPagamentosUsados.has(p.id) && !p.grupo_id).map(p=>({
      id: p.id, data: p.data, descricao: p.descricao, valor: Number(p.valor)
    }));

    combPagResultado = { pares, grupos, comprasSemPar, pagamentosSemPar, bonificacoes };
    combPagSelecaoCompras.clear();
    combPagSelecaoPagamentos.clear();
    renderResultadoCombinacaoPagamentos();
  }else{
    document.getElementById('combPagJaSalvoAviso').style.display = 'none';
    document.getElementById('combPagUploadWrap').style.display = 'block';
  }
}

function confirmarApagarCombinacaoMes(){
  document.getElementById('confirmApagarCombinacaoModal').style.display = 'flex';
}

async function confirmarApagarCombinacaoMesOk(){
  document.getElementById('confirmApagarCombinacaoModal').style.display = 'none';
  await sb.from('comb_pag_compras').delete().eq('loja', lojaAtual).eq('mes', combPagMesAtual);
  await sb.from('comb_pag_pagamentos').delete().eq('loja', lojaAtual).eq('mes', combPagMesAtual);
  await carregarOuPrepararCombinacaoPagamentos();
}

function mudarMesCombinacaoPagamentos(valor){
  combPagMesAtual = valor;
  carregarOuPrepararCombinacaoPagamentos();
}

function excelSerialParaDataComb(serial){
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms);
}

function parseDataComb(valor){
  if(valor instanceof Date){
    return valor.toISOString().slice(0,10);
  }
  if(typeof valor === 'number'){
    return excelSerialParaDataComb(valor).toISOString().slice(0,10);
  }
  if(typeof valor === 'string' && valor.trim()){
    return parseDataBR(valor);
  }
  return null;
}

async function onSelecionarComprasComb(fileList){
  const file = fileList[0];
  if(!file) return;
  const erroArquivo = validarArquivoLocal(file, 'planilha');
  if(erroArquivo){ alert(erroArquivo); document.getElementById('combPagComprasInput').value = ''; return; }
  if(!window.XLSX){ alert('Não foi possível carregar o leitor de planilhas. Recarregue a página e tente de novo.'); return; }

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const aba = wb.SheetNames[0];
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: true, defval: '' });
  const cabecalho = (linhas[0]||[]).map(h=>String(h||'').trim().toUpperCase());
  const idxNumCompra = cabecalho.findIndex(h=>h.includes('COMPRA'));
  const idxNumNF = cabecalho.findIndex(h=>h.includes('NF'));
  const idxEmissao = cabecalho.findIndex(h=>h.includes('EMISS'));
  const idxEntrada = cabecalho.findIndex(h=>h.includes('ENTRADA'));
  const idxRazao = cabecalho.findIndex(h=>h.includes('RAZ'));
  const idxFantasia = cabecalho.findIndex(h=>h.includes('FANTASIA'));
  const idxValor = cabecalho.findIndex(h=>h.includes('TOTAL'));

  if(idxNumCompra===-1 || idxValor===-1){
    alert('Não reconheci as colunas dessa planilha de Compras. Confira se ela tem "Nº Compra" e "Total da NF".');
    return;
  }

  const itens = [];
  for(let i=1;i<linhas.length;i++){
    const linha = linhas[i];
    if(!linha || !linha[idxNumCompra]) continue;
    const valor = parseNumeroVenda(linha[idxValor]);
    if(valor===null) continue;
    itens.push({
      numCompra: linha[idxNumCompra],
      numNF: idxNumNF>-1 ? linha[idxNumNF] : '',
      emissao: idxEmissao>-1 ? parseDataComb(linha[idxEmissao]) : null,
      entrada: idxEntrada>-1 ? parseDataComb(linha[idxEntrada]) : null,
      razaoSocial: idxRazao>-1 ? String(linha[idxRazao]||'').trim() : '',
      nomeFantasia: idxFantasia>-1 ? String(linha[idxFantasia]||'').trim() : '',
      valor
    });
  }

  comprasCombParsed = itens;
  document.getElementById('combPagComprasStatus').textContent = '✓ ' + file.name + ' (' + itens.length + ' compra(s) lida(s))';
  document.getElementById('combPagBtnCombinar').disabled = !(comprasCombParsed && pagamentosCombParsed);
}

async function onSelecionarPagamentosComb(fileList){
  const file = fileList[0];
  if(!file) return;
  const erroArquivo = validarArquivoLocal(file, 'planilha');
  if(erroArquivo){ alert(erroArquivo); document.getElementById('combPagPagamentosInput').value = ''; return; }
  if(!window.XLSX){ alert('Não foi possível carregar o leitor de planilhas. Recarregue a página e tente de novo.'); return; }

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const aba = wb.SheetNames[0];
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: true, defval: '' });
  const cabecalho = (linhas[0]||[]).map(h=>String(h||'').trim().toUpperCase());
  const idxData = cabecalho.indexOf('DATA');
  const idxDescricao = cabecalho.findIndex(h=>h.includes('DESCRI'));
  const idxValor = cabecalho.findIndex(h=>h.includes('SA'));

  if(idxData===-1 || idxValor===-1){
    alert('Não reconheci as colunas dessa planilha de Pagamentos. Confira se ela tem "Data" e "Saída".');
    return;
  }

  const itens = [];
  for(let i=1;i<linhas.length;i++){
    const linha = linhas[i];
    if(!linha || linha.length===0) continue;
    const valor = parseNumeroVenda(linha[idxValor]);
    if(valor===null || valor===0) continue;
    const data = parseDataComb(linha[idxData]);
    if(!data) continue;
    itens.push({
      data,
      descricao: idxDescricao>-1 ? String(linha[idxDescricao]||'').trim() : '',
      valor
    });
  }

  pagamentosCombParsed = itens;
  document.getElementById('combPagPagamentosStatus').textContent = '✓ ' + file.name + ' (' + itens.length + ' pagamento(s) lido(s))';
  document.getElementById('combPagBtnCombinar').disabled = !(comprasCombParsed && pagamentosCombParsed);
}

function normalizarTextoComb(s){
  return (s||'').toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Z0-9 ]/g,' ')
    .split(/\s+/)
    .filter(w=>w.length>=3 && !PALAVRAS_IGNORADAS_COMB.has(w));
}

// cadastro de fornecedores (com variações de nome) carregado ao abrir a Combinação de Pagamentos —
// usado só pra melhorar o reconhecimento de nomes, não trava nada se não achar
let fornecedoresComb = [];
async function carregarFornecedoresComb(){
  const { data, error } = await sb.from('fornecedores').select('nome, apelidos').eq('loja', lojaAtual);
  fornecedoresComb = error ? [] : (data || []);
}

// procura, entre os fornecedores cadastrados, algum cujo nome bata com o nome da compra
// (por palavra em comum) — se achar, devolve TODOS os nomes/variações cadastrados pra ele
function acharVariacoesFornecedorCadastrado(nome1, nome2){
  if(!fornecedoresComb || fornecedoresComb.length===0) return [];
  const palavrasCompra = new Set([...normalizarTextoComb(nome1), ...normalizarTextoComb(nome2)]);
  if(palavrasCompra.size===0) return [];
  for(const f of fornecedoresComb){
    const palavrasFornecedor = normalizarTextoComb(f.nome);
    const bate = palavrasFornecedor.some(p=>palavrasCompra.has(p));
    if(bate){
      const apelidos = (f.apelidos||'').split(',').map(s=>s.trim()).filter(Boolean);
      return [f.nome, ...apelidos];
    }
  }
  return [];
}

function pontuarSimilaridadeComb(nome1, nome2, descricaoPagamento){
  const variacoesCadastradas = acharVariacoesFornecedorCadastrado(nome1, nome2);
  const palavrasFornecedor = new Set([
    ...normalizarTextoComb(nome1),
    ...normalizarTextoComb(nome2),
    ...variacoesCadastradas.flatMap(normalizarTextoComb)
  ]);
  const palavrasPagamento = normalizarTextoComb(descricaoPagamento);
  let pontos = 0;
  palavrasPagamento.forEach(p=>{ if(palavrasFornecedor.has(p)) pontos++; });
  return pontos;
}

function gerarIdGrupoComb(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,10);
}

// Procura o menor subconjunto de "itens" (2 a maxItens) cuja soma bate com "alvo" dentro da tolerância.
// Prioriza subconjuntos menores; em empate, o de menor diferença.
function encontrarSubconjuntoSomaComb(itens, alvo, tolerancia, maxItens){
  let melhor = null;
  const ordenados = itens.slice().sort((a,b)=> b.valor - a.valor);
  function dfs(startIdx, atuais, soma){
    if(atuais.length>=2){
      const diff = Math.abs(soma - alvo);
      if(diff<=tolerancia && (!melhor || atuais.length<melhor.itens.length || (atuais.length===melhor.itens.length && diff<melhor.diff))){
        melhor = { itens: atuais.slice(), diff };
      }
    }
    if(atuais.length>=maxItens) return;
    for(let i=startIdx;i<ordenados.length;i++){
      const novaSoma = soma + ordenados[i].valor;
      if(novaSoma > alvo + tolerancia) continue; // poda (valores positivos)
      atuais.push(ordenados[i]);
      dfs(i+1, atuais, novaSoma);
      atuais.pop();
    }
  }
  dfs(0, [], 0);
  return melhor;
}

// 2ª passada: tenta combinar por SOMA o que sobrou da 1ª passada (1:1).
// Cobre parcelamento (1 compra paga em várias vezes) e boleto agrupado (várias compras pagas de uma vez).
// Só tenta somar itens do mesmo fornecedor (score de similaridade >= 1) pra evitar somas por coincidência.
function encontrarGruposPorSomaComb(comprasSemPar, pagamentosSemPar){
  const TOLERANCIA = 4; // mesma tolerância da 1ª passada (diferença entre nota e boleto)
  const MAX_ITENS_GRUPO = 6;
  const compraUsada = new Set();
  const pagamentoUsado = new Set();
  const grupos = [];

  // Passo A: 1 compra ↔ várias parcelas (N pagamentos somando o valor da compra)
  comprasSemPar.slice().sort((a,b)=> b.valor - a.valor).forEach(c=>{
    if(compraUsada.has(c.idx)) return;
    const candidatos = pagamentosSemPar.filter(p=> !pagamentoUsado.has(p.idx) && pontuarSimilaridadeComb(c.razaoSocial, c.nomeFantasia, p.descricao) >= 1);
    if(candidatos.length<2) return;
    const achado = encontrarSubconjuntoSomaComb(candidatos, c.valor, TOLERANCIA, MAX_ITENS_GRUPO);
    if(achado){
      compraUsada.add(c.idx);
      achado.itens.forEach(p=>pagamentoUsado.add(p.idx));
      grupos.push({ compras: [c], pagamentos: achado.itens, diff: achado.diff });
    }
  });

  // Passo B: várias compras ↔ 1 pagamento (boleto único cobrindo mais de uma nota)
  pagamentosSemPar.filter(p=>!pagamentoUsado.has(p.idx)).sort((a,b)=> b.valor - a.valor).forEach(p=>{
    if(pagamentoUsado.has(p.idx)) return;
    const candidatos = comprasSemPar.filter(c=> !compraUsada.has(c.idx) && pontuarSimilaridadeComb(c.razaoSocial, c.nomeFantasia, p.descricao) >= 1);
    if(candidatos.length<2) return;
    const achado = encontrarSubconjuntoSomaComb(candidatos, p.valor, TOLERANCIA, MAX_ITENS_GRUPO);
    if(achado){
      pagamentoUsado.add(p.idx);
      achado.itens.forEach(c=>compraUsada.add(c.idx));
      grupos.push({ compras: achado.itens, pagamentos: [p], diff: achado.diff });
    }
  });

  return grupos;
}

async function executarCombinacaoPagamentos(){
  if(!comprasCombParsed || !pagamentosCombParsed) return;

  const [ano, mes] = combPagMesAtual.split('-');
  const de = combPagMesAtual + '-01';
  const ultimoDia = new Date(parseInt(ano,10), parseInt(mes,10), 0).getDate();
  const ate = combPagMesAtual + '-' + String(ultimoDia).padStart(2,'0');

  const compras = comprasCombParsed
    .filter(c => !c.emissao || (c.emissao>=de && c.emissao<=ate))
    .map((c,idx)=>({...c, idx}));
  const pagamentos = pagamentosCombParsed
    .filter(p => p.data>=de && p.data<=ate)
    .map((p,idx)=>({...p, idx}));

  const TOLERANCIA = 4; // diferença entre nota e boleto (juros/desconto de poucos reais)
  const candidatos = [];
  compras.forEach(c=>{
    pagamentos.forEach(p=>{
      const diff = Math.abs(c.valor - p.valor);
      if(diff <= TOLERANCIA){
        const score = pontuarSimilaridadeComb(c.razaoSocial, c.nomeFantasia, p.descricao);
        // sempre exige que ao menos uma palavra do nome do fornecedor bata com a descrição do pagamento —
        // valor idêntico sozinho não é garantia de ser a mesma transação (dois fornecedores podem coincidir de valor)
        if(score >= 1){
          candidatos.push({ compraIdx: c.idx, pagamentoIdx: p.idx, score, diff });
        }
      }
    });
  });
  candidatos.sort((a,b)=> b.score - a.score || a.diff - b.diff);

  const compraUsada = new Set();
  const pagamentoUsado = new Set();
  const pares = [];
  candidatos.forEach(cand=>{
    if(compraUsada.has(cand.compraIdx) || pagamentoUsado.has(cand.pagamentoIdx)) return;
    compraUsada.add(cand.compraIdx);
    pagamentoUsado.add(cand.pagamentoIdx);
    const c = compras.find(x=>x.idx===cand.compraIdx);
    const p = pagamentos.find(x=>x.idx===cand.pagamentoIdx);
    pares.push({ compra: c, pagamento: p, diff: cand.diff });
  });

  const comprasSemPar1 = compras.filter(c=>!compraUsada.has(c.idx));
  const pagamentosSemPar1 = pagamentos.filter(p=>!pagamentoUsado.has(p.idx));

  // 2ª passada: tenta combinar por soma (parcelas / boletos agrupados) o que sobrou
  const grupos = encontrarGruposPorSomaComb(comprasSemPar1, pagamentosSemPar1);
  const compraUsadaGrupo = new Set();
  const pagamentoUsadoGrupo = new Set();
  grupos.forEach(g=>{
    g.compras.forEach(c=>compraUsadaGrupo.add(c.idx));
    g.pagamentos.forEach(p=>pagamentoUsadoGrupo.add(p.idx));
  });
  const comprasSemPar = comprasSemPar1.filter(c=>!compraUsadaGrupo.has(c.idx));
  const pagamentosSemPar = pagamentosSemPar1.filter(p=>!pagamentoUsadoGrupo.has(p.idx));

  const grupoIdPorCompraIdx = {};
  const grupoIdPorPagamentoIdx = {};
  grupos.forEach(g=>{
    const grupoId = gerarIdGrupoComb();
    g.compras.forEach(c=> grupoIdPorCompraIdx[c.idx] = grupoId);
    g.pagamentos.forEach(p=> grupoIdPorPagamentoIdx[p.idx] = grupoId);
  });

  const btn = document.getElementById('combPagBtnCombinar');
  btn.disabled = true;
  btn.textContent = 'Salvando…';
  abrirProgresso('Salvando combinação…');

  // 1) grava TODOS os pagamentos do período (pareados, agrupados ou não), pra poder referenciar o id deles
  const registrosPagamentos = pagamentos.map(p=>({
    loja: lojaAtual, mes: combPagMesAtual, data: p.data, descricao: p.descricao, valor: p.valor,
    grupo_id: grupoIdPorPagamentoIdx[p.idx] || null
  }));
  const { data: pagamentosSalvos, error: erroPag } = await sb.from('comb_pag_pagamentos').insert(registrosPagamentos).select();
  atualizarProgresso(50);

  if(erroPag){
    fecharProgresso();
    btn.disabled = false;
    btn.textContent = 'Combinar planilhas';
    alert('Erro ao salvar pagamentos: ' + erroPag.message);
    return;
  }

  // mapeia índice original -> id salvo, na mesma ordem que foi inserido
  const idPagamentoPorIdx = {};
  pagamentos.forEach((p, i) => { idPagamentoPorIdx[p.idx] = pagamentosSalvos[i].id; });

  // 2) grava as compras: pagamento_id quando par 1:1, grupo_id quando combinado por soma
  const registrosCompras = [
    ...pares.map(par => ({
      loja: lojaAtual, mes: combPagMesAtual,
      num_compra: String(par.compra.numCompra||''), num_nf: String(par.compra.numNF||''),
      emissao: par.compra.emissao, entrada: par.compra.entrada,
      razao_social: par.compra.razaoSocial, nome_fantasia: par.compra.nomeFantasia,
      valor: par.compra.valor, pagamento_id: idPagamentoPorIdx[par.pagamento.idx], diferenca: Number(par.diff.toFixed(2)), grupo_id: null
    })),
    ...grupos.flatMap(g => g.compras.map(c => ({
      loja: lojaAtual, mes: combPagMesAtual,
      num_compra: String(c.numCompra||''), num_nf: String(c.numNF||''),
      emissao: c.emissao, entrada: c.entrada,
      razao_social: c.razaoSocial, nome_fantasia: c.nomeFantasia,
      valor: c.valor, pagamento_id: null, diferenca: 0, grupo_id: grupoIdPorCompraIdx[c.idx]
    }))),
    ...comprasSemPar.map(c => ({
      loja: lojaAtual, mes: combPagMesAtual,
      num_compra: String(c.numCompra||''), num_nf: String(c.numNF||''),
      emissao: c.emissao, entrada: c.entrada,
      razao_social: c.razaoSocial, nome_fantasia: c.nomeFantasia,
      valor: c.valor, pagamento_id: null, diferenca: 0, grupo_id: null
    }))
  ];
  const { error: erroCompras } = await sb.from('comb_pag_compras').insert(registrosCompras);
  atualizarProgresso(100);

  btn.disabled = false;
  btn.textContent = 'Combinar planilhas';
  setTimeout(fecharProgresso, 250);

  if(erroCompras){
    alert('Erro ao salvar compras: ' + erroCompras.message);
    return;
  }

  // recarrega do banco (garante que cada item tenha o id salvo, necessário pra vinculação manual depois)
  await carregarOuPrepararCombinacaoPagamentos();
}

function linhaGrupoComb(g){
  const totalCompras = g.compras.reduce((s,c)=>s+c.valor,0);
  const totalPagamentos = g.pagamentos.reduce((s,p)=>s+p.valor,0);
  const fornecedor = g.compras[0] ? (g.compras[0].nomeFantasia || g.compras[0].razaoSocial) : '';
  const compraLinhas = g.compras.map(c=>escapeHtml((c.numNF?('NF '+c.numNF+' — '):'')+brl(c.valor))).join('<br>');
  const pagamentoLinhas = g.pagamentos.map(p=>escapeHtml((p.data?fmtData(p.data)+' — ':'')+p.descricao+' — '+brl(p.valor))).join('<br>');
  const idsCompras = escapeHtml(JSON.stringify(g.compras.map(c=>c.id)));
  const idsPagamentos = escapeHtml(JSON.stringify(g.pagamentos.map(p=>p.id)));
  return `
    <tr>
      <td>${escapeHtml(fornecedor)}</td>
      <td class="contato">${compraLinhas}</td>
      <td class="valor">${brl(totalCompras)}</td>
      <td class="contato">${pagamentoLinhas}</td>
      <td class="valor">${brl(totalPagamentos)}</td>
      <td class="valor" style="color:${g.diff>0?'var(--gold)':'var(--muted)'};">${g.diff>0 ? brl(g.diff) : '—'}</td>
      <td><button class="filter-btn" style="padding:4px 10px;font-size:12px;" data-ids-compras="${idsCompras}" data-ids-pagamentos="${idsPagamentos}" onclick="desfazerGrupoComb(this)">Desfazer</button></td>
    </tr>
  `;
}

function renderResultadoCombinacaoPagamentos(){
  const { pares, grupos, comprasSemPar, pagamentosSemPar, bonificacoes } = combPagResultado;
  const gruposAuto = (grupos||[]).filter(g=>!g.manual);
  const gruposManuais = (grupos||[]).filter(g=>g.manual);

  document.getElementById('combPagResultadoWrap').style.display = 'block';
  document.getElementById('combPagQtdCombinados').textContent = pares.length;
  document.getElementById('combPagQtdGrupos').textContent = gruposAuto.length;
  document.getElementById('combPagQtdBonificacoes').textContent = (bonificacoes||[]).length;
  document.getElementById('combPagQtdComprasSemPar').textContent = comprasSemPar.length;
  document.getElementById('combPagQtdPagamentosSemPar').textContent = pagamentosSemPar.length;

  const paresFiltrados = pares.filter(par => combPagBate(combPagBusca.combinados,
    par.compra.nomeFantasia, par.compra.razaoSocial, par.compra.numNF, par.pagamento.descricao,
    brl(par.compra.valor), brl(par.pagamento.valor)));

  document.getElementById('combPagCombinadosBody').innerHTML = pares.length===0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum par combinado.</td></tr>'
    : paresFiltrados.length===0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum resultado pra essa busca.</td></tr>'
    : paresFiltrados.map(par=>`
        <tr>
          <td>${escapeHtml(par.compra.nomeFantasia || par.compra.razaoSocial)}</td>
          <td>${escapeHtml(String(par.compra.numNF||''))}</td>
          <td class="valor">${brl(par.compra.valor)}</td>
          <td class="contato">${escapeHtml(par.pagamento.descricao)}</td>
          <td class="valor">${brl(par.pagamento.valor)}</td>
          <td class="valor" style="color:${par.diff>0?'var(--gold)':'var(--muted)'};">${par.diff>0 ? brl(par.diff) : '—'}</td>
          <td><button class="filter-btn" style="padding:4px 10px;font-size:12px;" data-id-compra="${escapeHtml(String(par.compra.id))}" data-id-pagamento="${escapeHtml(String(par.pagamento.id))}" onclick="desfazerParComb(this)">Desfazer</button></td>
        </tr>
      `).join('');

  const bateGrupo = (g, query) => combPagBate(query,
    g.compras[0] ? (g.compras[0].nomeFantasia || g.compras[0].razaoSocial) : '',
    ...g.compras.map(c=>c.numNF), ...g.compras.map(c=>brl(c.valor)),
    ...g.pagamentos.map(p=>p.descricao), ...g.pagamentos.map(p=>brl(p.valor)));

  const gruposAutoFiltrados = gruposAuto.filter(g=>bateGrupo(g, combPagBusca.grupos));
  document.getElementById('combPagGruposBody').innerHTML = gruposAuto.length===0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhuma combinação por soma encontrada.</td></tr>'
    : gruposAutoFiltrados.length===0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum resultado pra essa busca.</td></tr>'
    : gruposAutoFiltrados.map(linhaGrupoComb).join('');

  const gruposManuaisFiltrados = gruposManuais.filter(g=>bateGrupo(g, combPagBusca.manuais));
  document.getElementById('combPagManuaisBody').innerHTML = gruposManuais.length===0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhuma vinculação manual ainda. Selecione itens nas tabelas abaixo pra vincular com desconto.</td></tr>'
    : gruposManuaisFiltrados.length===0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum resultado pra essa busca.</td></tr>'
    : gruposManuaisFiltrados.map(linhaGrupoComb).join('');

  const bonificacoesFiltradas = (bonificacoes||[]).filter(c=>combPagBate(combPagBusca.bonificacoes,
    c.nomeFantasia, c.razaoSocial, c.numNF, brl(c.valor)));
  document.getElementById('combPagBonificacoesBody').innerHTML = (!bonificacoes || bonificacoes.length===0)
    ? '<tr><td colspan="5" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhuma bonificação marcada ainda. Selecione compras abaixo e marque como bonificação.</td></tr>'
    : bonificacoesFiltradas.length===0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum resultado pra essa busca.</td></tr>'
    : bonificacoesFiltradas.map(c=>`
        <tr>
          <td>${escapeHtml(c.nomeFantasia || c.razaoSocial)}</td>
          <td>${escapeHtml(String(c.numNF||''))}</td>
          <td class="data">${c.emissao ? fmtData(c.emissao) : '—'}</td>
          <td class="valor">${brl(c.valor)}</td>
          <td style="white-space:nowrap;">
            <button class="filter-btn" style="padding:4px 10px;font-size:12px;" data-id="${escapeHtml(String(c.id))}" onclick="desfazerBonificacaoComb([this.dataset.id])">Desfazer</button>
            <button class="filter-btn" style="padding:4px 10px;font-size:12px;color:var(--rust);" data-tipo="compra" data-id="${escapeHtml(String(c.id))}" data-rotulo="${escapeHtml((c.nomeFantasia||c.razaoSocial)+' — '+brl(c.valor))}" onclick="abrirConfirmacaoExcluirItemComb(this)">🗑</button>
          </td>
        </tr>
      `).join('');

  const comprasSemParFiltradas = comprasSemPar.filter(c=>combPagBate(combPagBusca.comprasSemPar,
    c.nomeFantasia, c.razaoSocial, c.numNF, brl(c.valor)));
  document.getElementById('combPagComprasSemParBody').innerHTML = comprasSemPar.length===0
    ? '<tr><td colspan="6" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Todas as compras encontraram um pagamento.</td></tr>'
    : comprasSemParFiltradas.length===0
    ? '<tr><td colspan="6" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum resultado pra essa busca.</td></tr>'
    : comprasSemParFiltradas.map(c=>`
        <tr>
          <td style="width:34px;"><input type="checkbox" data-id="${escapeHtml(String(c.id))}" ${combPagSelecaoCompras.has(String(c.id))?'checked':''} onchange="toggleSelecaoCompraComb(this)"></td>
          <td>${escapeHtml(c.nomeFantasia || c.razaoSocial)}</td>
          <td>${escapeHtml(String(c.numNF||''))}</td>
          <td class="data">${c.emissao ? fmtData(c.emissao) : '—'}</td>
          <td class="valor" style="color:var(--rust);">${brl(c.valor)}</td>
          <td><button class="filter-btn" style="padding:4px 10px;font-size:12px;color:var(--rust);" data-tipo="compra" data-id="${escapeHtml(String(c.id))}" data-rotulo="${escapeHtml((c.nomeFantasia||c.razaoSocial)+' — '+brl(c.valor))}" onclick="abrirConfirmacaoExcluirItemComb(this)">🗑</button></td>
        </tr>
      `).join('');

  const pagamentosSemParFiltrados = pagamentosSemPar.filter(p=>combPagBate(combPagBusca.pagamentosSemPar,
    p.descricao, brl(p.valor)));
  document.getElementById('combPagPagamentosSemParBody').innerHTML = pagamentosSemPar.length===0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Todos os pagamentos encontraram uma compra.</td></tr>'
    : pagamentosSemParFiltrados.length===0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum resultado pra essa busca.</td></tr>'
    : pagamentosSemParFiltrados.map(p=>`
        <tr>
          <td style="width:34px;"><input type="checkbox" data-id="${escapeHtml(String(p.id))}" ${combPagSelecaoPagamentos.has(String(p.id))?'checked':''} onchange="toggleSelecaoPagamentoComb(this)"></td>
          <td class="data">${fmtData(p.data)}</td>
          <td class="contato">${escapeHtml(p.descricao)}</td>
          <td class="valor" style="color:var(--rust);">${brl(p.valor)}</td>
          <td><button class="filter-btn" style="padding:4px 10px;font-size:12px;color:var(--rust);" data-tipo="pagamento" data-id="${escapeHtml(String(p.id))}" data-rotulo="${escapeHtml(p.descricao+' — '+brl(p.valor))}" onclick="abrirConfirmacaoExcluirItemComb(this)">🗑</button></td>
        </tr>
      `).join('');

  atualizarBarraSelecaoComb();
}

function toggleSelecaoCompraComb(input){
  const id = input.dataset.id;
  if(input.checked) combPagSelecaoCompras.add(id); else combPagSelecaoCompras.delete(id);
  atualizarBarraSelecaoComb();
}
function toggleSelecaoPagamentoComb(input){
  const id = input.dataset.id;
  if(input.checked) combPagSelecaoPagamentos.add(id); else combPagSelecaoPagamentos.delete(id);
  atualizarBarraSelecaoComb();
}

function limparSelecaoManualComb(){
  combPagSelecaoCompras.clear();
  combPagSelecaoPagamentos.clear();
  renderResultadoCombinacaoPagamentos();
}

function atualizarBarraSelecaoComb(){
  const barra = document.getElementById('combPagBarraSelecao');
  if(!barra) return;
  const { comprasSemPar, pagamentosSemPar } = combPagResultado;
  const compras = comprasSemPar.filter(c=>combPagSelecaoCompras.has(String(c.id)));
  const pagamentos = pagamentosSemPar.filter(p=>combPagSelecaoPagamentos.has(String(p.id)));

  if(compras.length===0 && pagamentos.length===0){
    barra.style.display = 'none';
    return;
  }
  barra.style.display = 'flex';

  const totalCompras = compras.reduce((s,c)=>s+c.valor,0);
  const totalPagamentos = pagamentos.reduce((s,p)=>s+p.valor,0);
  const diff = totalCompras - totalPagamentos;

  document.getElementById('combPagBarraTexto').innerHTML =
    `<b>${compras.length}</b> compra(s) selecionada(s) (${brl(totalCompras)}) &nbsp;+&nbsp; <b>${pagamentos.length}</b> pagamento(s) selecionado(s) (${brl(totalPagamentos)})`
    + (compras.length>0 && pagamentos.length>0 ? ` &nbsp;→&nbsp; diferença: <b style="color:${Math.abs(diff)>0.005?'var(--gold)':'var(--muted)'}">${brl(Math.abs(diff))}</b>` : '');

  const btn = document.getElementById('combPagBtnVincular');
  btn.disabled = !(compras.length>0 && pagamentos.length>0);

  const btnBonif = document.getElementById('combPagBtnBonificacao');
  if(btnBonif) btnBonif.disabled = !(compras.length>0);
}

function abrirConfirmacaoBonificacaoComb(){
  const { comprasSemPar } = combPagResultado;
  const compras = comprasSemPar.filter(c=>combPagSelecaoCompras.has(String(c.id)));
  if(compras.length===0) return;

  const totalCompras = compras.reduce((s,c)=>s+c.valor,0);
  document.getElementById('confirmBonificacaoCombTexto').innerHTML =
    `Marcar <b>${compras.length}</b> compra(s) (${brl(totalCompras)}) como bonificação (sem pagamento esperado)?`
    + `<br>Ela(s) vai(vão) sair da lista de pendências e não vai(vão) mais precisar de um pagamento pareado.`;

  document.getElementById('confirmBonificacaoCombModal').style.display = 'flex';
}

function fecharConfirmacaoBonificacaoComb(){
  document.getElementById('confirmBonificacaoCombModal').style.display = 'none';
}

async function confirmarBonificacaoCombOk(){
  const paraTipoOriginal = v => (v!=='' && !isNaN(v)) ? Number(v) : v;
  const idsCompras = [...combPagSelecaoCompras].map(paraTipoOriginal);
  if(idsCompras.length===0) return;

  fecharConfirmacaoBonificacaoComb();
  abrirProgresso('Marcando…');

  const { data: atualizados, error } = await sb.from('comb_pag_compras').update({ bonificacao: true }).in('id', idsCompras).select('id');
  fecharProgresso();

  if(error){
    alert('Erro ao marcar bonificação: ' + error.message);
    return;
  }
  if(!atualizados || atualizados.length===0){
    alert('Nada foi alterado — o(s) registro(s) selecionado(s) não foi(ram) encontrado(s) no banco (id: ' + idsCompras.join(', ') + '). Tente recarregar a página (Ctrl+Shift+R) e repetir.');
    return;
  }

  combPagSelecaoCompras.clear();
  await carregarOuPrepararCombinacaoPagamentos();
}

async function desfazerBonificacaoComb(idsCompras){
  abrirProgresso('Desfazendo…');
  const { data: atualizados, error } = await sb.from('comb_pag_compras').update({ bonificacao: false }).in('id', idsCompras).select('id');
  fecharProgresso();
  if(error){
    alert('Erro ao desfazer: ' + error.message);
    return;
  }
  if(!atualizados || atualizados.length===0){
    alert('Nada foi alterado — o registro não foi encontrado no banco (id: ' + idsCompras.join(', ') + '). Tente recarregar a página (Ctrl+Shift+R) e clicar em Desfazer de novo.');
    return;
  }
  await carregarOuPrepararCombinacaoPagamentos();
}

function abrirConfirmacaoVincularManualComb(){
  const { comprasSemPar, pagamentosSemPar } = combPagResultado;
  const compras = comprasSemPar.filter(c=>combPagSelecaoCompras.has(String(c.id)));
  const pagamentos = pagamentosSemPar.filter(p=>combPagSelecaoPagamentos.has(String(p.id)));
  if(compras.length===0 || pagamentos.length===0) return;

  const totalCompras = compras.reduce((s,c)=>s+c.valor,0);
  const totalPagamentos = pagamentos.reduce((s,p)=>s+p.valor,0);
  const diff = totalCompras - totalPagamentos;

  document.getElementById('confirmVincularManualCombTexto').innerHTML =
    `Vincular <b>${compras.length}</b> compra(s) (${brl(totalCompras)}) com <b>${pagamentos.length}</b> pagamento(s) (${brl(totalPagamentos)})?`
    + `<br>Diferença: <b>${brl(Math.abs(diff))}</b>${diff>0 ? ' (compra maior — provável desconto no boleto)' : (diff<0 ? ' (pagamento maior que a compra)' : '')}.`;

  document.getElementById('confirmVincularManualCombModal').style.display = 'flex';
}

function fecharConfirmacaoVincularManualComb(){
  document.getElementById('confirmVincularManualCombModal').style.display = 'none';
}

async function confirmarVincularManualCombOk(){
  const paraTipoOriginal = v => (v!=='' && !isNaN(v)) ? Number(v) : v;
  const idsCompras = [...combPagSelecaoCompras].map(paraTipoOriginal);
  const idsPagamentos = [...combPagSelecaoPagamentos].map(paraTipoOriginal);
  if(idsCompras.length===0 || idsPagamentos.length===0) return;

  fecharConfirmacaoVincularManualComb();
  abrirProgresso('Vinculando…');

  const grupoId = gerarIdGrupoComb();
  const { data: atu1, error: erro1 } = await sb.from('comb_pag_compras').update({ grupo_id: grupoId, grupo_manual: true, pagamento_id: null }).in('id', idsCompras).select('id');
  const { data: atu2, error: erro2 } = erro1 ? {data:null, error:null} : await sb.from('comb_pag_pagamentos').update({ grupo_id: grupoId, grupo_manual: true }).in('id', idsPagamentos).select('id');
  fecharProgresso();

  if(erro1 || erro2){
    alert('Erro ao vincular: ' + ((erro1||erro2).message));
    return;
  }
  if((!atu1 || atu1.length===0) || (!atu2 || atu2.length===0)){
    alert('Nada foi alterado — algum dos registros selecionados não foi encontrado no banco. Tente recarregar a página (Ctrl+Shift+R) e repetir a seleção.');
    return;
  }

  combPagSelecaoCompras.clear();
  combPagSelecaoPagamentos.clear();
  await carregarOuPrepararCombinacaoPagamentos();
}

async function desfazerGrupoComb(botao){
  const idsCompras = JSON.parse(botao.dataset.idsCompras);
  const idsPagamentos = JSON.parse(botao.dataset.idsPagamentos);
  abrirProgresso('Desfazendo…');
  const { data: atu1, error: erro1 } = await sb.from('comb_pag_compras').update({ grupo_id: null, grupo_manual: false }).in('id', idsCompras).select('id');
  const { data: atu2, error: erro2 } = erro1 ? {data:null, error:null} : await sb.from('comb_pag_pagamentos').update({ grupo_id: null, grupo_manual: false }).in('id', idsPagamentos).select('id');
  fecharProgresso();
  if(erro1 || erro2){
    alert('Erro ao desfazer: ' + ((erro1||erro2).message));
    return;
  }
  if((!atu1 || atu1.length===0) && (!atu2 || atu2.length===0)){
    alert('Nada foi alterado — os registros não foram encontrados no banco. Tente recarregar a página (Ctrl+Shift+R) e clicar em Desfazer de novo.');
    return;
  }
  await carregarOuPrepararCombinacaoPagamentos();
}

// desfaz um par 1:1 da tabela "Combinados" (a compra e o pagamento voltam pra lista de sem-par)
async function desfazerParComb(botao){
  const idCompra = botao.dataset.idCompra;
  abrirProgresso('Desfazendo…');
  const { data: atualizados, error } = await sb.from('comb_pag_compras').update({ pagamento_id: null, diferenca: 0 }).eq('id', idCompra).select('id');
  fecharProgresso();
  if(error){
    alert('Erro ao desfazer: ' + error.message);
    return;
  }
  if(!atualizados || atualizados.length===0){
    alert('Nada foi alterado — o registro (id: ' + idCompra + ') não foi encontrado no banco. Tente recarregar a página (Ctrl+Shift+R) e clicar em Desfazer de novo.');
    return;
  }
  await carregarOuPrepararCombinacaoPagamentos();
}

// exclusão individual de um lançamento (compra ou pagamento) de dentro da Combinação de Pagamentos.
// só disponível pra itens sem par (soltos) — itens combinados/agrupados precisam de "Desfazer" primeiro.
let combPagExcluirAlvo = null;
function abrirConfirmacaoExcluirItemComb(botao){
  const tipo = botao.dataset.tipo;
  const id = botao.dataset.id;
  const rotulo = botao.dataset.rotulo;
  combPagExcluirAlvo = { tipo, id };
  document.getElementById('confirmExcluirItemCombTexto').textContent =
    (tipo==='compra' ? 'Excluir a compra ' : 'Excluir o pagamento ') + rotulo + '? Essa ação não pode ser desfeita.';
  document.getElementById('confirmExcluirItemCombModal').style.display = 'flex';
}
function fecharConfirmacaoExcluirItemComb(){
  combPagExcluirAlvo = null;
  document.getElementById('confirmExcluirItemCombModal').style.display = 'none';
}
async function confirmarExcluirItemCombOk(){
  if(!combPagExcluirAlvo) return;
  const { tipo, id } = combPagExcluirAlvo;
  fecharConfirmacaoExcluirItemComb();
  abrirProgresso('Excluindo…');
  const tabela = tipo==='compra' ? 'comb_pag_compras' : 'comb_pag_pagamentos';
  const { data: excluidos, error } = await sb.from(tabela).delete().eq('id', id).select('id');
  fecharProgresso();
  if(error){
    alert('Erro ao excluir: ' + error.message);
    return;
  }
  if(!excluidos || excluidos.length===0){
    alert('Nada foi excluído — o registro (id: ' + id + ') não foi encontrado no banco. Tente recarregar a página (Ctrl+Shift+R) e repetir.');
    return;
  }
  combPagSelecaoCompras.delete(String(id));
  combPagSelecaoPagamentos.delete(String(id));
  await carregarOuPrepararCombinacaoPagamentos();
}

function nomeArquivoCombPag(extensao){
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  return 'combinacao-pagamentos-' + nomeLoja + '-' + combPagMesAtual + '.' + extensao;
}

function exportarExcelCombinacaoPagamentos(){
  const { pares, grupos, comprasSemPar, pagamentosSemPar, bonificacoes } = combPagResultado;
  if(pares.length===0 && (!grupos||grupos.length===0) && comprasSemPar.length===0 && pagamentosSemPar.length===0 && (!bonificacoes||bonificacoes.length===0)){ alert('Combine as planilhas primeiro.'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }

  const livro = XLSX.utils.book_new();

  const planCombinados = XLSX.utils.json_to_sheet(pares.map(par=>({
    'Fornecedor (compra)': par.compra.nomeFantasia || par.compra.razaoSocial,
    'Nº NF': par.compra.numNF,
    'Valor compra': par.compra.valor,
    'Descrição (pagamento)': par.pagamento.descricao,
    'Valor pagamento': par.pagamento.valor,
    'Diferença': Number(par.diff.toFixed(2))
  })));
  planCombinados['!cols'] = [{wch:30},{wch:12},{wch:14},{wch:30},{wch:14},{wch:12}];
  XLSX.utils.book_append_sheet(livro, planCombinados, 'Combinados');

  const linhasGrupo = g=>({
    'Fornecedor': g.compras[0] ? (g.compras[0].nomeFantasia || g.compras[0].razaoSocial) : '',
    'Compra(s)': g.compras.map(c=>(c.numNF?('NF '+c.numNF+' - '):'')+brl(c.valor)).join(' | '),
    'Valor compra(s)': Number(g.compras.reduce((s,c)=>s+c.valor,0).toFixed(2)),
    'Pagamento(s)': g.pagamentos.map(p=>(p.data?fmtData(p.data)+' - ':'')+p.descricao+' - '+brl(p.valor)).join(' | '),
    'Valor pagamento(s)': Number(g.pagamentos.reduce((s,p)=>s+p.valor,0).toFixed(2)),
    'Diferença': Number(g.diff.toFixed(2))
  });

  const planGrupos = XLSX.utils.json_to_sheet((grupos||[]).filter(g=>!g.manual).map(linhasGrupo));
  planGrupos['!cols'] = [{wch:30},{wch:35},{wch:14},{wch:45},{wch:16},{wch:12}];
  XLSX.utils.book_append_sheet(livro, planGrupos, 'Combinados (soma)');

  const planManuais = XLSX.utils.json_to_sheet((grupos||[]).filter(g=>g.manual).map(linhasGrupo));
  planManuais['!cols'] = [{wch:30},{wch:35},{wch:14},{wch:45},{wch:16},{wch:12}];
  XLSX.utils.book_append_sheet(livro, planManuais, 'Vinculados manualmente');

  const planBonificacoes = XLSX.utils.json_to_sheet((bonificacoes||[]).map(c=>({
    'Fornecedor': c.nomeFantasia || c.razaoSocial, 'Nº NF': c.numNF, 'Emissão': c.emissao ? fmtData(c.emissao) : '', 'Valor': c.valor
  })));
  planBonificacoes['!cols'] = [{wch:30},{wch:12},{wch:12},{wch:14}];
  XLSX.utils.book_append_sheet(livro, planBonificacoes, 'Bonificações');

  const planComprasSemPar = XLSX.utils.json_to_sheet(comprasSemPar.map(c=>({
    'Fornecedor': c.nomeFantasia || c.razaoSocial, 'Nº NF': c.numNF, 'Emissão': c.emissao ? fmtData(c.emissao) : '', 'Valor': c.valor
  })));
  planComprasSemPar['!cols'] = [{wch:30},{wch:12},{wch:12},{wch:14}];
  XLSX.utils.book_append_sheet(livro, planComprasSemPar, 'Compras sem pagamento');

  const planPagamentosSemPar = XLSX.utils.json_to_sheet(pagamentosSemPar.map(p=>({
    'Data': fmtData(p.data), 'Descrição': p.descricao, 'Valor': p.valor
  })));
  planPagamentosSemPar['!cols'] = [{wch:12},{wch:34},{wch:14}];
  XLSX.utils.book_append_sheet(livro, planPagamentosSemPar, 'Pagamentos sem compra');

  XLSX.writeFile(livro, nomeArquivoCombPag('xlsx'));
}

function exportarPdfCombinacaoPagamentos(){
  const { pares, grupos, comprasSemPar, pagamentosSemPar, bonificacoes } = combPagResultado;
  if(pares.length===0 && (!grupos||grupos.length===0) && comprasSemPar.length===0 && pagamentosSemPar.length===0 && (!bonificacoes||bonificacoes.length===0)){ alert('Combine as planilhas primeiro.'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const [ano, mes] = combPagMesAtual.split('-');
  const rotuloMes = NOMES_MES[parseInt(mes,10)-1] + ' ' + ano;

  doc.setFontSize(16);
  doc.text('Combinação de Pagamentos — ' + (NOMES_LOJA[lojaAtual]||''), 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Mês: ' + rotuloMes + '   ·   Combinados: ' + pares.length + '   ·   Sem par: ' + (comprasSemPar.length+pagamentosSemPar.length), 14, 25);

  doc.autoTable({
    startY: 32,
    head: [['Fornecedor (compra)','Nº NF','Valor compra','Descrição (pagamento)','Valor pagamento','Diferença']],
    body: pares.map(par=>[
      par.compra.nomeFantasia || par.compra.razaoSocial, String(par.compra.numNF||''), brl(par.compra.valor),
      par.pagamento.descricao, brl(par.pagamento.valor), par.diff>0 ? brl(par.diff) : '—'
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [38,51,43] }
  });

  const linhasGrupoPdf = g=>[
    g.compras[0] ? (g.compras[0].nomeFantasia || g.compras[0].razaoSocial) : '',
    g.compras.map(c=>(c.numNF?('NF '+c.numNF+' - '):'')+brl(c.valor)).join('\n'),
    brl(g.compras.reduce((s,c)=>s+c.valor,0)),
    g.pagamentos.map(p=>(p.data?fmtData(p.data)+' - ':'')+p.descricao+' - '+brl(p.valor)).join('\n'),
    brl(g.pagamentos.reduce((s,p)=>s+p.valor,0)),
    g.diff>0 ? brl(g.diff) : '—'
  ];
  const gruposAutoPdf = (grupos||[]).filter(g=>!g.manual);
  const gruposManuaisPdf = (grupos||[]).filter(g=>g.manual);

  if(gruposAutoPdf.length>0){
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 12,
      head: [['Fornecedor','Compra(s)','Valor compra(s)','Pagamento(s)','Valor pagamento(s)','Diferença']],
      body: gruposAutoPdf.map(linhasGrupoPdf),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [38,51,43] }
    });
  }

  if(gruposManuaisPdf.length>0){
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 12,
      head: [['Fornecedor (vinculado manualmente)','Compra(s)','Valor compra(s)','Pagamento(s)','Valor pagamento(s)','Diferença']],
      body: gruposManuaisPdf.map(linhasGrupoPdf),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [180,140,30] }
    });
  }

  if(bonificacoes && bonificacoes.length>0){
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 12,
      head: [['Bonificações','Nº NF','Emissão','Valor']],
      body: bonificacoes.map(c=>[c.nomeFantasia || c.razaoSocial, String(c.numNF||''), c.emissao?fmtData(c.emissao):'', brl(c.valor)]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [180,140,30] }
    });
  }

  if(comprasSemPar.length>0){
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 12,
      head: [['Compras sem pagamento','Nº NF','Emissão','Valor']],
      body: comprasSemPar.map(c=>[c.nomeFantasia || c.razaoSocial, String(c.numNF||''), c.emissao?fmtData(c.emissao):'', brl(c.valor)]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [155,60,50] }
    });
  }

  if(pagamentosSemPar.length>0){
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 12,
      head: [['Pagamentos sem compra','Descrição','Valor']],
      body: pagamentosSemPar.map(p=>[fmtData(p.data), p.descricao, brl(p.valor)]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [155,60,50] }
    });
  }

  doc.save(nomeArquivoCombPag('pdf'));
}

/* ---------- Colar de planilha (Descrição + Valor), com sugestão automática de código ---------- */

let colarPagCaixaParsed = [];

function toggleColarPagCaixa(){
  const area = document.getElementById('colarPagCaixaArea');
  area.style.display = area.style.display==='none' ? 'block' : 'none';
}

async function processarColarPagCaixa(){
  const texto = document.getElementById('colarPagCaixaTexto').value;
  const linhasTexto = texto.split('\n').map(l=>l.trim()).filter(l=>l);
  if(linhasTexto.length===0){
    alert('Cole ao menos uma linha com descrição e valor.');
    return;
  }

  // consulta a memória (compartilhada entre as duas lojas — sobrevive mesmo se os lançamentos forem apagados depois)
  const { data: historico } = await buscarTodasLinhas((from, to) =>
    sb.from('pagamentos_caixa_memoria').select('descricao_normalizada,codigo_tipo_id').range(from, to)
  );
  const mapaHistorico = {};
  (historico||[]).forEach(h=>{
    mapaHistorico[h.descricao_normalizada] = h.codigo_tipo_id;
  });

  const linhas = [];
  linhasTexto.forEach(linha=>{
    const partes = linha.split('\t');
    const colunas = partes.length>=2 ? partes : linha.split(/\s{2,}/);
    if(colunas.length<2) return;
    const descricao = colunas[0].trim();
    const valor = parseNumeroVenda(colunas[colunas.length-1]);
    if(!descricao || valor===null) return;
    const chave = descricao.toLowerCase();
    const tipoSugerido = mapaHistorico[chave] || '';
    linhas.push({ descricao, valor, tipoId: tipoSugerido });
  });

  if(linhas.length===0){
    alert('Não consegui reconhecer nenhuma linha válida. Confira se colou "Descrição" e "Valor" separados por tab (copiando direto do Excel).');
    return;
  }

  colarPagCaixaParsed = linhas;
  renderColarPagCaixaPreview();
}

function labelTipoPagCaixa(t){
  return t.codigo + ' - ' + t.descricao;
}

function renderColarPagCaixaPreview(){
  document.getElementById('colarPagCaixaPreviewBody').innerHTML = colarPagCaixaParsed.map((l,idx)=>{
    const tipoAtual = pagCaixaTiposCache.find(t=>t.id===l.tipoId);
    return `<tr>
      <td>${escapeHtml(l.descricao)}</td>
      <td class="valor">${brl(l.valor)}</td>
      <td>
        <input id="colarPagCaixaTipo_${idx}" list="pagCaixaTiposDatalist" autocomplete="off" style="width:100%;" value="${tipoAtual ? escapeHtml(labelTipoPagCaixa(tipoAtual)) : ''}" oninput="matchTipoColarPagCaixa(${idx})" onkeydown="if(event.key==='Enter'){event.preventDefault();const prox=document.getElementById('colarPagCaixaTipo_${idx+1}');if(prox){prox.focus();prox.select();}else{this.blur();}}">
        <span id="colarPagCaixaTipoAviso_${idx}" style="font-size:10px;color:${l.tipoId?'var(--green)':'var(--rust)'};">${l.tipoId ? '🔁 sugerido pelo histórico' : '🆕 novo, escolha manualmente'}</span>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('colarPagCaixaPreviewWrap').style.display = 'block';
}

function matchTipoColarPagCaixa(idx){
  const campo = document.getElementById('colarPagCaixaTipo_' + idx);
  const texto = campo.value.trim();
  const aviso = document.getElementById('colarPagCaixaTipoAviso_' + idx);
  const tipo = pagCaixaTiposCache.find(t=>labelTipoPagCaixa(t).toLowerCase()===texto.toLowerCase());
  colarPagCaixaParsed[idx].tipoId = tipo ? tipo.id : '';
  if(tipo){
    aviso.textContent = '✓ código ' + tipo.codigo + ' selecionado';
    aviso.style.color = 'var(--green)';
    campo.style.borderColor = '';
  }else{
    aviso.textContent = texto ? '⚠ nenhum código encontrado com esse nome' : '🆕 escolha um código';
    aviso.style.color = 'var(--rust)';
  }
}

function cancelarColarPagCaixa(){
  colarPagCaixaParsed = [];
  document.getElementById('colarPagCaixaTexto').value = '';
  document.getElementById('colarPagCaixaPreviewWrap').style.display = 'none';
}

async function confirmarColarPagCaixa(){
  const semCodigo = colarPagCaixaParsed.filter(l=>!l.tipoId);
  if(semCodigo.length>0){
    const descricoes = semCodigo.map(l=>'"' + l.descricao + '"').join(', ');
    alert('Ainda falta escolher o código de tipo de ' + semCodigo.length + ' linha(s), marcada(s) em vermelho na tabela: ' + descricoes);
    colarPagCaixaParsed.forEach((l,idx)=>{
      const campo = document.getElementById('colarPagCaixaTipo_' + idx);
      if(campo) campo.style.borderColor = l.tipoId ? '' : 'var(--rust)';
    });
    const primeiraFaltando = colarPagCaixaParsed.findIndex(l=>!l.tipoId);
    if(primeiraFaltando>-1){
      const campo = document.getElementById('colarPagCaixaTipo_' + primeiraFaltando);
      if(campo) campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const dataEscolhida = document.getElementById('pagCaixa_data').value || todayStr();
  const registros = colarPagCaixaParsed.map(l=>({
    loja: lojaAtual,
    codigo_tipo_id: l.tipoId,
    descricao_pagamento: l.descricao,
    valor_pagamento: l.valor,
    data: dataEscolhida
  }));

  const { data: salvos, error } = await sb.from('pagamentos_caixa').insert(registros).select('*, pagamentos_caixa_tipos(codigo,descricao)');
  if(error){
    alert('Erro ao importar: ' + error.message);
    return;
  }

  pagCaixaCache = pagCaixaCache.concat(salvos||[]);
  const memoriaRegistros = colarPagCaixaParsed.map(l=>({
    descricao_normalizada: l.descricao.trim().toLowerCase(),
    codigo_tipo_id: l.tipoId,
    atualizado_em: new Date().toISOString()
  }));
  memoriaRegistros.forEach(m=>{ mapaMemoriaGlobal[m.descricao_normalizada] = m.codigo_tipo_id; });
  await sb.from('pagamentos_caixa_memoria').upsert(memoriaRegistros, { onConflict: 'descricao_normalizada' });
  renderPagamentoCaixa();
  await popularFiltroMesPagCaixa();
  cancelarColarPagCaixa();
  document.getElementById('colarPagCaixaArea').style.display = 'none';
  alert((salvos||[]).length + ' pagamento(s) importado(s) com sucesso.');
}

/* ================= PROJEÇÃO (fluxo de caixa + contas a pagar) ================= */

let projecaoJaCarregada = false;
let projecaoMesAtual = '';
let projecaoSelecionadas = new Set();
let projecaoPendentesAtual = [];
let projecaoEntradasValor = 0;
let projecaoSaidasValor = 0;

async function abrirProjecao(){
  const sel = document.getElementById('projecaoFiltroMes');
  const mesAtual = new Date().toISOString().slice(0,7);
  const hoje = new Date();
  const meses = [];
  for(let i=0;i<12;i++){
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
    meses.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
  }
  sel.innerHTML = meses.map(chave=>{
    const [ano, mes] = chave.split('-');
    return `<option value="${chave}">${NOMES_MES[parseInt(mes,10)-1]} ${ano}</option>`;
  }).join('');
  sel.value = mesAtual;
  projecaoMesAtual = mesAtual;
  await carregarProjecao();
}

function mudarMesProjecao(valor){
  projecaoMesAtual = valor;
  carregarProjecao();
}

let projecaoMesAnterior = null;

async function carregarProjecao(){
  const [ano, mes] = projecaoMesAtual.split('-');
  const ultimoDia = new Date(parseInt(ano,10), parseInt(mes,10), 0).getDate();
  const de = projecaoMesAtual + '-01';
  const ate = projecaoMesAtual + '-' + String(ultimoDia).padStart(2,'0');

  const { data: mesLancamentos } = await buscarTodasLinhas((from, to)=>
    sb.from('fluxo_caixa_lancamentos').select('valor').eq('loja', lojaAtual).gte('data', de).lte('data', ate).range(from, to)
  );
  projecaoEntradasValor = (mesLancamentos||[]).filter(l=>Number(l.valor)>0).reduce((s,l)=>s+Number(l.valor), 0);
  projecaoSaidasValor = (mesLancamentos||[]).filter(l=>Number(l.valor)<0).reduce((s,l)=>s+Math.abs(Number(l.valor)), 0);

  const novosPendentes = (lancamentos||[]).filter(l=>l.tipo==='pagar' && l.status!=='pago' && l.loja===lojaAtual);
  const mesMudou = projecaoMesAnterior !== projecaoMesAtual;

  if(mesMudou){
    // mês diferente do que estava sendo visto: recomeça do zero, com o padrão de novo
    projecaoSelecionadas = new Set(novosPendentes.filter(l=>l.vencimento>=de && l.vencimento<=ate).map(l=>l.id));
    projecaoMesAnterior = projecaoMesAtual;
  }else{
    // mesmo mês: preserva o que o usuário já marcou/desmarcou, só adiciona contas novas
    const idsConhecidos = new Set(projecaoPendentesAtual.map(l=>l.id));
    novosPendentes.forEach(l=>{
      if(!idsConhecidos.has(l.id) && l.vencimento>=de && l.vencimento<=ate){
        projecaoSelecionadas.add(l.id);
      }
    });
    const idsAtuais = new Set(novosPendentes.map(l=>l.id));
    Array.from(projecaoSelecionadas).forEach(id=>{
      if(!idsAtuais.has(id)) projecaoSelecionadas.delete(id);
    });
  }

  projecaoPendentesAtual = novosPendentes;
  renderProjecao();
}

function renderProjecao(){
  const pendentes = projecaoPendentesAtual.slice().sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  const body = document.getElementById('projecaoContasBody');
  const empty = document.getElementById('projecaoContasEmpty');
  if(pendentes.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
  }else{
    empty.style.display = 'none';
    body.innerHTML = pendentes.map(l=>`
      <tr>
        <td style="width:36px;"><input type="checkbox" ${projecaoSelecionadas.has(l.id)?'checked':''} onchange="toggleProjecaoConta('${l.id}', this.checked)"></td>
        <td class="data">${fmtData(l.vencimento)}</td>
        <td class="contato">${escapeHtml(l.contato || l.descricao || '—')}</td>
        <td class="valor">${brl(l.valor)}</td>
      </tr>
    `).join('');
  }
  atualizarTotaisProjecao();
}

function toggleProjecaoConta(id, marcado){
  if(marcado) projecaoSelecionadas.add(id); else projecaoSelecionadas.delete(id);
  atualizarTotaisProjecao();
}

function atualizarTotaisProjecao(){
  const totalContas = projecaoPendentesAtual
    .filter(l=>projecaoSelecionadas.has(l.id))
    .reduce((s,l)=>s+Number(l.valor), 0);

  document.getElementById('projecaoEntradas').textContent = brl(projecaoEntradasValor);
  document.getElementById('projecaoSaidas').textContent = brl(projecaoSaidasValor);
  document.getElementById('projecaoContas').textContent = brl(totalContas);

  const saldo = projecaoEntradasValor - projecaoSaidasValor - totalContas;
  const elSaldo = document.getElementById('projecaoSaldo');
  elSaldo.textContent = brl(saldo);
  elSaldo.style.color = saldo<0 ? 'var(--rust)' : 'var(--green)';
}

/* ================= CONTAS BANCÁRIAS ================= */

let contasBancariasCache = [];
let contaBancariaEditandoId = null;
let excluindoContaBancariaId = null;

async function carregarContasBancarias(){
  document.getElementById('contasBancariasLojaNome').textContent = NOMES_LOJA[lojaAtual] || '';
  const { data, error } = await sb.from('fluxo_caixa_contas').select('*').eq('loja', lojaAtual).order('ordem').order('nome');
  if(error){ console.error('Erro ao carregar contas bancárias:', error); contasBancariasCache = []; }
  else contasBancariasCache = data || [];
  renderContasBancarias();
}

function renderContasBancarias(){
  const body = document.getElementById('contasBancariasBody');
  const empty = document.getElementById('contasBancariasEmpty');
  if(contasBancariasCache.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  body.innerHTML = contasBancariasCache.map((c,idx)=>`
    <tr>
      <td>${escapeHtml(c.nome)}</td>
      <td><div class="rowactions">
        <button class="iconbtn" title="Mover pra cima" ${idx===0?'disabled style="opacity:.3;"':''} onclick="moverContaBancaria('${c.id}', -1)">▲</button>
        <button class="iconbtn" title="Mover pra baixo" ${idx===contasBancariasCache.length-1?'disabled style="opacity:.3;"':''} onclick="moverContaBancaria('${c.id}', 1)">▼</button>
        <button class="iconbtn edit" title="Editar" onclick="abrirEditarContaBancaria('${c.id}')">✎</button>
        <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoContaBancaria('${c.id}')">✕</button>
      </div></td>
    </tr>
  `).join('');
}

async function moverContaBancaria(id, direcao){
  const idx = contasBancariasCache.findIndex(c=>c.id===id);
  const novoIdx = idx + direcao;
  if(idx===-1 || novoIdx<0 || novoIdx>=contasBancariasCache.length) return;

  const atual = contasBancariasCache[idx];
  const vizinho = contasBancariasCache[novoIdx];

  await Promise.all([
    sb.from('fluxo_caixa_contas').update({ ordem: novoIdx }).eq('id', atual.id),
    sb.from('fluxo_caixa_contas').update({ ordem: idx }).eq('id', vizinho.id)
  ]);

  await carregarContasBancarias();
}

function abrirNovaContaBancaria(){
  contaBancariaEditandoId = null;
  document.getElementById('contaBancariaModalTitulo').textContent = 'Nova conta bancária';
  document.getElementById('contaBancaria_nome').value = '';
  document.getElementById('contaBancariaErr').style.display = 'none';
  document.getElementById('contaBancariaModal').style.display = 'flex';
}

function abrirEditarContaBancaria(id){
  const c = contasBancariasCache.find(x=>x.id===id);
  if(!c) return;
  contaBancariaEditandoId = id;
  document.getElementById('contaBancariaModalTitulo').textContent = 'Editar conta bancária';
  document.getElementById('contaBancaria_nome').value = c.nome;
  document.getElementById('contaBancariaErr').style.display = 'none';
  document.getElementById('contaBancariaModal').style.display = 'flex';
}

function fecharContaBancariaModal(){
  document.getElementById('contaBancariaModal').style.display = 'none';
}

async function salvarContaBancaria(){
  const nome = document.getElementById('contaBancaria_nome').value.trim();
  const err = document.getElementById('contaBancariaErr');
  if(!nome){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  if(contaBancariaEditandoId){
    const { data, error } = await sb.from('fluxo_caixa_contas').update({ nome }).eq('id', contaBancariaEditandoId).select().single();
    if(error){ err.textContent = 'Erro ao salvar: ' + error.message; err.style.display = 'block'; return; }
    const idx = contasBancariasCache.findIndex(c=>c.id===contaBancariaEditandoId);
    if(idx>-1) contasBancariasCache[idx] = data;
  }else{
    const proximaOrdem = contasBancariasCache.length>0 ? Math.max(...contasBancariasCache.map(c=>c.ordem ?? 0)) + 1 : 0;
    const { data, error } = await sb.from('fluxo_caixa_contas').insert({ loja: lojaAtual, nome, ordem: proximaOrdem }).select().single();
    if(error){ err.textContent = 'Erro ao salvar: ' + error.message; err.style.display = 'block'; return; }
    contasBancariasCache.push(data);
  }

  renderContasBancarias();
  fecharContaBancariaModal();
}

function confirmarExclusaoContaBancaria(id){
  excluindoContaBancariaId = id;
  document.getElementById('confirmExclusaoContaBancariaModal').style.display = 'flex';
}

function fecharConfirmacaoContaBancaria(){
  document.getElementById('confirmExclusaoContaBancariaModal').style.display = 'none';
  excluindoContaBancariaId = null;
}

async function confirmarExclusaoContaBancariaOk(){
  if(!excluindoContaBancariaId) return;
  const { error } = await sb.from('fluxo_caixa_contas').delete().eq('id', excluindoContaBancariaId);
  if(!error){
    contasBancariasCache = contasBancariasCache.filter(c=>c.id!==excluindoContaBancariaId);
    renderContasBancarias();
  }
  fecharConfirmacaoContaBancaria();
}

/* ================= FORNECEDORES ================= */

let fornecedoresCache = [];
let fornecedorEditandoId = null;
let excluindoFornecedorId = null;

async function carregarFornecedores(){
  document.getElementById('fornecedoresLojaNome').textContent = NOMES_LOJA[lojaAtual] || '';
  const { data, error } = await sb.from('fornecedores').select('*').eq('loja', lojaAtual).order('nome');
  if(error){ console.error('Erro ao carregar fornecedores:', error); fornecedoresCache = []; }
  else fornecedoresCache = data || [];
  renderFornecedores();
  atualizarDatalistFornecedores();
}

function renderFornecedores(){
  const body = document.getElementById('fornecedoresBody');
  const empty = document.getElementById('fornecedoresEmpty');
  if(fornecedoresCache.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const busca = (document.getElementById('fornecedoresBusca')?.value || '').trim().toLowerCase();
  const filtrados = fornecedoresCache.filter(f => !busca
    || f.nome.toLowerCase().includes(busca)
    || (f.apelidos||'').toLowerCase().includes(busca));

  body.innerHTML = filtrados.length===0
    ? '<tr><td colspan="3" style="text-align:center;color:var(--muted);font-style:italic;padding:16px;">Nenhum resultado pra essa busca.</td></tr>'
    : filtrados.map(f=>`
    <tr>
      <td>${escapeHtml(f.nome)}</td>
      <td class="contato">${escapeHtml(f.apelidos||'—')}</td>
      <td><div class="rowactions">
        <button class="iconbtn edit" title="Editar" onclick="abrirEditarFornecedor(${f.id})">✎</button>
        <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoFornecedor(${f.id})">✕</button>
      </div></td>
    </tr>
  `).join('');
}

// datalist usada no campo "Fornecedor" de Contas a Pagar, pra sugerir nomes já cadastrados
// sem obrigar a escolher (continua aceitando texto livre pra não travar o fluxo)
function atualizarDatalistFornecedores(){
  const dl = document.getElementById('listaFornecedores');
  if(!dl) return;
  dl.innerHTML = fornecedoresCache.map(f=>`<option value="${escapeHtml(f.nome)}">`).join('');
}

function abrirNovoFornecedor(){
  fornecedorEditandoId = null;
  document.getElementById('fornecedorModalTitulo').textContent = 'Novo fornecedor';
  document.getElementById('fornecedor_nome').value = '';
  document.getElementById('fornecedor_apelidos').value = '';
  document.getElementById('fornecedorErr').style.display = 'none';
  document.getElementById('fornecedorModal').style.display = 'flex';
}

function abrirEditarFornecedor(id){
  const f = fornecedoresCache.find(x=>x.id===id);
  if(!f) return;
  fornecedorEditandoId = id;
  document.getElementById('fornecedorModalTitulo').textContent = 'Editar fornecedor';
  document.getElementById('fornecedor_nome').value = f.nome;
  document.getElementById('fornecedor_apelidos').value = f.apelidos || '';
  document.getElementById('fornecedorErr').style.display = 'none';
  document.getElementById('fornecedorModal').style.display = 'flex';
}

function fecharFornecedorModal(){
  document.getElementById('fornecedorModal').style.display = 'none';
}

async function salvarFornecedor(){
  const btn = document.getElementById('fornecedorSalvarBtn');
  if(btn.disabled) return; // trava contra chamada dupla
  const nome = document.getElementById('fornecedor_nome').value.trim();
  const apelidos = document.getElementById('fornecedor_apelidos').value.trim();
  const err = document.getElementById('fornecedorErr');
  if(!nome){
    err.textContent = 'Digite o nome do fornecedor.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  btn.disabled = true;

  if(fornecedorEditandoId){
    const { data, error } = await sb.from('fornecedores').update({ nome, apelidos }).eq('id', fornecedorEditandoId).select().single();
    btn.disabled = false;
    if(error){ err.textContent = 'Erro ao salvar: ' + error.message; err.style.display = 'block'; return; }
    const idx = fornecedoresCache.findIndex(f=>f.id===fornecedorEditandoId);
    if(idx>-1) fornecedoresCache[idx] = data;
  }else{
    const { data, error } = await sb.from('fornecedores').insert({ loja: lojaAtual, nome, apelidos }).select().single();
    btn.disabled = false;
    if(error){ err.textContent = 'Erro ao salvar: ' + error.message; err.style.display = 'block'; return; }
    fornecedoresCache.push(data);
  }

  renderFornecedores();
  atualizarDatalistFornecedores();
  fecharFornecedorModal();
}

function confirmarExclusaoFornecedor(id){
  excluindoFornecedorId = id;
  document.getElementById('confirmExclusaoFornecedorModal').style.display = 'flex';
}
function fecharConfirmacaoFornecedor(){
  document.getElementById('confirmExclusaoFornecedorModal').style.display = 'none';
  excluindoFornecedorId = null;
}
async function confirmarExclusaoFornecedorOk(){
  if(!excluindoFornecedorId) return;
  const { error } = await sb.from('fornecedores').delete().eq('id', excluindoFornecedorId);
  if(!error){
    fornecedoresCache = fornecedoresCache.filter(f=>f.id!==excluindoFornecedorId);
    renderFornecedores();
    atualizarDatalistFornecedores();
  }
  fecharConfirmacaoFornecedor();
}

/* ================= DÚVIDAS E INFORMAÇÕES ================= */

let duvidasCache = [];
let duvidaEditandoId = null;
let duvidaExcluindoId = null;

function normalizarBuscaDuvida(valor){
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

async function abrirDuvidas(){
  const body = document.getElementById('duvidasBody');
  const empty = document.getElementById('duvidasEmpty');
  body.innerHTML = '<div style="color:var(--muted);font-size:13px;">Carregando informações…</div>';
  empty.style.display = 'none';
  const { data, error } = await sb.from('duvidas').select('*').eq('loja', 'geral').order('atualizado_em', { ascending:false });
  if(error){
    console.error('Erro ao carregar dúvidas:', error);
    duvidasCache = [];
    body.innerHTML = '';
    empty.textContent = error.code==='42P01' ? 'O módulo ainda precisa ser ativado no Supabase. Execute o arquivo modulo_duvidas_supabase.sql.' : 'Não foi possível carregar as informações.';
    empty.style.display = 'block';
    return;
  }
  duvidasCache = data || [];
  atualizarFiltroCategoriasDuvidas();
  renderDuvidas();
}

function atualizarFiltroCategoriasDuvidas(){
  const select = document.getElementById('duvidasFiltroCategoria');
  const atual = select.value;
  const categorias = [...new Set(duvidasCache.map(d=>String(d.categoria || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  select.innerHTML = '<option value="">Todas as categorias</option>' + categorias.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if(categorias.includes(atual)) select.value = atual;
}

function renderDuvidas(){
  const body = document.getElementById('duvidasBody');
  const empty = document.getElementById('duvidasEmpty');
  if(!body || !empty) return;
  const busca = normalizarBuscaDuvida(document.getElementById('duvidasBusca')?.value);
  const categoria = document.getElementById('duvidasFiltroCategoria')?.value || '';
  const filtradas = duvidasCache.filter(d=>{
    if(categoria && String(d.categoria || '')!==categoria) return false;
    if(!busca) return true;
    return normalizarBuscaDuvida([d.titulo,d.categoria,d.conteudo,d.palavras_chave].join(' ')).includes(busca);
  });
  if(filtradas.length===0){
    body.innerHTML = '';
    empty.textContent = duvidasCache.length===0 ? 'Nenhuma informação cadastrada. Clique em “+ Nova informação” para começar.' : 'Nenhuma informação encontrada para essa pesquisa.';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  body.innerHTML = filtradas.map(d=>`
    <article class="duvida-card">
      <div class="duvida-card-top">
        <div>
          <span class="duvida-categoria">${escapeHtml(d.categoria || 'Sem categoria')}</span>
          <h3 style="margin-top:9px;">${escapeHtml(d.titulo)}</h3>
        </div>
        <div class="duvida-acoes">
          <button class="iconbtn edit" title="Editar" onclick="abrirEditarDuvida(${Number(d.id)})">✎</button>
          <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoDuvida(${Number(d.id)})">✕</button>
        </div>
      </div>
      <div class="duvida-conteudo">${escapeHtml(d.conteudo)}</div>
      ${d.palavras_chave ? `<div class="duvida-palavras">🏷️ ${escapeHtml(d.palavras_chave)}</div>` : ''}
    </article>
  `).join('');
}

function abrirNovaDuvida(){
  duvidaEditandoId = null;
  document.getElementById('duvidaModalTitulo').textContent = 'Nova informação';
  document.getElementById('duvida_titulo').value = '';
  document.getElementById('duvida_categoria').value = '';
  document.getElementById('duvida_conteudo').value = '';
  document.getElementById('duvida_palavras').value = '';
  document.getElementById('duvidaErr').style.display = 'none';
  document.getElementById('duvidaModal').style.display = 'flex';
  setTimeout(()=>document.getElementById('duvida_titulo').focus(), 50);
}

function abrirEditarDuvida(id){
  const d = duvidasCache.find(x=>Number(x.id)===Number(id));
  if(!d) return;
  duvidaEditandoId = id;
  document.getElementById('duvidaModalTitulo').textContent = 'Editar informação';
  document.getElementById('duvida_titulo').value = d.titulo || '';
  document.getElementById('duvida_categoria').value = d.categoria || '';
  document.getElementById('duvida_conteudo').value = d.conteudo || '';
  document.getElementById('duvida_palavras').value = d.palavras_chave || '';
  document.getElementById('duvidaErr').style.display = 'none';
  document.getElementById('duvidaModal').style.display = 'flex';
}

function fecharDuvidaModal(){
  document.getElementById('duvidaModal').style.display = 'none';
  duvidaEditandoId = null;
}

async function salvarDuvida(){
  const btn = document.getElementById('duvidaSalvarBtn');
  if(btn.disabled) return;
  const titulo = document.getElementById('duvida_titulo').value.trim();
  const categoria = document.getElementById('duvida_categoria').value.trim();
  const conteudo = document.getElementById('duvida_conteudo').value.trim();
  const palavras = document.getElementById('duvida_palavras').value.trim();
  const err = document.getElementById('duvidaErr');
  if(!titulo || !categoria || !conteudo){
    err.textContent = 'Preencha o título, a categoria e o conteúdo.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Salvando…';
  const registro = { loja:'geral', titulo, categoria, conteudo, palavras_chave:palavras || null, atualizado_em:new Date().toISOString() };
  let resultado;
  if(duvidaEditandoId){
    resultado = await sb.from('duvidas').update(registro).eq('id', duvidaEditandoId).eq('loja', 'geral').select().single();
  }else{
    resultado = await sb.from('duvidas').insert(registro).select().single();
  }
  btn.disabled = false;
  btn.textContent = 'Salvar';
  if(resultado.error){
    err.textContent = 'Erro ao salvar: ' + resultado.error.message;
    err.style.display = 'block';
    return;
  }
  fecharDuvidaModal();
  await abrirDuvidas();
}

function confirmarExclusaoDuvida(id){
  duvidaExcluindoId = id;
  document.getElementById('confirmDuvidaModal').style.display = 'flex';
}

function fecharConfirmacaoDuvida(){
  document.getElementById('confirmDuvidaModal').style.display = 'none';
  duvidaExcluindoId = null;
}

async function confirmarExclusaoDuvidaOk(){
  if(!duvidaExcluindoId) return;
  const { error } = await sb.from('duvidas').delete().eq('id', duvidaExcluindoId).eq('loja', 'geral');
  if(error){ alert('Erro ao excluir: ' + error.message); return; }
  duvidasCache = duvidasCache.filter(d=>Number(d.id)!==Number(duvidaExcluindoId));
  fecharConfirmacaoDuvida();
  atualizarFiltroCategoriasDuvidas();
  renderDuvidas();
}

/* ================= CHECKLIST DE FECHAMENTO ================= */

let checklistMesAtual = new Date().toISOString().slice(0,7);
let checklistItensCache = [];      // modelo (itens cadastrados)
let checklistExecucoesCache = {};  // { item_id: { id, feito, observacao } } do mês atual
let checklistItemEditandoId = null;
let checklistExcluindoId = null;

async function abrirChecklist(){
  if(!checklistMesAtual) checklistMesAtual = mesAtualPadrao();
  document.getElementById('checklistMes').value = checklistMesAtual;
  await carregarChecklist();
}

function mudarMesChecklist(valor){
  checklistMesAtual = valor || mesAtualPadrao();
  carregarChecklist();
}

async function carregarChecklist(){
  document.getElementById('checklistLojaNome').textContent = NOMES_LOJA[lojaAtual] || '';
  const [ano, mes] = checklistMesAtual.split('-');
  document.getElementById('checklistMesTexto').textContent = (NOMES_MES[parseInt(mes,10)-1]||'') + '/' + ano;

  const { data: itens, error: erroItens } = await sb.from('checklist_itens')
    .select('*').eq('loja', lojaAtual).eq('ativo', true).order('ordem');
  if(erroItens){ console.error('Erro ao carregar checklist:', erroItens); checklistItensCache = []; }
  else checklistItensCache = itens || [];

  checklistExecucoesCache = {};
  if(checklistItensCache.length>0){
    const { data: execucoes } = await sb.from('checklist_execucoes')
      .select('*').eq('loja', lojaAtual).eq('mes', checklistMesAtual);
    (execucoes||[]).forEach(e=>{ checklistExecucoesCache[e.item_id] = e; });
  }

  renderChecklist();
}

function renderChecklist(){
  const body = document.getElementById('checklistBody');
  const empty = document.getElementById('checklistEmpty');

  if(checklistItensCache.length===0){
    body.innerHTML = '';
    empty.style.display = 'block';
    document.getElementById('checklistProgresso').textContent = '';
    return;
  }
  empty.style.display = 'none';

  const feitos = checklistItensCache.filter(it => checklistExecucoesCache[it.id]?.feito).length;
  document.getElementById('checklistProgresso').textContent = feitos + ' de ' + checklistItensCache.length + ' concluídos';

  body.innerHTML = checklistItensCache.map((it, idx)=>{
    const exec = checklistExecucoesCache[it.id];
    const feito = !!(exec && exec.feito);
    return `
    <div class="contest-row" style="grid-template-columns:36px 1.4fr 1.6fr 90px;${feito ? 'background:rgba(58,107,74,0.06);' : ''}">
      <div class="campo"><input type="checkbox" ${feito?'checked':''} onchange="toggleChecklistFeito(${it.id}, this.checked)"></div>
      <div class="campo"><span class="lbl-mobile">Item</span><span style="${feito?'text-decoration:line-through;color:var(--muted);':''}">${escapeHtml(it.titulo)}</span></div>
      <div class="campo"><span class="lbl-mobile">Observação</span><input class="contest-input" style="width:100%;text-align:left;" placeholder="Observação (opcional)" value="${escapeHtml(exec?.observacao || '')}" onchange="salvarObservacaoChecklist(${it.id}, this.value)"></div>
      <div class="campo" style="justify-content:flex-end;gap:6px;">
        <button class="iconbtn" title="Mover pra cima" ${idx===0?'disabled':''} onclick="moverItemChecklist(${it.id}, -1)">▲</button>
        <button class="iconbtn" title="Mover pra baixo" ${idx===checklistItensCache.length-1?'disabled':''} onclick="moverItemChecklist(${it.id}, 1)">▼</button>
        <button class="iconbtn edit" title="Editar" onclick="abrirEditarItemChecklist(${it.id})">✎</button>
        <button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoChecklistItem(${it.id})">✕</button>
      </div>
    </div>
  `;}).join('');
}

async function toggleChecklistFeito(itemId, feito){
  const existente = checklistExecucoesCache[itemId];
  const { data, error } = await sb.from('checklist_execucoes').upsert({
    loja: lojaAtual,
    mes: checklistMesAtual,
    item_id: itemId,
    feito: feito,
    observacao: existente?.observacao || null,
    atualizado_em: new Date().toISOString()
  }, { onConflict: 'loja,mes,item_id' }).select().single();

  if(error){ alert('Erro ao salvar: ' + error.message); return; }
  checklistExecucoesCache[itemId] = data;
  renderChecklist();
}

async function salvarObservacaoChecklist(itemId, texto){
  const existente = checklistExecucoesCache[itemId];
  const { data, error } = await sb.from('checklist_execucoes').upsert({
    loja: lojaAtual,
    mes: checklistMesAtual,
    item_id: itemId,
    feito: existente?.feito || false,
    observacao: texto.trim() || null,
    atualizado_em: new Date().toISOString()
  }, { onConflict: 'loja,mes,item_id' }).select().single();

  if(error){ alert('Erro ao salvar: ' + error.message); return; }
  checklistExecucoesCache[itemId] = data;
}

async function moverItemChecklist(itemId, direcao){
  const idx = checklistItensCache.findIndex(it=>it.id===itemId);
  const novoIdx = idx + direcao;
  if(novoIdx<0 || novoIdx>=checklistItensCache.length) return;

  const a = checklistItensCache[idx];
  const b = checklistItensCache[novoIdx];
  [checklistItensCache[idx], checklistItensCache[novoIdx]] = [b, a];
  renderChecklist();

  await Promise.all([
    sb.from('checklist_itens').update({ ordem: novoIdx }).eq('id', a.id),
    sb.from('checklist_itens').update({ ordem: idx }).eq('id', b.id)
  ]);
  await carregarChecklist();
}

function abrirNovoItemChecklist(){
  checklistItemEditandoId = null;
  document.getElementById('checklistItemModalTitulo').textContent = 'Novo item do checklist';
  document.getElementById('checklistItem_titulo').value = '';
  document.getElementById('checklistItemErr').style.display = 'none';
  document.getElementById('checklistItemModal').style.display = 'flex';
}

function abrirEditarItemChecklist(id){
  const it = checklistItensCache.find(x=>x.id===id);
  if(!it) return;
  checklistItemEditandoId = id;
  document.getElementById('checklistItemModalTitulo').textContent = 'Editar item do checklist';
  document.getElementById('checklistItem_titulo').value = it.titulo;
  document.getElementById('checklistItemErr').style.display = 'none';
  document.getElementById('checklistItemModal').style.display = 'flex';
}

function fecharChecklistItemModal(){
  document.getElementById('checklistItemModal').style.display = 'none';
}

async function salvarItemChecklist(){
  const btn = document.getElementById('checklistItemSalvarBtn');
  if(btn.disabled) return; // trava contra chamada dupla
  const titulo = document.getElementById('checklistItem_titulo').value.trim();
  const err = document.getElementById('checklistItemErr');
  if(!titulo){
    err.textContent = 'Digite o que precisa ser feito.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  btn.disabled = true;

  if(checklistItemEditandoId){
    const { error } = await sb.from('checklist_itens').update({ titulo }).eq('id', checklistItemEditandoId);
    btn.disabled = false;
    if(error){ err.textContent = 'Erro ao salvar: ' + error.message; err.style.display = 'block'; return; }
  }else{
    const proximaOrdem = checklistItensCache.length>0 ? Math.max(...checklistItensCache.map(i=>i.ordem||0)) + 1 : 0;
    const { error } = await sb.from('checklist_itens').insert({ loja: lojaAtual, titulo, ordem: proximaOrdem });
    btn.disabled = false;
    if(error){ err.textContent = 'Erro ao salvar: ' + error.message; err.style.display = 'block'; return; }
  }

  fecharChecklistItemModal();
  await carregarChecklist();
}

function confirmarExclusaoChecklistItem(id){
  checklistExcluindoId = id;
  document.getElementById('confirmExclusaoChecklistItemModal').style.display = 'flex';
}
function fecharConfirmacaoExclusaoChecklistItem(){
  document.getElementById('confirmExclusaoChecklistItemModal').style.display = 'none';
  checklistExcluindoId = null;
}
async function confirmarExclusaoChecklistItemOk(){
  if(!checklistExcluindoId) return;
  const { error } = await sb.from('checklist_itens').delete().eq('id', checklistExcluindoId);
  fecharConfirmacaoExclusaoChecklistItem();
  if(error){ alert('Erro ao excluir: ' + error.message); return; }
  await carregarChecklist();
}

async function selecionarFuncionario(id){
  bhFuncionarioAtualId = id || null;
  if(!id){
    document.getElementById('bhSemFuncionario').style.display = 'block';
    document.getElementById('bhConteudo').style.display = 'none';
    return;
  }
  document.getElementById('bhSemFuncionario').style.display = 'none';
  document.getElementById('bhConteudo').style.display = 'block';
  document.getElementById('bhFuncionarioSelect').value = id;
  bhFiltroDe = '';
  bhFiltroAte = '';
  document.getElementById('bhFiltroDe').value = '';
  document.getElementById('bhFiltroAte').value = '';
  await carregarRegistrosHoras(id);
}

async function carregarRegistrosHoras(funcionarioId){
  const { data, error } = await sb.from('bh_registros').select('*').eq('funcionario_id', funcionarioId).order('data');
  if(error){
    console.error('Erro ao carregar registros de horas:', error);
    bhRegistros = [];
  }else{
    bhRegistros = data || [];
  }
  renderBancoHoras();
}

function paraMinutos(hhmm){
  if(!hhmm) return null;
  const partes = hhmm.split(':');
  const h = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  if(isNaN(h) || isNaN(m)) return null;
  return (h*60) + m;
}

function fmtMinutos(min){
  const h = Math.floor(min/60);
  const m = min%60;
  return h + 'h' + String(m).padStart(2,'0');
}

function fmtMinutosSinal(min){
  const sinal = min < 0 ? '-' : (min > 0 ? '+' : '');
  return sinal + fmtMinutos(Math.abs(min));
}

function minutosIntervalo(entradaStr, saidaStr){
  const e = paraMinutos(entradaStr);
  let s = paraMinutos(saidaStr);
  if(e===null || s===null) return 0;
  if(s <= e) s += 1440; // o turno passou da meia-noite
  return s - e;
}

const JANELA_NOTURNA_INICIO = 22*60;      // 22:00
const JANELA_NOTURNA_FIM = 24*60 + 5*60;  // 05:00 do dia seguinte

function minutosNoturnosIntervalo(entradaStr, saidaStr){
  const e = paraMinutos(entradaStr);
  let s = paraMinutos(saidaStr);
  if(e===null || s===null) return 0;
  if(s <= e) s += 1440;
  const inicioSobreposto = Math.max(e, JANELA_NOTURNA_INICIO);
  const fimSobreposto = Math.min(s, JANELA_NOTURNA_FIM);
  return Math.max(0, fimSobreposto - inicioSobreposto);
}

function calcularMinutosTrabalhados(reg){
  let total = 0;
  if(reg.entrada1 && reg.saida1) total += minutosIntervalo(reg.entrada1, reg.saida1);
  if(reg.entrada2 && reg.saida2) total += minutosIntervalo(reg.entrada2, reg.saida2);
  return total;
}

function calcularMinutosNoturnos(reg){
  let total = 0;
  if(reg.entrada1 && reg.saida1) total += minutosNoturnosIntervalo(reg.entrada1, reg.saida1);
  if(reg.entrada2 && reg.saida2) total += minutosNoturnosIntervalo(reg.entrada2, reg.saida2);
  return total;
}

// Hora noturna reduzida (CLT): cada "hora noturna" paga equivale a 52,5 minutos
// trabalhados de fato. Convertemos os minutos noturnos reais em minutos
// "equivalentes" para pagamento, usando essa proporção.
function calcularMinutosNoturnosConvertidos(minutosNoturnos){
  if(!minutosNoturnos) return 0;
  return Math.round((minutosNoturnos / 52.5) * 60);
}

let relNoturnoDadosAtuais = [];
let relNoturnoPeriodoAtual = '';

function abrirRelatorioNoturno(){
  document.getElementById('relNoturno_de').value = '';
  document.getElementById('relNoturno_ate').value = '';
  document.getElementById('relNoturnoResultado').style.display = 'none';
  document.getElementById('relNoturnoVazio').style.display = 'none';
  document.getElementById('relNoturnoCarregando').style.display = 'none';
  document.getElementById('relatorioNoturnoModal').style.display = 'flex';
}

function fecharRelatorioNoturno(){
  document.getElementById('relatorioNoturnoModal').style.display = 'none';
}

async function gerarRelatorioNoturno(){
  const de = document.getElementById('relNoturno_de').value;
  const ate = document.getElementById('relNoturno_ate').value;
  if(!de || !ate || ate < de){
    alert('Escolha uma data inicial e uma data final válidas (final igual ou depois da inicial).');
    return;
  }
  relNoturnoPeriodoAtual = fmtData(de) + ' a ' + fmtData(ate);

  document.getElementById('relNoturnoResultado').style.display = 'none';
  document.getElementById('relNoturnoVazio').style.display = 'none';
  document.getElementById('relNoturnoCarregando').style.display = 'block';

  const { data: funcs, error: erroFuncs } = await sb.from('bh_funcionarios').select('*').eq('loja', lojaAtual).eq('ativo', true).order('nome');
  if(erroFuncs || !funcs || funcs.length===0){
    document.getElementById('relNoturnoCarregando').style.display = 'none';
    document.getElementById('relNoturnoVazio').style.display = 'block';
    return;
  }

  const linhas = [];
  for(const f of funcs){
    const { data: registros } = await sb.from('bh_registros').select('*').eq('funcionario_id', f.id).gte('data', de).lte('data', ate);
    let totalNoturno = 0;
    const datasJustificadas = [];
    const datasInjustificadas = [];
    const datasFeriadosTrabalhados = [];
    (registros||[]).forEach(reg=>{
      if(reg.tipo_dia === 'falta_justificada'){ datasJustificadas.push(reg.data); return; }
      if(reg.tipo_dia === 'falta_injustificada'){ datasInjustificadas.push(reg.data); return; }
      if(reg.trabalhou_feriado) datasFeriadosTrabalhados.push(reg.data);
      totalNoturno += calcularMinutosNoturnos(reg);
    });
    datasJustificadas.sort();
    datasInjustificadas.sort();
    datasFeriadosTrabalhados.sort();
    if(totalNoturno > 0 || datasJustificadas.length > 0 || datasInjustificadas.length > 0 || datasFeriadosTrabalhados.length > 0){
      linhas.push({
        nome: f.nome,
        cargo: (f.cargo || '—').toUpperCase(),
        noturno: totalNoturno,
        noturnoConvertido: calcularMinutosNoturnosConvertidos(totalNoturno),
        datasJustificadas,
        datasInjustificadas,
        datasFeriadosTrabalhados
      });
    }
  }

  document.getElementById('relNoturnoCarregando').style.display = 'none';
  relNoturnoDadosAtuais = linhas;

  if(linhas.length===0){
    document.getElementById('relNoturnoVazio').style.display = 'block';
    return;
  }

  document.getElementById('relNoturnoResultado').style.display = 'block';
  document.getElementById('relNoturnoBody').innerHTML = linhas.map(l=>`
    <tr>
      <td>${escapeHtml(l.nome)}</td>
      <td>${escapeHtml(l.cargo)}</td>
      <td class="valor">${fmtMinutos(l.noturno)}</td>
      <td class="valor" style="color:var(--gold);font-weight:600;">${fmtMinutos(l.noturnoConvertido)}</td>
      <td style="white-space:normal;">${l.datasJustificadas.length ? l.datasJustificadas.map(fmtData).join('<br>') : '—'}</td>
      <td style="white-space:normal;color:${l.datasInjustificadas.length>0?'var(--rust)':'inherit'};">${l.datasInjustificadas.length ? l.datasInjustificadas.map(fmtData).join('<br>') : '—'}</td>
      <td style="white-space:normal;color:${l.datasFeriadosTrabalhados.length>0?'var(--green)':'inherit'};font-weight:${l.datasFeriadosTrabalhados.length>0?'600':'normal'};">${l.datasFeriadosTrabalhados.length ? l.datasFeriadosTrabalhados.map(fmtData).join('<br>') : '—'}</td>
    </tr>
  `).join('');
}

function exportarExcelRelatorioNoturno(){
  if(relNoturnoDadosAtuais.length===0){ alert('Gere o relatório primeiro.'); return; }
  if(!window.XLSX){ alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.'); return; }
  const dados = relNoturnoDadosAtuais.map(l=>({
    'Colaborador': l.nome,
    'Cargo': l.cargo,
    'Horas noturnas': fmtMinutos(l.noturno),
    'Horas noturnas convertidas': fmtMinutos(l.noturnoConvertido),
    'Faltas justificadas': l.datasJustificadas.map(fmtData).join(', ') || '—',
    'Faltas injustificadas': l.datasInjustificadas.map(fmtData).join(', ') || '—',
    'Trabalhou no feriado': l.datasFeriadosTrabalhados.map(fmtData).join(', ') || '—'
  }));
  const planilha = XLSX.utils.json_to_sheet(dados);
  planilha['!cols'] = [{wch:26},{wch:26},{wch:16},{wch:22},{wch:24},{wch:24},{wch:24}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Horas Noturnas');
  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  XLSX.writeFile(livro, 'relatorio-horas-noturnas-' + nomeLoja + '-' + new Date().toISOString().slice(0,10) + '.xlsx');
}

function exportarPdfRelatorioNoturno(){
  if(relNoturnoDadosAtuais.length===0){ alert('Gere o relatório primeiro.'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);

  doc.setFontSize(16);
  doc.text('Relatório de Horas Noturnas — ' + (NOMES_LOJA[lojaAtual]||''), 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Período: ' + relNoturnoPeriodoAtual + '   ·   Gerado em ' + dataHora, 14, 25);

  const corpo = relNoturnoDadosAtuais.map(l=>[
    l.nome, l.cargo, fmtMinutos(l.noturno), fmtMinutos(l.noturnoConvertido),
    l.datasJustificadas.map(fmtData).join('\n') || '—',
    l.datasInjustificadas.map(fmtData).join('\n') || '—',
    l.datasFeriadosTrabalhados.map(fmtData).join('\n') || '—'
  ]);
  doc.autoTable({
    startY: 32,
    head: [['Colaborador','Cargo','Horas noturnas','Horas noturnas convertidas','Faltas justificadas','Faltas injustificadas','Trabalhou no feriado']],
    body: corpo,
    styles: { fontSize: 7.5, cellPadding: 2.8 },
    headStyles: { fillColor: [38,51,43] }
  });

  const nomeLoja = (NOMES_LOJA[lojaAtual]||'').toLowerCase().replace(' ','');
  doc.save('relatorio-horas-noturnas-' + nomeLoja + '-' + agora.toISOString().slice(0,10) + '.pdf');
}

let bhFiltroDe = '';
let bhFiltroAte = '';
let bhLinhasExibidasAtuais = [];

function aplicarFiltroDataHoras(){
  bhFiltroDe = document.getElementById('bhFiltroDe').value || '';
  bhFiltroAte = document.getElementById('bhFiltroAte').value || '';
  renderBancoHoras();
}

function limparFiltroDataHoras(){
  bhFiltroDe = '';
  bhFiltroAte = '';
  document.getElementById('bhFiltroDe').value = '';
  document.getElementById('bhFiltroAte').value = '';
  renderBancoHoras();
}

function exportarExcelHoras(){
  if(!window.XLSX){
    alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.');
    return;
  }
  const f = bhFuncionarios.find(x=>x.id===bhFuncionarioAtualId);
  if(!f){
    alert('Selecione um funcionário primeiro.');
    return;
  }
  if(bhLinhasExibidasAtuais.length===0){
    alert('Não há registros para exportar com o período atual.');
    return;
  }
  const horaOuTraco = v => v ? v.slice(0,5) : '';
  const cabecalho = [
    ['Colaborador', f.nome],
    ['Cargo', f.cargo ? f.cargo.toUpperCase() : '—'],
    ['Escala', f.tipo_escala==='12x36' ? '12x36' : 'Normal'],
    []
  ];
  const colunas = ['Data','Tipo do dia','Entrada 1','Saída 1','Entrada 2','Saída 2','Trabalhado','Noturno','Not. Convertido','Saldo dia'];
  const linhas = bhLinhasExibidasAtuais.map(l=>[
    fmtData(l.reg.data),
    l.reg.trabalhou_feriado ? 'TRABALHOU NO FERIADO' : (l.reg.tipo_dia==='falta_justificada' ? 'FALTA JUSTIFICADA' : (l.reg.tipo_dia==='falta_injustificada' ? 'FALTA INJUSTIFICADA' : 'DIA NORMAL')),
    horaOuTraco(l.reg.entrada1),
    horaOuTraco(l.reg.saida1),
    horaOuTraco(l.reg.entrada2),
    horaOuTraco(l.reg.saida2),
    fmtMinutos(l.trabalhado),
    l.noturno>0 ? fmtMinutos(l.noturno) : '',
    l.noturnoConvertido>0 ? fmtMinutos(l.noturnoConvertido) : '',
    fmtMinutosSinal(l.saldoDia)
  ]);

  const planilha = XLSX.utils.aoa_to_sheet([...cabecalho, colunas, ...linhas]);
  planilha['!cols'] = [{wch:12},{wch:24},{wch:10},{wch:10},{wch:10},{wch:10},{wch:12},{wch:10},{wch:14},{wch:10}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Banco de Horas');

  const dataArquivo = new Date().toISOString().slice(0,10);
  const nomeArquivo = f.nome.toLowerCase().replace(/\s+/g,'-');
  XLSX.writeFile(livro, 'banco-de-horas-' + nomeArquivo + '-' + dataArquivo + '.xlsx');
}

function textoPeriodoHoras(){
  if(bhFiltroDe || bhFiltroAte){
    const de = bhFiltroDe ? fmtData(bhFiltroDe) : 'início';
    const ate = bhFiltroAte ? fmtData(bhFiltroAte) : 'hoje';
    return de + ' a ' + ate;
  }
  if(bhLinhasExibidasAtuais.length===0) return '—';
  const datas = bhLinhasExibidasAtuais.map(l=>l.reg.data).sort();
  return fmtData(datas[0]) + ' a ' + fmtData(datas[datas.length-1]);
}

function exportarExcelHorasResumo(){
  if(!window.XLSX){
    alert('Não foi possível carregar o recurso de Excel. Recarregue a página e tente de novo.');
    return;
  }
  const f = bhFuncionarios.find(x=>x.id===bhFuncionarioAtualId);
  if(!f){
    alert('Selecione um funcionário primeiro.');
    return;
  }
  if(bhLinhasExibidasAtuais.length===0){
    alert('Não há registros para exportar com o período atual.');
    return;
  }
  const totalNoturno = bhLinhasExibidasAtuais.reduce((s,l)=>s+l.noturno,0);
  const totalNoturnoConvertido = bhLinhasExibidasAtuais.reduce((s,l)=>s+l.noturnoConvertido,0);
  const datasFeriados = bhLinhasExibidasAtuais.filter(l=>l.reg.trabalhou_feriado).map(l=>fmtData(l.reg.data));

  const linhas = [{
    'Colaborador': f.nome,
    'Cargo': f.cargo ? f.cargo.toUpperCase() : '—',
    'Período': textoPeriodoHoras(),
    'Trabalhou no feriado': datasFeriados.join(', ') || '—',
    'Total noturno': fmtMinutos(totalNoturno),
    'Total noturno convertido': fmtMinutos(totalNoturnoConvertido)
  }];

  const planilha = XLSX.utils.json_to_sheet(linhas);
  planilha['!cols'] = [{wch:22},{wch:18},{wch:24},{wch:25},{wch:16},{wch:20}];
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Resumo');

  const dataArquivo = new Date().toISOString().slice(0,10);
  const nomeArquivo = f.nome.toLowerCase().replace(/\s+/g,'-');
  XLSX.writeFile(livro, 'resumo-banco-horas-' + nomeArquivo + '-' + dataArquivo + '.xlsx');
}

function exportarPdfHorasResumo(){
  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.');
    return;
  }
  const f = bhFuncionarios.find(x=>x.id===bhFuncionarioAtualId);
  if(!f){
    alert('Selecione um funcionário primeiro.');
    return;
  }
  if(bhLinhasExibidasAtuais.length===0){
    alert('Não há registros para exportar com o período atual.');
    return;
  }
  const totalNoturno = bhLinhasExibidasAtuais.reduce((s,l)=>s+l.noturno,0);
  const totalNoturnoConvertido = bhLinhasExibidasAtuais.reduce((s,l)=>s+l.noturnoConvertido,0);
  const datasFeriados = bhLinhasExibidasAtuais.filter(l=>l.reg.trabalhou_feriado).map(l=>fmtData(l.reg.data));

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);

  doc.setFontSize(16);
  doc.text('Resumo do Banco de Horas', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Gerado em ' + dataHora, 14, 25);

  doc.autoTable({
    startY: 34,
    body: [
      ['Colaborador', f.nome],
      ['Cargo', f.cargo ? f.cargo.toUpperCase() : '—'],
      ['Período', textoPeriodoHoras()],
      ['Trabalhou no feriado', datasFeriados.join(', ') || '—'],
      ['Total noturno', fmtMinutos(totalNoturno)],
      ['Total noturno convertido', fmtMinutos(totalNoturnoConvertido)]
    ],
    styles: { fontSize: 11, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [233, 225, 203], cellWidth: 60 } },
    theme: 'grid'
  });

  const dataArquivo = agora.toISOString().slice(0,10);
  const nomeArquivo = f.nome.toLowerCase().replace(/\s+/g,'-');
  doc.save('resumo-banco-horas-' + nomeArquivo + '-' + dataArquivo + '.pdf');
}

function exportarPdfHoras(){
  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('Não foi possível carregar o recurso de PDF. Recarregue a página e tente de novo.');
    return;
  }
  const f = bhFuncionarios.find(x=>x.id===bhFuncionarioAtualId);
  if(!f){
    alert('Selecione um funcionário primeiro.');
    return;
  }
  if(bhLinhasExibidasAtuais.length===0){
    alert('Não há registros para exportar com o período atual.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const agora = new Date();
  const dataHora = fmtData(agora.toISOString().slice(0,10)) + ' ' + agora.toTimeString().slice(0,5);

  doc.setFontSize(16);
  doc.text('Banco de Horas — ' + f.nome, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text((f.cargo ? 'Cargo: ' + f.cargo.toUpperCase() + '   ·   ' : '') + 'Escala: ' + (f.tipo_escala==='12x36' ? '12x36' : 'Normal') + '   ·   Gerado em ' + dataHora, 14, 25);

  const horaOuTraco = v => v ? v.slice(0,5) : '—';
  const linhas = bhLinhasExibidasAtuais.map(l=>[
    fmtData(l.reg.data),
    l.reg.trabalhou_feriado ? 'FERIADO' : (l.reg.tipo_dia==='falta_justificada' ? 'FALTA JUST.' : (l.reg.tipo_dia==='falta_injustificada' ? 'FALTA INJUST.' : 'NORMAL')),
    horaOuTraco(l.reg.entrada1),
    horaOuTraco(l.reg.saida1),
    horaOuTraco(l.reg.entrada2),
    horaOuTraco(l.reg.saida2),
    fmtMinutos(l.trabalhado),
    l.noturno>0 ? fmtMinutos(l.noturno) : '—',
    l.noturnoConvertido>0 ? fmtMinutos(l.noturnoConvertido) : '—',
    fmtMinutosSinal(l.saldoDia)
  ]);

  const totalTrabalhado = bhLinhasExibidasAtuais.reduce((s,l)=>s+l.trabalhado,0);
  const totalNoturno = bhLinhasExibidasAtuais.reduce((s,l)=>s+l.noturno,0);
  const totalNoturnoConvertido = bhLinhasExibidasAtuais.reduce((s,l)=>s+l.noturnoConvertido,0);

  doc.autoTable({
    startY: 32,
    head: [['Data', 'Tipo', 'Entr. 1', 'Saí. 1', 'Entr. 2', 'Saí. 2', 'Trabalhado', 'Noturno', 'Not. Conv.', 'Saldo dia']],
    body: linhas,
    foot: [['TOTAL', '', '', '', '', '', fmtMinutos(totalTrabalhado), fmtMinutos(totalNoturno), fmtMinutos(totalNoturnoConvertido), '']],
    styles: { fontSize: 7.5, cellPadding: 2.4 },
    headStyles: { fillColor: [38, 51, 43] },
    footStyles: { fillColor: [233, 225, 203], textColor: 20, fontStyle: 'bold' }
  });

  const dataArquivo = agora.toISOString().slice(0,10);
  const nomeArquivo = f.nome.toLowerCase().replace(/\s+/g,'-');
  doc.save('banco-de-horas-' + nomeArquivo + '-' + dataArquivo + '.pdf');
}

function renderBancoHoras(){
  const f = bhFuncionarios.find(x=>x.id===bhFuncionarioAtualId);
  if(!f) return;
  document.getElementById('bhCargaHoraria').textContent = fmtMinutos(f.carga_horaria_diaria_min);
  document.getElementById('bhEscala').textContent = f.tipo_escala==='12x36' ? '12x36' : 'Normal';
  document.getElementById('bhCargo').textContent = f.cargo ? f.cargo.toUpperCase() : '—';

  const ordenados = [...bhRegistros].sort((a,b)=> a.data.localeCompare(b.data));
  let acumulado = 0;
  const linhas = ordenados.map(reg=>{
    let trabalhado, noturno;
    if(reg.tipo_dia === 'falta_justificada'){
      trabalhado = f.carga_horaria_diaria_min;
      noturno = 0;
    }else if(reg.tipo_dia === 'falta_injustificada'){
      trabalhado = reg.descontar_falta ? 0 : f.carga_horaria_diaria_min;
      noturno = 0;
    }else{
      trabalhado = calcularMinutosTrabalhados(reg);
      noturno = calcularMinutosNoturnos(reg);
    }
    const noturnoConvertido = calcularMinutosNoturnosConvertidos(noturno);
    const saldoDia = trabalhado - f.carga_horaria_diaria_min;
    acumulado += saldoDia;
    return { reg, trabalhado, noturno, noturnoConvertido, saldoDia, acumuladoAteAqui: acumulado };
  });

  document.getElementById('bhSaldoTotal').textContent = fmtMinutosSinal(acumulado);
  bhResumoSaldos[bhFuncionarioAtualId] = acumulado;
  renderResumoGeralBancoHoras();

  const totalTrabalhadoGeral = linhas.reduce((s,l)=>s+l.trabalhado, 0);
  const totalNoturnoGeral = linhas.reduce((s,l)=>s+l.noturno, 0);
  const totalNoturnoConvertidoGeral = linhas.reduce((s,l)=>s+l.noturnoConvertido, 0);
  document.getElementById('bhTotalTrabalhado').textContent = fmtMinutos(totalTrabalhadoGeral);
  document.getElementById('bhTotalNoturno').textContent = fmtMinutos(totalNoturnoGeral);
  document.getElementById('bhTotalNoturnoConvertido').textContent = fmtMinutos(totalNoturnoConvertidoGeral);

  const filtroAtivo = !!(bhFiltroDe || bhFiltroAte);
  let linhasExibidas = linhas;
  if(filtroAtivo){
    linhasExibidas = linhas.filter(l=>{
      if(bhFiltroDe && l.reg.data < bhFiltroDe) return false;
      if(bhFiltroAte && l.reg.data > bhFiltroAte) return false;
      return true;
    });
  }
  bhLinhasExibidasAtuais = linhasExibidas;

  const resumoPeriodo = document.getElementById('bhResumoPeriodo');
  if(filtroAtivo){
    const trabalhadoPeriodo = linhasExibidas.reduce((s,l)=>s+l.trabalhado, 0);
    const noturnoPeriodo = linhasExibidas.reduce((s,l)=>s+l.noturno, 0);
    const noturnoConvertidoPeriodo = linhasExibidas.reduce((s,l)=>s+l.noturnoConvertido, 0);
    resumoPeriodo.style.display = 'flex';
    const qtdFeriados = linhasExibidas.filter(l=>l.reg.trabalhou_feriado).length;
    resumoPeriodo.innerHTML = `<span>Período · ${linhasExibidas.length} ${linhasExibidas.length===1?'dia':'dias'} · Trabalhado ${fmtMinutos(trabalhadoPeriodo)} · Feriados trabalhados ${qtdFeriados} · Noturno ${fmtMinutos(noturnoPeriodo)} · Not. Convertido ${fmtMinutos(noturnoConvertidoPeriodo)}</span>`;
  }else{
    resumoPeriodo.style.display = 'none';
  }

  const body = document.getElementById('bhBody');
  const semRegistros = document.getElementById('bhSemRegistrosPeriodo');
  if(linhasExibidas.length===0){
    body.innerHTML = '';
    semRegistros.textContent = filtroAtivo ? 'Nenhum registro nesse período.' : 'Nenhum registro ainda.';
    semRegistros.style.display = 'block';
    return;
  }
  semRegistros.style.display = 'none';

  const horaOuTraco = v => v ? v.slice(0,5) : '—';
  const rotuloFalta = reg => {
    if(reg.tipo_dia==='falta_justificada') return '<span style="color:var(--muted);font-weight:600;">Falta justificada</span>';
    if(reg.tipo_dia==='falta_injustificada') return reg.descontar_falta
      ? '<span style="color:var(--rust);font-weight:600;">Falta injust. (descontada)</span>'
      : '<span style="color:var(--rust);font-weight:600;">Falta injust. (sem desconto)</span>';
    return null;
  };
  body.innerHTML = linhasExibidas.slice().reverse().map(l=>{
    const falta = rotuloFalta(l.reg);
    const feriado = l.reg.trabalhou_feriado ? '<div style="color:var(--green);font-size:10px;font-weight:700;margin-top:3px;">FERIADO</div>' : '';
    return `<tr>
      <td class="data">${fmtData(l.reg.data)}${feriado}</td>
      <td class="data" ${falta ? 'colspan="4"' : ''}>${falta || horaOuTraco(l.reg.entrada1)}</td>
      ${falta ? '' : `
      <td class="data">${horaOuTraco(l.reg.saida1)}</td>
      <td class="data">${horaOuTraco(l.reg.entrada2)}</td>
      <td class="data">${horaOuTraco(l.reg.saida2)}</td>`}
      <td class="valor">${fmtMinutos(l.trabalhado)}</td>
      <td class="valor" ${l.noturno>0?'style="color:var(--gold);font-weight:600;"':''}>${l.noturno>0 ? fmtMinutos(l.noturno) : '—'}</td>
      <td class="valor" ${l.noturnoConvertido>0?'style="color:var(--gold);font-weight:600;"':''}>${l.noturnoConvertido>0 ? fmtMinutos(l.noturnoConvertido) : '—'}</td>
      <td class="valor" style="color:${l.saldoDia<0?'var(--rust)':'var(--green)'};">${fmtMinutosSinal(l.saldoDia)}</td>
      <td><button class="iconbtn del" title="Excluir" onclick="confirmarExclusaoRegistroHoras('${l.reg.id}')">✕</button></td>
    </tr>`;
  }).join('');
}

function parseHoraCampo(s){
  s = (s||'').trim();
  if(!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if(!m) return null;
  const h = parseInt(m[1],10);
  const mi = parseInt(m[2],10);
  if(h<0||h>23||mi<0||mi>59) return null;
  return String(h).padStart(2,'0') + ':' + String(mi).padStart(2,'0');
}

let bhImportParsed = [];

function toggleBhImport(){
  if(!bhFuncionarioAtualId){
    alert('Selecione um funcionário primeiro.');
    return;
  }
  const area = document.getElementById('bhImportArea');
  area.style.display = (area.style.display==='none') ? 'block' : 'none';
}

function cancelarBhImport(){
  document.getElementById('bhImportArea').style.display = 'none';
  document.getElementById('bhImportText').value = '';
  document.getElementById('bhImportPreviewWrap').style.display = 'none';
  bhImportParsed = [];
}

function analisarBhImport(){
  const raw = document.getElementById('bhImportText').value;
  const linhas = raw.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
  bhImportParsed = linhas.map(linha=>{
    const partes = splitColunas(linha);
    const dataTexto = (partes[0]||'').trim();
    const e1Texto = (partes[1]||'').trim();
    const s1Texto = (partes[2]||'').trim();
    const e2Texto = (partes[3]||'').trim();
    const s2Texto = (partes[4]||'').trim();
    const data = parseDataBR(dataTexto);
    const e1 = parseHoraCampo(e1Texto);
    const s1 = parseHoraCampo(s1Texto);
    const e2 = e2Texto ? parseHoraCampo(e2Texto) : null;
    const s2 = s2Texto ? parseHoraCampo(s2Texto) : null;
    const valido = !!data && !!e1 && !!s1 && (!e2Texto || !!e2) && (!s2Texto || !!s2);
    return { dataTexto, data, e1Texto, e1, s1Texto, s1, e2Texto, e2, s2Texto, s2, valido };
  });
  renderBhImportPreview();
}

function renderBhImportPreview(){
  const body = document.getElementById('bhImportPreviewBody');
  body.innerHTML = bhImportParsed.map(r=>{
    return `<tr class="${r.valido?'':'vencido'}">
      <td>${r.data ? fmtData(r.data) : (escapeHtml(r.dataTexto) + ' ⚠️')}</td>
      <td>${r.e1 || (r.e1Texto ? escapeHtml(r.e1Texto) + ' ⚠️' : '—')}</td>
      <td>${r.s1 || (r.s1Texto ? escapeHtml(r.s1Texto) + ' ⚠️' : '—')}</td>
      <td>${r.e2 || (r.e2Texto ? escapeHtml(r.e2Texto) + ' ⚠️' : '—')}</td>
      <td>${r.s2 || (r.s2Texto ? escapeHtml(r.s2Texto) + ' ⚠️' : '—')}</td>
    </tr>`;
  }).join('');
  const validos = bhImportParsed.filter(r=>r.valido).length;
  const invalidos = bhImportParsed.length - validos;
  document.getElementById('bhImportSummary').textContent =
    validos + (validos===1 ? ' dia pronto para importar' : ' dias prontos para importar') +
    (invalidos>0 ? ' — ' + invalidos + ' linha(s) com erro serão ignoradas' : '');
  document.getElementById('bhImportPreviewWrap').style.display = 'block';
}

async function confirmarBhImport(){
  const validos = bhImportParsed.filter(r=>r.valido);
  if(validos.length===0) return;
  const btn = document.getElementById('bhImportConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Importando…';
  const registros = validos.map(r=>({
    funcionario_id: bhFuncionarioAtualId,
    data: r.data,
    entrada1: r.e1,
    saida1: r.s1,
    entrada2: r.e2 || null,
    saida2: r.s2 || null,
    trabalhou_feriado: false
  }));
  try{
    const { data, error } = await sb.from('bh_registros')
      .upsert(registros, { onConflict: 'funcionario_id,data' })
      .select();
    if(error){
      alert('Erro ao importar: ' + error.message);
      return;
    }
    data.forEach(salvo=>{
      const idx = bhRegistros.findIndex(r=>r.id===salvo.id || (r.funcionario_id===salvo.funcionario_id && r.data===salvo.data));
      if(idx>-1) bhRegistros[idx] = salvo; else bhRegistros.push(salvo);
    });
    renderBancoHoras();
    cancelarBhImport();
  }catch(e){
    alert('Não foi possível importar. Detalhe: ' + (e && e.message ? e.message : e));
  }finally{
    btn.disabled = false;
    btn.textContent = 'Importar';
  }
}

let bhTipoDiaAtual = 'normal';
let bhDescontarAtual = true;

function setBhTipoDia(tipo){
  bhTipoDiaAtual = tipo;
  document.querySelectorAll('#bhTipoDiaToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipodia===tipo));

  const ehFalta = tipo==='falta_justificada' || tipo==='falta_injustificada';
  ['bh_fld_e1','bh_fld_s1','bh_fld_e2','bh_fld_s2'].forEach(id=>{
    document.getElementById(id).style.display = ehFalta ? 'none' : '';
  });
  document.getElementById('bhDescontarFaltaWrap').style.display = (tipo==='falta_injustificada') ? 'block' : 'none';

  const err = document.getElementById('bhFormErr');
  err.textContent = ehFalta ? 'Preencha ao menos a data.' : 'Preencha ao menos data, Entrada 1 e Saída 1.';
}

function setBhDescontar(valor){
  bhDescontarAtual = valor;
  document.querySelectorAll('#bhDescontarToggle .tipo-btn').forEach(b=>b.classList.toggle('active', (b.dataset.desc==='sim')===valor));
}

let loteTipoDiaAtual = 'falta_justificada';
let loteDescontarAtual = true;

function setLoteTipoDia(tipo){
  loteTipoDiaAtual = tipo;
  document.querySelectorAll('#loteTipoToggle .tipo-btn').forEach(b=>b.classList.toggle('active', b.dataset.tipodia===tipo));
  document.getElementById('loteDescontarWrap').style.display = (tipo==='falta_injustificada') ? 'block' : 'none';
}

function setLoteDescontar(valor){
  loteDescontarAtual = valor;
  document.querySelectorAll('#loteDescontarToggle .tipo-btn').forEach(b=>b.classList.toggle('active', (b.dataset.desc==='sim')===valor));
}

function abrirLoteFaltas(){
  if(!bhFuncionarioAtualId){
    alert('Selecione um funcionário primeiro.');
    return;
  }
  const f = bhFuncionarios.find(x=>x.id===bhFuncionarioAtualId);
  document.getElementById('loteFaltasEscalaAviso').textContent = (f && f.tipo_escala==='12x36')
    ? 'Escala 12x36: vamos marcar só os dias de trabalho, alternando a partir da data inicial. Escolha uma data inicial que seja um dia em que ele(a) trabalharia.'
    : 'Escala normal: todos os dias do período serão marcados como falta.';
  document.getElementById('lote_data_inicio').value = '';
  document.getElementById('lote_data_fim').value = '';
  setLoteTipoDia('falta_justificada');
  setLoteDescontar(true);
  document.getElementById('loteFaltasErr').style.display = 'none';
  document.getElementById('loteFaltasModal').style.display = 'flex';
}

function fecharLoteFaltas(){
  document.getElementById('loteFaltasModal').style.display = 'none';
}

async function confirmarLoteFaltas(){
  const dataInicio = document.getElementById('lote_data_inicio').value;
  const dataFim = document.getElementById('lote_data_fim').value;
  const err = document.getElementById('loteFaltasErr');

  if(!dataInicio || !dataFim || dataFim < dataInicio){
    err.textContent = 'Preencha as duas datas, com a final igual ou depois da inicial.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const f = bhFuncionarios.find(x=>x.id===bhFuncionarioAtualId);
  if(!f) return;

  const datas = [];
  const cursor = new Date(dataInicio + 'T12:00:00');
  const fim = new Date(dataFim + 'T12:00:00');
  let contador = 0;
  while(cursor <= fim){
    const incluir = f.tipo_escala==='12x36' ? (contador % 2 === 0) : true;
    if(incluir) datas.push(cursor.toISOString().slice(0,10));
    cursor.setDate(cursor.getDate() + 1);
    contador++;
  }

  if(datas.length===0){
    err.textContent = 'Nenhum dia encontrado nesse período.';
    err.style.display = 'block';
    return;
  }

  const btn = document.getElementById('loteFaltasConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Lançando…';

  const registros = datas.map(data => ({
    funcionario_id: bhFuncionarioAtualId,
    data: data,
    entrada1: null, saida1: null, entrada2: null, saida2: null,
    tipo_dia: loteTipoDiaAtual,
    descontar_falta: loteTipoDiaAtual==='falta_injustificada' ? loteDescontarAtual : true,
    trabalhou_feriado: false
  }));

  const { data: salvos, error } = await sb.from('bh_registros')
    .upsert(registros, { onConflict: 'funcionario_id,data' })
    .select();

  btn.disabled = false;
  btn.textContent = 'Lançar faltas';

  if(error){
    err.textContent = 'Erro ao lançar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  (salvos||[]).forEach(salvo=>{
    const idx = bhRegistros.findIndex(r=>r.id===salvo.id || (r.funcionario_id===salvo.funcionario_id && r.data===salvo.data));
    if(idx>-1) bhRegistros[idx] = salvo; else bhRegistros.push(salvo);
  });

  renderBancoHoras();
  fecharLoteFaltas();
  alert(datas.length + ' dia(s) lançado(s) como falta.');
}

async function salvarRegistroHoras(){
  const data = document.getElementById('bh_data').value;
  const e1 = document.getElementById('bh_e1').value;
  const s1 = document.getElementById('bh_s1').value;
  const e2 = document.getElementById('bh_e2').value;
  const s2 = document.getElementById('bh_s2').value;
  const err = document.getElementById('bhFormErr');
  const ehFalta = bhTipoDiaAtual==='falta_justificada' || bhTipoDiaAtual==='falta_injustificada';

  if(!bhFuncionarioAtualId){
    err.textContent = 'Selecione um funcionário primeiro.';
    err.style.display = 'block';
    return;
  }
  if(!data || (!ehFalta && (!e1 || !s1))){
    err.textContent = ehFalta ? 'Preencha ao menos a data.' : 'Preencha ao menos data, Entrada 1 e Saída 1.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  const registro = {
    funcionario_id: bhFuncionarioAtualId,
    data: data,
    entrada1: ehFalta ? null : (e1 || null),
    saida1: ehFalta ? null : (s1 || null),
    entrada2: ehFalta ? null : (e2 || null),
    saida2: ehFalta ? null : (s2 || null),
    tipo_dia: bhTipoDiaAtual==='feriado_trabalhado' ? 'normal' : bhTipoDiaAtual,
    descontar_falta: bhTipoDiaAtual==='falta_injustificada' ? bhDescontarAtual : true,
    trabalhou_feriado: bhTipoDiaAtual==='feriado_trabalhado'
  };

  const { data: salvo, error } = await sb.from('bh_registros')
    .upsert(registro, { onConflict: 'funcionario_id,data' })
    .select().single();

  if(error){
    err.textContent = 'Erro ao salvar: ' + error.message;
    err.style.display = 'block';
    return;
  }

  const idx = bhRegistros.findIndex(r=>r.id===salvo.id || (r.funcionario_id===salvo.funcionario_id && r.data===salvo.data));
  if(idx>-1) bhRegistros[idx] = salvo; else bhRegistros.push(salvo);

  document.getElementById('bh_data').value = '';
  document.getElementById('bh_e1').value = '';
  document.getElementById('bh_s1').value = '';
  document.getElementById('bh_e2').value = '';
  document.getElementById('bh_s2').value = '';
  setBhTipoDia('normal');
  setBhDescontar(true);
  renderBancoHoras();
}

async function excluirRegistroHoras(id){
  const { error } = await sb.from('bh_registros').delete().eq('id', id);
  if(!error){
    bhRegistros = bhRegistros.filter(r=>r.id!==id);
    renderBancoHoras();
  }
}

let excluindoRegistroHorasId = null;

function confirmarExclusaoRegistroHoras(id){
  excluindoRegistroHorasId = id;
  document.getElementById('confirmHorasModal').style.display = 'flex';
}

function fecharConfirmacaoHoras(){
  document.getElementById('confirmHorasModal').style.display = 'none';
  excluindoRegistroHorasId = null;
}

async function confirmarExclusaoRegistroHorasOk(){
  if(!excluindoRegistroHorasId) return;
  await excluirRegistroHoras(excluindoRegistroHorasId);
  fecharConfirmacaoHoras();
}

let excluindoColabId = null;
let excluindoColabLoja = null;

function abrirExcluirFuncionario(id, loja){
  const lista = loja==='loja1' ? colaboradoresLoja1 : colaboradoresLoja2;
  const f = lista.find(x=>x.id===id);
  if(!f) return;
  excluindoColabId = id;
  excluindoColabLoja = loja;
  document.getElementById('excluirFuncNome').textContent = f.nome;
  document.getElementById('excluirFunc_senha').value = '';
  document.getElementById('excluirFuncErr').style.display = 'none';
  document.getElementById('excluirFuncModal').style.display = 'flex';
}

function fecharExcluirFuncModal(){
  document.getElementById('excluirFuncModal').style.display = 'none';
}

async function confirmarExclusaoFuncionario(){
  const senha = document.getElementById('excluirFunc_senha').value;
  const err = document.getElementById('excluirFuncErr');
  const btn = document.getElementById('excluirFuncConfirmBtn');

  if(!senha){
    err.textContent = 'Digite sua senha.';
    err.style.display = 'block';
    return;
  }
  if(!usuarioEmailAtual){
    err.textContent = 'Não foi possível confirmar sua conta. Recarregue a página e tente de novo.';
    err.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verificando…';

  try{
    const { error: erroSenha } = await sb.auth.signInWithPassword({ email: usuarioEmailAtual, password: senha });
    if(erroSenha){
      err.textContent = 'Senha incorreta.';
      err.style.display = 'block';
      return;
    }

    const { error } = await sb.from('bh_funcionarios').delete().eq('id', excluindoColabId);
    if(error){
      err.textContent = 'Erro ao excluir: ' + error.message;
      err.style.display = 'block';
      return;
    }

    if(excluindoColabLoja==='loja1'){
      colaboradoresLoja1 = colaboradoresLoja1.filter(f=>f.id!==excluindoColabId);
    }else{
      colaboradoresLoja2 = colaboradoresLoja2.filter(f=>f.id!==excluindoColabId);
    }
    renderColabTables();
    bhCarregado = false;
    fecharExcluirFuncModal();
  }catch(e){
    err.textContent = 'Não foi possível confirmar. Verifique sua internet e tente de novo.';
    err.style.display = 'block';
  }finally{
    btn.disabled = false;
    btn.textContent = 'Excluir definitivamente';
  }
}

/* =============== FIM BANCO DE HORAS =============== */

async function aplicarSessao(session, opts){
  opts = opts || {};
  if(session){
    document.getElementById('loginScreen').style.display = 'none';
    if(opts.carregarDados){
      document.getElementById('loadingScreen').style.display = 'flex';
    }
    const nomeUsuario = (session.user.user_metadata && (session.user.user_metadata.nome || session.user.user_metadata.name)) || session.user.email;
    document.getElementById('perfilNome').textContent = nomeUsuario;
    document.getElementById('perfilEmail').textContent = session.user.email;
    usuarioEmailAtual = session.user.email;
    document.getElementById('perfilBarNome').textContent = nomeUsuario;
    document.getElementById('avatarCircle').textContent = nomeUsuario.trim().charAt(0).toUpperCase();
    document.querySelectorAll('.loja-btn').forEach(b=>b.classList.toggle('active', b.dataset.loja===lojaAtual));
    if(opts.carregarDados){
      await carregarDados();
    }
    document.getElementById('app').classList.add('on');
    document.getElementById('loadingScreen').style.display = 'none';
    agendarPopupAniversario();
  }else{
    clearTimeout(timerPopupAniversario);
    fecharPopupAniversario();
    document.getElementById('app').classList.remove('on');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loadingScreen').style.display = 'none';
  }
}

const compUploadAreaEl = document.getElementById('compUploadArea');
compUploadAreaEl.addEventListener('dragover', (e)=>{
  e.preventDefault();
  compUploadAreaEl.classList.add('arrastando');
});
compUploadAreaEl.addEventListener('dragleave', ()=>{
  compUploadAreaEl.classList.remove('arrastando');
});
compUploadAreaEl.addEventListener('drop', (e)=>{
  e.preventDefault();
  compUploadAreaEl.classList.remove('arrastando');
  if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length>0){
    onSelecionarComprovantes(e.dataTransfer.files);
  }
});

async function iniciar(){
  inicializarAtualizacoesDesktop();
  aplicarMesAtualPadrao();
  // No aplicativo instalado, exigir um novo login a cada abertura.
  // sessionStorage sobrevive a recarregamentos da tela, mas e limpa ao fechar o app.
  if(/Electron\//i.test(navigator.userAgent) && !sessionStorage.getItem('ranchao-login-preparado')){
    sessionStorage.setItem('ranchao-login-preparado', '1');
    try{
      Object.keys(localStorage).forEach(k=>{
        if(k.startsWith('sb-') && k.includes('-auth-token')) localStorage.removeItem(k);
      });
    }catch(e){}
  }

  if(!initSupabase()) return;

  const watchdog = setTimeout(()=>{
    if(document.getElementById('loadingScreen').style.display !== 'none'){
      limparSessaoLocalEForcarReload();
    }
  }, 14000);

  let sessaoInicial = null;
  try{
    const resultado = await sb.auth.getSession();
    sessaoInicial = resultado.data ? resultado.data.session : null;
  }catch(e){
    console.error('Erro ao validar sessão:', e);
  }

  await aplicarSessao(sessaoInicial, { carregarDados: true });
  clearTimeout(watchdog);
  document.getElementById('loadingScreen').style.display = 'none';

  sb.auth.onAuthStateChange(async (event, session) => {
    if(event === 'SIGNED_OUT'){
      await aplicarSessao(session, { carregarDados: false });
    }else if(event === 'SIGNED_IN'){
      const jaEstaAberto = document.getElementById('app').classList.contains('on');
      if(jaEstaAberto) return;
      await aplicarSessao(session, { carregarDados: true });
    }
  });
}

document.addEventListener('input', function(e){
  const el = e.target;
  const tipoIgnorado = ['email','password','date','time','month','number','file','checkbox','radio'];
  const ehInputTexto = el.tagName==='INPUT' && !tipoIgnorado.includes(el.type);
  const ehTextarea = el.tagName==='TEXTAREA';
  if((ehInputTexto || ehTextarea) && !el.classList.contains('sem-maiuscula')){
    const inicio = el.selectionStart;
    const fim = el.selectionEnd;
    const novoValor = el.value.toUpperCase();
    if(novoValor !== el.value){
      el.value = novoValor;
      if(inicio!==null && fim!==null) el.setSelectionRange(inicio, fim);
    }
  }
});

iniciar();

const TEMPO_INATIVIDADE_MS = 20 * 60 * 1000; // 20 minutos
let timerInatividade = null;

function reiniciarTimerInatividade(){
  clearTimeout(timerInatividade);
  timerInatividade = setTimeout(async ()=>{
    if(sb && document.getElementById('app').classList.contains('on')){
      await sb.auth.signOut({ scope: 'local' });
      alert('Você foi desconectado por inatividade. Faça login novamente.');
    }
  }, TEMPO_INATIVIDADE_MS);
}

['mousemove','keydown','click','touchstart','scroll'].forEach(evento=>{
  document.addEventListener(evento, reiniciarTimerInatividade, { passive: true });
});
reiniciarTimerInatividade();

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service worker não registrado:', e));
  });
}
