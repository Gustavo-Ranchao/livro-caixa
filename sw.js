// Service worker mínimo do Livro-Caixa.
// O app depende de dados ao vivo (Supabase), então não tentamos funcionar
// offline de verdade — isso aqui só existe para o navegador permitir a
// instalação do app na tela inicial / área de trabalho.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Sempre busca da rede (comportamento normal de navegador).
  event.respondWith(fetch(event.request));
});
