// Antes, este arquivo controlava dinamicamente qual popup mostrar por aba
// (setPopup por tabId), mas esse mecanismo do Manifest V3 e' fragil: abas
// restauradas/reativadas nem sempre disparam os eventos a tempo, fazendo o
// popup errado aparecer (ex: popup do Bling numa aba que nao e' do Bling).
//
// Agora o manifest.json define "default_popup": "popup.html" fixo, sempre
// o mesmo popup em qualquer aba. E' o proprio popup.js quem consulta a aba
// ativa NO MOMENTO em que e' aberto (sempre atual, sem depender de eventos
// de fundo) e decide o que mostrar: tela de importacao (se Bling) ou apenas
// o botao fixo "Abrir app" (em qualquer outro lugar).
//
// Este service worker fica ocioso de proposito - nao ha mais logica de
// popup dinamico para evitar conflito com o default_popup fixo.
