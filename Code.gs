/**
 * RodFest Folia — backend de aceite do termo (Google Apps Script).
 *
 * SETUP (uma vez só, logado como eitaloversrodfestfolia@gmail.com):
 * 1. sheets.google.com → nova planilha em branco → renomear para "Aceites RodFest".
 * 2. Copiar o ID da planilha na URL: .../d/ESTE_TRECHO_AQUI/edit → colar abaixo em SHEET_ID.
 * 3. Extensões → Apps Script → apagar o conteúdo padrão → colar este arquivo inteiro.
 * 4. Implantar → Nova implantação → tipo "App da Web".
 *    - Executar como: Eu (eitaloversrodfestfolia@gmail.com)
 *    - Quem tem acesso: Qualquer pessoa
 * 5. Copiar a URL do Web App gerada → colar na constante GAS_ENDPOINT dentro de
 *    rodfest_termo_de_embarque.html (não mexer em mais nada do HTML).
 * 6. Testar: enviar o formulário e conferir a aba "Aceites", o e-mail de
 *    confirmação do convidado e a notificação em EMAIL_ORGANIZACAO.
 *
 * As abas "Aceites" e "Checkin" são criadas automaticamente (com cabeçalho)
 * na primeira execução, não precisa criar colunas na mão.
 */

const SHEET_ID = 'COLOQUE_AQUI_O_ID_DA_PLANILHA_ACEITES_RODFEST';
const EMAIL_ORGANIZACAO = 'eitaloversrodfestfolia@gmail.com';
const PRAZO_LIMITE = new Date('2026-07-17T23:59:00-03:00');

const ACEITES_HEADER = ['timestamp', 'nome', 'telefone', 'email', 'declarou_maior_idade', 'aceitou_termos', 'termo_versao', 'protocolo', 'user_agent'];
const CHECKIN_HEADER = ['nome', 'telefone', 'protocolo'];

/**
 * Serve o ticket direto pelo Apps Script (sem precisar de GitHub Pages).
 * Requer um arquivo HTML chamado "termo" no projeto (File → New → HTML file,
 * nome "termo", colar o conteúdo de termo.html deste repositório).
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('termo')
    .setTitle('RodFest Folia — Termo de Aceite')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);

    if (new Date() > PRAZO_LIMITE) {
      return jsonResponse_({ ok: false, motivo: 'prazo encerrado' });
    }
    if (!dados.nome || !dados.telefone || !dados.email) {
      return jsonResponse_({ ok: false, motivo: 'dados incompletos' });
    }

    const aceites = getOrCreateSheet_('Aceites', ACEITES_HEADER);
    const checkin = getOrCreateSheet_('Checkin', CHECKIN_HEADER);

    // upsert por telefone: mesma pessoa reenviando o formulário atualiza a
    // linha existente em vez de duplicar.
    upsertRow_(aceites, 'telefone', dados.telefone, [
      new Date(),
      dados.nome,
      dados.telefone,
      dados.email,
      dados.declarou_maior_idade,
      dados.aceitou_termos,
      dados.termo_versao,
      dados.protocolo,
      dados.user_agent || '', // front-end não envia esse campo hoje; GAS também não expõe o header. Ver briefing seção 4.2.
    ]);

    upsertRow_(checkin, 'telefone', dados.telefone, [dados.nome, dados.telefone, dados.protocolo]);

    enviarEmailConfirmacao_(dados);
    notificarOrganizacao_(dados);

    return jsonResponse_({ ok: true });
  } catch (err) {
    return jsonResponse_({ ok: false, motivo: String(err) });
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normalizarTelefone_(telefone) {
  return String(telefone || '').replace(/\D/g, '');
}

function getOrCreateSheet_(nome, header) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Atualiza a linha cujo valor na coluna `chaveCol` bate com `chaveValor`
 * (comparando telefones normalizados), ou cria uma linha nova se não existir.
 */
function upsertRow_(sheet, chaveCol, chaveValor, valores) {
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIdx = header.indexOf(chaveCol); // 0-based
  const chaveAlvo = normalizarTelefone_(chaveValor);

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const coluna = sheet.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < coluna.length; i++) {
      if (normalizarTelefone_(coluna[i][0]) === chaveAlvo) {
        sheet.getRange(i + 2, 1, 1, valores.length).setValues([valores]);
        return;
      }
    }
  }
  sheet.appendRow(valores);
}

function enviarEmailConfirmacao_(dados) {
  const corpo = `Oi ${dados.nome.split(' ')[0]}!

Sua presença no RodFest Folia está confirmada. Protocolo: ${dados.protocolo}

Termo aceito (${dados.termo_versao}):
- Uso de imagem para divulgação no @eitalovers e redes sociais
- Responsabilidade por danos causados à propriedade da chácara
- A organização não se responsabiliza por itens pessoais perdidos ou furtados

Data: 18/07/2026, das 09:30 às 22:00.
Qualquer dúvida, chama no grupo do WhatsApp.`;

  GmailApp.sendEmail(dados.email, 'RodFest Folia: confirmação de presença', corpo);
}

/**
 * Self-check manual: rode pelo editor do Apps Script (selecionar esta função
 * → Executar) depois de preencher SHEET_ID. Cria e apaga uma aba temporária,
 * não mexe nos dados reais.
 */
function testeUpsert_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const nomeTeste = '__teste_upsert__';
  if (ss.getSheetByName(nomeTeste)) ss.deleteSheet(ss.getSheetByName(nomeTeste));
  const sheet = getOrCreateSheet_(nomeTeste, ['nome', 'telefone', 'protocolo']);

  upsertRow_(sheet, 'telefone', '(11) 99999-0000', ['Fulano', '(11) 99999-0000', 'RF-1']);
  upsertRow_(sheet, 'telefone', '11999990000', ['Fulano', '11999990000', 'RF-2']); // mesmo telefone, formatação diferente

  const linhas = sheet.getLastRow();
  ss.deleteSheet(sheet);

  if (linhas !== 2) throw new Error('esperava 2 linhas (1 header + 1 dado), veio ' + linhas + ' — upsert duplicou em vez de atualizar');
  Logger.log('testeUpsert_ ok: upsert por telefone normalizado funcionando.');
}

function notificarOrganizacao_(dados) {
  const corpo = `Novo aceite registrado.

Nome: ${dados.nome}
WhatsApp: ${dados.telefone}
E-mail: ${dados.email}
Protocolo: ${dados.protocolo}
Aceito em: ${dados.aceito_em}`;

  GmailApp.sendEmail(EMAIL_ORGANIZACAO, `RodFest: ${dados.nome} confirmou presença`, corpo);
}
