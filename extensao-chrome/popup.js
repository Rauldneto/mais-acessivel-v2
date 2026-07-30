var APP='https://rauldneto.github.io/mais-acessivel-app/';
var body=document.getElementById('body');

// Div onde o conteudo que muda de acordo com o contexto (Bling ou nao,
// proposta aberta ou nao) e renderizado. O botao "Abrir app" fica fora
// dela, sempre visivel, independente do contexto.
var dynamicWrap=document.createElement('div');

function abrirApp(d){
  chrome.tabs.create({url:APP+'#bling='+encodeURIComponent(JSON.stringify(d))});
  window.close();
}

// Atalho fixo: sempre abre o app numa janela nova, sem depender de
// estar numa proposta do Bling.
function abrirAppNovaJanela(){
  chrome.windows.create({url:APP});
  window.close();
}

function montarBotaoAbrirAppFixo(){
  var btn=document.createElement('button');
  btn.className='btn btn-sec';
  btn.id='btnAbrirAppFixo';
  btn.textContent='🪟 Abrir app';
  btn.onclick=abrirAppNovaJanela;
  return btn;
}

function importar(dados){
  dynamicWrap.innerHTML='<p class="status">⏳ Buscando contato...</p>';
  var etCep=(dados.etiqueta_cep||'').replace(/\D/g,'');
  var etEnd=[dados.etiqueta_endereco,dados.etiqueta_numero,dados.etiqueta_complemento,
    dados.etiqueta_bairro,dados.etiqueta_municipio+' - '+dados.etiqueta_uf]
    .filter(function(s){return s&&s.trim()&&s!=' - ';}).join(', ');
  var kg=(dados.pesoBruto||'').replace(',','.');
  var vi=dados.totalOrcamento||'';
  var volRaw=dados.qtdVolumes||'';
  var vol=(volRaw&&volRaw!=='0')?volRaw:(dados.campoTotalQtds||'').split(',')[0];
  var fm=dados.frete_modalidade||'';
  var ft=(fm==='R'||fm==='r')?'CIF':'FOB';

  function finalizar(cnpj,cep,end){
    abrirApp({n:dados.numeroProposta,vend:dados.nomeVendedor,c:cnpj,p:cep,
      end:end,endE:'',kg:kg,ft:ft,vi:vi,vol:vol,itens:dados.itens||[]});
  }

  if(!dados.idContato){finalizar('',etCep,etEnd);return;}

  chrome.tabs.query({active:true,currentWindow:true},function(tabs){
    chrome.scripting.executeScript({
      target:{tabId:tabs[0].id},
      func:function(id){
        return fetch('/Api/v3/contatos/'+id,{credentials:'include'})
          .then(function(r){return r.json();}).catch(function(){return null;});
      },
      args:[dados.idContato]
    },function(results){
      var resp=results&&results[0]&&results[0].result;
      var cnpj='',cep=etCep,end=etEnd;
      if(resp&&resp.data){
        var c=resp.data;
        cnpj=(c.cpf_cnpj||c.numeroDocumento||'').replace(/[^\d]/g,'');
        var g=(c.endereco&&c.endereco.geral)||{};
        var cadCep=(g.cep||c.cep||'').replace(/\D/g,'');
        var cadEnd=[g.endereco||c.endereco,g.numero||c.numero,g.complemento||c.complemento,
          g.bairro||c.bairro,(g.municipio||c.cidade)+' - '+(g.uf||c.uf)]
          .filter(function(s){return s&&String(s).trim()&&s!=' - ';}).join(', ');
        if(etCep&&etCep!==cadCep){cep=etCep;end=etEnd;}
        else{cep=cadCep||etCep;end=cadEnd||etEnd;}
      }
      finalizar(cnpj,cep,end);
    });
  });
}

// Monta a estrutura fixa da tela: area dinamica + botao "Abrir app" sempre visivel
body.innerHTML='';
body.appendChild(dynamicWrap);
body.appendChild(montarBotaoAbrirAppFixo());

chrome.tabs.query({active:true,currentWindow:true},function(tabs){
  var tab=tabs[0];
  if(!tab.url||!tab.url.includes('bling.com.br')){
    dynamicWrap.innerHTML='<p class="status">Abra uma proposta no Bling para importar.</p>';
    return;
  }
  chrome.tabs.sendMessage(tab.id,{action:'getDados'},function(dados){
    if(chrome.runtime.lastError||!dados){
      dynamicWrap.innerHTML='<div class="erro">⚠️ Recarregue a página do Bling (F5) e tente novamente.</div>';
      return;
    }
    if(!dados.emProposta){
      dynamicWrap.innerHTML='<p class="status">Abra uma <b>proposta</b> no Bling para importar.</p>';
      return;
    }
    var fm=dados.frete_modalidade||'';
    var ft=(fm==='R'||fm==='r')?'CIF':'FOB';
    dynamicWrap.innerHTML=
      '<div class="info">'+
        '<div class="num">Proposta Nº '+dados.numeroProposta+'</div>'+
        '<div class="det">👤 '+(dados.nomeVendedor||'—')+'</div>'+
        '<div class="det">💰 R$ '+(dados.totalOrcamento||'0')+' &nbsp;⚖️ '+(dados.pesoBruto||'0')+' kg</div>'+
        '<div class="det">🚚 '+ft+' &nbsp;📦 '+(dados.itens||[]).length+' item(s)</div>'+
      '</div>'+
      '<button class="btn btn-ok" id="btnImp">🚛 Cotação de Frete</button>';
    document.getElementById('btnImp').onclick=function(){
      this.disabled=true;this.textContent='⏳ Importando...';
      importar(dados);
    };
  });
});
