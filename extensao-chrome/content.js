// content.js
function fld(n){var e=document.querySelector('[name="'+n+'"]');return e?(e.value||'').trim():'';}

chrome.runtime.onMessage.addListener(function(request,sender,sendResponse){
  if(request.action==='getDados'){
    var url=window.location.href;
    var num=fld('numeroProposta');
    var mUrl=url.match(/[#\/](\d{10,})/);
    var idProposta=mUrl?mUrl[1]:'';

    var dados={
      emBling:url.includes('bling.com.br'),
      emProposta:!!(num||idProposta),
      numeroProposta:num,
      idProposta:idProposta,
      nomeVendedor:fld('nomeVendedor'),
      pesoBruto:fld('pesoBruto'),
      totalOrcamento:fld('totalOrcamento'),
      qtdVolumes:fld('qtdVolumes'),
      campoTotalQtds:fld('campoTotalQtds'),
      frete_modalidade:fld('frete_modalidade'),
      idContato:fld('idContato'),
      etiqueta_cep:fld('etiqueta_cep'),
      etiqueta_endereco:fld('etiqueta_endereco'),
      etiqueta_numero:fld('etiqueta_numero'),
      etiqueta_complemento:fld('etiqueta_complemento'),
      etiqueta_bairro:fld('etiqueta_bairro'),
      etiqueta_municipio:fld('etiqueta_municipio'),
      etiqueta_uf:fld('etiqueta_uf'),
      itens:[]
    };

    var prods=document.querySelectorAll('[name="itens[produto][]"]');
    var qtds=document.querySelectorAll('[name="itens[quantidade][]"]');
    var cods=document.querySelectorAll('[name="itens[codigo][]"]');
    prods.forEach(function(el,i){
      dados.itens.push({
        produto:{descricao:el.value},
        quantidade:qtds[i]?parseFloat(qtds[i].value)||1:1,
        codigo:cods[i]?cods[i].value:''
      });
    });
    sendResponse(dados);
  }
  return true;
});