// ==== CONFIGURAÇÃO ====
const SHEET_ID = '1Nvv7MVhjX3QGeuqUXgpIkEfyJFK-TGqPykJIIlvBLJI';
const ABA_ACEITES = 'Aceites';
const EMAIL_ORGANIZACAO = 'eitaloversrodfestfolia@gmail.com';
const PRAZO_LIMITE = new Date('2026-07-17T23:59:00-03:00');
const ARQUIVO_HTML_TICKET = 'termo'; // rodfest_termo_de_embarque.html

// ==== doGet: serve o ticket na URL /exec ====
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile(ARQUIVO_HTML_TICKET)
    .setTitle('RodFest Folia | Termo de Embarque')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==== doPost: recebe o aceite do formulário ====
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);

    if (new Date() > PRAZO_LIMITE) {
      return responderJson({ ok: false, motivo: 'prazo encerrado' });
    }
    if (!dados.nome || !dados.telefone || !dados.email || dados.declarou_maior_idade !== true || dados.aceitou_termos !== true) {
      return responderJson({ ok: false, motivo: 'dados incompletos' });
    }

    const sheet = getAbaAceites();
    const telefoneNormalizado = normalizarTelefone(dados.telefone);
    const linhaExistente = encontrarLinhaPorTelefone(sheet, telefoneNormalizado);

    const linha = [
      new Date(),
      dados.nome,
      dados.telefone,
      dados.email,
      dados.declarou_maior_idade,
      dados.aceitou_termos,
      dados.termo_versao,
      dados.protocolo,
      dados.user_agent || ''
    ];

    const foiAtualizacao = linhaExistente > 0;
    if (foiAtualizacao) {
      sheet.getRange(linhaExistente, 1, 1, linha.length).setValues([linha]);
    } else {
      sheet.appendRow(linha);
    }

    enviarEmailConfirmacao(dados);
    notificarOrganizacao(dados, foiAtualizacao);

    return responderJson({ ok: true, protocolo: dados.protocolo });

  } catch (erro) {
    return responderJson({ ok: false, motivo: 'erro interno', detalhe: String(erro) });
  }
}

function responderJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
// ==== Planilha ====
function getAbaAceites() {
  const planilha = SpreadsheetApp.openById(SHEET_ID);
  let aba = planilha.getSheetByName(ABA_ACEITES);
  if (!aba) {
    aba = planilha.insertSheet(ABA_ACEITES);
    aba.appendRow([
      'timestamp', 'nome', 'telefone', 'email',
      'declarou_maior_idade', 'aceitou_termos', 'termo_versao',
      'protocolo', 'user_agent'
    ]);
  }
  return aba;
}

function normalizarTelefone(tel) {
  return String(tel).replace(/\D/g, ''); // mantém só os números, ignora formatação
}

function encontrarLinhaPorTelefone(sheet, telefoneNormalizado) {
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) { // pula o cabeçalho
    if (normalizarTelefone(dados[i][2]) === telefoneNormalizado) { // coluna C = telefone
      return i + 1; // linha real na planilha (1-indexed)
    }
  }
  return -1;
}

// ==== E-mails ====
function enviarEmailConfirmacao(dados) {
  const primeiroNome = dados.nome.split(' ')[0];
  const corpo = `Oi ${primeiroNome}!

Sua presença no RodFest Folia está confirmada. Protocolo: ${dados.protocolo}

Termo aceito (${dados.termo_versao}):
- Uso de imagem para divulgação no @eitalovers e redes sociais
- Responsabilidade por danos causados à propriedade da chácara
- A organização não se responsabiliza por itens pessoais perdidos ou furtados

Data: 18/07/2026, das 09:30 às 22:00.
Qualquer dúvida, chama no grupo do WhatsApp.`;

  GmailApp.sendEmail(dados.email, 'RodFest Folia: confirmação de presença', corpo);
}

function notificarOrganizacao(dados, foiAtualizacao) {
  const corpo = `${foiAtualizacao ? 'Aceite atualizado' : 'Novo aceite registrado'}.

Nome: ${dados.nome}
WhatsApp: ${dados.telefone}
E-mail: ${dados.email}
Protocolo: ${dados.protocolo}
Aceito em: ${dados.aceito_em}`;

  GmailApp.sendEmail(
    EMAIL_ORGANIZACAO,
    `RodFest: ${dados.nome} ${foiAtualizacao ? 'atualizou' : 'confirmou'} presença`,
    corpo
  );
}

// ==== Painel de check-in ====
// Rode esta função UMA VEZ manualmente no editor do Apps Script
// (selecione "configurarAbaCheckin" no menu de funções e clique em Executar).
// Ela cria uma aba "Checkin" com nome, telefone e protocolo, fácil de buscar
// com Ctrl+F na entrada da chácara.
function configurarAbaCheckin() {
  const planilha = SpreadsheetApp.openById(SHEET_ID);
  let aba = planilha.getSheetByName('Checkin');
  if (!aba) aba = planilha.insertSheet('Checkin');
  aba.clear();
  aba.getRange('A1').setValue('Busque o telefone com Ctrl+F nesta aba (atualiza sozinha).');
  aba.getRange('A3').setFormula(
    `=QUERY(${ABA_ACEITES}!A2:H, "select Col2, Col3, Col8 where Col2 is not null order by Col2 label Col2 'Nome', Col3 'Telefone', Col8 'Protocolo'", 0)`
  );
}
