// Controla o comportamento do ícone da extensão de forma dinâmica:
// - Se a aba ativa for do Bling: clicar no ícone abre o popup normal
//   (com o botão "Cotação de Frete" para importar a proposta).
// - Em qualquer outra aba: clicar no ícone abre o app direto numa aba
//   nova, sem popup nenhum no meio do caminho.

var APP = 'https://rauldneto.github.io/mais-acessivel-app/';

function atualizarPopup(tabId, url) {
  var ehBling = !!(url && url.indexOf('bling.com.br') !== -1);
  chrome.action.setPopup({ tabId: tabId, popup: ehBling ? 'popup.html' : '' });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url || changeInfo.status === 'complete') {
    atualizarPopup(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    if (chrome.runtime.lastError || !tab) return;
    atualizarPopup(tab.id, tab.url);
  });
});

// So dispara quando NAO ha popup configurado para a aba (ou seja,
// fora do Bling) - abre o app direto, sem etapas no meio.
chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: APP });
});
