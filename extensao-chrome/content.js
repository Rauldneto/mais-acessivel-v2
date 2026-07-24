// content.js — lê os campos da página do Bling e responde ao popup

function fld(n) {
  var e = document.querySelector('[name="' + n + '"]');
  return e ? (e.value || '').trim() : '';
}

function coletarDados() {
  var url = window.location.href;
  var num = fld('numeroProposta');
  var mUrl = url.match(/[#\/](\d{10,})/);
  var idProposta = mUrl ? mUrl[1] : '';

  var dados = {
    emBling: url.includes('bling.com.br'),
    emProposta: !!(num || idProposta),
    numeroProposta: num,
    idProposta: idProposta,
    nomeVendedor: fld('nomeVendedor'),
    pesoBruto: fld('pesoBruto'),
    totalOrcamento: fld('totalOrcamento'),
    qtdVolumes: fld('qtdVolumes'),
    campoTotalQtds: fld('campoTotalQtds'),
    frete_modalidade: fld('frete_modalidade'),
    idContato: fld('idContato'),
    etiqueta_cep: fld('etiqueta_cep'),
    etiqueta_endereco: fld('etiqueta_endereco'),
    etiqueta_numero: fld('etiqueta_numero'),
    etiqueta_complemento: fld('etiqueta_complemento'),
    etiqueta_bairro: fld('etiqueta_bairro'),
    etiqueta_municipio: fld('etiqueta_municipio'),
    etiqueta_uf: fld('etiqueta_uf'),
    itens: []
  };

  var prods = document.querySelectorAll('[name="itens[produto][]"]');
  var qtds  = document.querySelectorAll('[name="itens[quantidade][]"]');
  var cods  = document.querySelectorAll('[name="itens[codigo][]"]');
  prods.forEach(function(el, i) {
    dados.itens.push({
      produto: { descricao: el.value },
      quantidade: qtds[i] ? parseFloat(qtds[i].value) || 1 : 1,
      codigo: cods[i] ? cods[i].value : ''
    });
  });

  return dados;
}

// Responde ao popup imediatamente
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getDados') {
    var dados = coletarDados();

    // Se não achou os campos ainda, tenta novamente após 1s (página ainda carregando)
    if (!dados.emProposta && dados.emBling) {
      setTimeout(function() {
        sendResponse(coletarDados());
      }, 1500);
      return true; // mantém canal aberto para resposta assíncrona
    }

    sendResponse(dados);
  }
  return true;
});

// Também injeta um botão flutuante na página do Bling para facilitar
(function() {
  if (!window.location.href.includes('bling.com.br')) return;

  // Aguarda a página carregar
  function injetarBotao() {
    if (document.getElementById('mais-acessivel-btn')) return;

    var btn = document.createElement('div');
    btn.id = 'mais-acessivel-btn';
    btn.title = 'Importar para Mais Acessível';
    btn.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'z-index:999999',
      'background:#e67e22',
      'color:#fff',
      'border-radius:50px',
      'padding:10px 18px',
      'font-family:Segoe UI,sans-serif',
      'font-size:13px',
      'font-weight:700',
      'cursor:pointer',
      'box-shadow:0 4px 12px rgba(0,0,0,.3)',
      'display:flex',
      'align-items:center',
      'gap:8px',
      'user-select:none',
      'transition:all .2s'
    ].join(';');
    btn.innerHTML = '<span style="font-size:18px">🚚</span> Cotar Frete';

    btn.onmouseover = function() { btn.style.background = '#d35400'; };
    btn.onmouseout  = function() { btn.style.background = '#e67e22'; };
    btn.onclick = function() {
      // Envia mensagem para o popup via background
      var dados = coletarDados();
      if (!dados.numeroProposta) {
        btn.innerHTML = '<span>⚠️</span> Abra uma proposta!';
        setTimeout(function() {
          btn.innerHTML = '<span style="font-size:18px">🚚</span> Cotar Frete';
        }, 2000);
        return;
      }
      // Abre popup da extensão programaticamente não é possível,
      // então abrimos diretamente com os dados
      btn.innerHTML = '<span>⏳</span> Buscando...';
      btn.style.pointerEvents = 'none';

      var etCep = (dados.etiqueta_cep || '').replace(/\D/g, '');
      var etEnd = [dados.etiqueta_endereco, dados.etiqueta_numero,
        dados.etiqueta_complemento, dados.etiqueta_bairro,
        dados.etiqueta_municipio + ' - ' + dados.etiqueta_uf]
        .filter(function(s) { return s && s.trim() && s !== ' - '; }).join(', ');
      var kg = (dados.pesoBruto || '').replace(',', '.');
      var vi = dados.totalOrcamento || '';
      var volRaw = dados.qtdVolumes || '';
      var vol = (volRaw && volRaw !== '0') ? volRaw : (dados.campoTotalQtds || '').split(',')[0];
      var fm = dados.frete_modalidade || '';
      var ft = (fm === 'R' || fm === 'r') ? 'CIF' : 'FOB';

      function abrirApp(cnpj, cep, end) {
        var d = {
          n: dados.numeroProposta, vend: dados.nomeVendedor,
          c: cnpj, p: cep, end: end, endE: '',
          kg: kg, ft: ft, vi: vi, vol: vol, itens: dados.itens || []
        };
        var url = 'https://rauldneto.github.io/mais-acessivel-app/#bling=' +
          encodeURIComponent(JSON.stringify(d));
        window.open(url, '_blank');
        btn.innerHTML = '<span style="font-size:18px">🚚</span> Cotar Frete';
        btn.style.pointerEvents = 'auto';
      }

      if (dados.idContato) {
        fetch('/Api/v3/contatos/' + dados.idContato, { credentials: 'include' })
          .then(function(r) { return r.json(); })
          .then(function(resp) {
            var cnpj = '', cep = etCep, end = etEnd;
            if (resp && resp.data) {
              var c = resp.data;
              cnpj = (c.cpf_cnpj || c.numeroDocumento || '').replace(/[^\d]/g, '');
              var g = (c.endereco && c.endereco.geral) || {};
              var cadCep = (g.cep || c.cep || '').replace(/\D/g, '');
              var cadEnd = [g.endereco || c.endereco, g.numero || c.numero,
                g.complemento || c.complemento, g.bairro || c.bairro,
                (g.municipio || c.cidade) + ' - ' + (g.uf || c.uf)]
                .filter(function(s) { return s && String(s).trim() && s !== ' - '; })
                .join(', ');
              if (etCep && etCep !== cadCep) { cep = etCep; end = etEnd; }
              else { cep = cadCep || etCep; end = cadEnd || etEnd; }
            }
            abrirApp(cnpj, cep, end);
          })
          .catch(function() { abrirApp('', etCep, etEnd); });
      } else {
        abrirApp('', etCep, etEnd);
      }
    };

    document.body.appendChild(btn);
  }

  // Tenta injetar após carregamento e também ao navegar (SPA)
  if (document.readyState === 'complete') {
    setTimeout(injetarBotao, 1000);
  } else {
    window.addEventListener('load', function() {
      setTimeout(injetarBotao, 1000);
    });
  }

  // Reinjeta ao mudar de página (hash change - SPA do Bling)
  window.addEventListener('hashchange', function() {
    var old = document.getElementById('mais-acessivel-btn');
    if (old) old.remove();
    setTimeout(injetarBotao, 1500);
  });
})();
