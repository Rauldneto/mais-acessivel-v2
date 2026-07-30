var APP='https://rauldneto.github.io/mais-acessivel-app/';
var body=document.getElementById('body');

function abrirApp(d){
  chrome.tabs.create({url:APP+'#bling='+encodeURIComponent(JSON.stringify(d))});
  window.close();
}

function abrirAppVazio(){
  chrome.tabs.create({url:APP});
  window.close();
}

function importar(dados){
  body.innerHTML='<p class="status">⏳ Buscando contato...</p>';
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

chrome.tabs.query({active:true,currentWindow:true},function(tabs){
  var tab=tabs[0];
  if(!tab.url||!tab.url.includes('bling.com.br')){
    body.innerHTML='<p class="status">Abra uma proposta no Bling para importar.</p>'+
      '<button class="btn btn-sec" id="btnAbrirApp1">Abrir app</button>';
    document.getElementById('btnAbrirApp1').onclick=abrirAppVazio;
    return;
  }
  chrome.tabs.sendMessage(tab.id,{action:'getDados'},function(dados){
    if(chrome.runtime.lastError||!dados){
      body.innerHTML='<div class="erro">⚠️ Recarregue a página do Bling (F5) e tente novamente.</div>'+
        '<button class="btn btn-sec" id="btnFechar">Fechar</button>';
      document.getElementById('btnFechar').onclick=function(){window.close();};
      return;
    }
    if(!dados.emProposta){
      body.innerHTML='<p class="status">Abra uma <b>proposta</b> no Bling para importar.</p>'+
        '<button class="btn btn-sec" id="btnAbrirApp2">Abrir app</button>';
      document.getElementById('btnAbrirApp2').onclick=abrirAppVazio;
      return;
    }
    var fm=dados.frete_modalidade||'';
    var ft=(fm==='R'||fm==='r')?'CIF':'FOB';
    body.innerHTML=
      '<div class="info">'+
        '<div class="num">Proposta Nº '+dados.numeroProposta+'</div>'+
        '<div class="det">👤 '+(dados.nomeVendedor||'—')+'</div>'+
        '<div class="det">💰 R$ '+(dados.totalOrcamento||'0')+' &nbsp;⚖️ '+(dados.pesoBruto||'0')+' kg</div>'+
        '<div class="det">🚚 '+ft+' &nbsp;📦 '+(dados.itens||[]).length+' item(s)</div>'+
      '</div>'+
      '<button class="btn btn-ok" id="btnImp">🚀 Importar para Cotação</button>'+
      '<button class="btn btn-sec" id="btnAbrirApp3">Abrir sem importar</button>';
    document.getElementById('btnAbrirApp3').onclick=abrirAppVazio;
    document.getElementById('btnImp').onclick=function(){
      this.disabled=true;this.textContent='⏳ Importando...';
      importar(dados);
    };
  });
});