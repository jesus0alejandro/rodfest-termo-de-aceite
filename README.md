# RodFest Folia — backend do termo de aceite

Backend em Google Apps Script (`Código.js`) para o ticket `termo.html`. O texto e o visual do termo não foram alterados além do que foi pedido (4ª cláusula, versão v1.1).

## Deploy do backend (logado como eitaloversrodfestfolia@gmail.com)

1. **Criar a planilha**: sheets.google.com → planilha em branco → renomear para `Aceites RodFest`.
2. **Pegar o ID**: na URL `https://docs.google.com/spreadsheets/d/ESTE_TRECHO/edit`, copie `ESTE_TRECHO`.
3. **Colar o código**: na planilha, `Extensões → Apps Script`, apague o conteúdo do editor e cole todo o [`Código.js`](Código.js) — ou use `clasp push` (veja `.clasp.json`, já configurado com o `scriptId` do projeto).
4. **Configurar o ID**: no topo do `Código.js`, troque `SHEET_ID` pelo ID copiado no passo 2. Salve.
5. **Publicar como Web App**: `Implantar → Nova implantação` → tipo `App da Web`.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
   - Implantar → autorizar as permissões pedidas (Sheets + Gmail) → copiar a URL do Web App.
6. **Ligar o front-end**: cole essa URL na constante `GAS_ENDPOINT` dentro de `termo.html`. É usada só pra receber o POST do formulário — quem serve a página é o GitHub Pages (seção abaixo), não o Apps Script.
7. **Testar**: preencha o formulário no navegador e confira:
   - linha nova nas abas `Aceites` e `Checkin` (criadas automaticamente no primeiro envio);
   - e-mail de confirmação chegando no e-mail do convidado, com o brasão e as 4 cláusulas completas;
   - notificação chegando em `eitaloversrodfestfolia@gmail.com`.
   - Reenvie com o mesmo telefone → a linha deve ser **atualizada**, não duplicada.

Self-checks (rodar no editor do Apps Script, seletor de função → Executar): `testeUpsert_` (upsert por telefone) e `testeEmailHtml_` (template de e-mail e brasão).

## Hospedar o ticket no GitHub Pages (recomendado — sem barra azul, URL limpa)

O Apps Script mostra sempre uma barra "Este aplicativo foi criado por um usuário do Google Apps Script" em páginas servidas por `doGet`/`HtmlService`, e a URL (`.../macros/s/ID/exec`) não é customizável — isso é uma limitação da plataforma, não tem flag de código que tire. A solução é servir o `termo.html` por fora do Apps Script, que continua existindo só para o `doPost`.

1. Repositório **precisa ser público** (GitHub Pages grátis não funciona em repositório privado).
   ```bash
   cd "/Users/macbookjesus/Desktop/Termo de aceite rodfest 2026"
   brew install gh          # se ainda não tiver
   gh auth login
   gh repo create rodfest-termo-de-aceite --public --source=. --push
   ```
   Sem `gh`: crie o repositório vazio (público) em github.com/new e rode:
   ```bash
   git remote add origin git@github.com:SEU_USUARIO/rodfest-termo-de-aceite.git
   git branch -M main
   git push -u origin main
   ```
2. No GitHub, `Settings → Pages → Deploy from a branch` → branch `main`, pasta `/ (root)` → Save.
3. Depois de alguns minutos a página fica em `https://SEU_USUARIO.github.io/rodfest-termo-de-aceite/termo.html`. É essa URL que vai pro grupo do WhatsApp.
4. Sempre que editar `termo.html`, `git add`, `git commit`, `git push` — o GitHub Pages atualiza sozinho.

Não tem segredo nenhum exposto nesse repositório: `SHEET_ID` e a lógica de e-mail ficam só no `Código.js`, que mora no Apps Script (não é servido publicamente como arquivo).

## Alternativa: hospedar o ticket no próprio Apps Script

Só use isso se não quiser mexer com GitHub — tem a barra azul e a URL feia, mas funciona:

1. No editor do Apps Script (mesmo projeto do `Código.js`): `Arquivo → Novo → Arquivo HTML`, nomeie exatamente `termo`.
2. Copie o conteúdo de [`termo.html`](termo.html) pra dentro desse arquivo (ou `clasp push`, que já sincroniza os dois).
3. O `doGet(e)` já está no `Código.js` e serve esse arquivo automaticamente.
4. `Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão → Implantar`.
5. A mesma URL `/exec` serve o ticket (GET) e recebe o formulário (POST).
6. Aponte `GAS_ENDPOINT` (dentro do arquivo `termo` colado no Apps Script) pra essa mesma URL `/exec`, repita o passo 4.

## Uso no dia da festa (check-in)

Abra a aba **Checkin** da planilha `Aceites RodFest` no celular/tablet da entrada. Ela tem só `nome | telefone | protocolo`. Use `Ctrl+F`/`Cmd+F` para buscar o telefone da pessoa, ou `Dados → Criar filtro` para ordenar/filtrar por nome.

## Notas

- **Prazo**: o backend rejeita aceites depois de `2026-07-17T23:59:00-03:00` mesmo que alguém burle a validação do front-end (retorna `{ok:false, motivo:"prazo encerrado"}`).
- **user_agent**: fica vazio — o front-end atual não envia esse campo e o Apps Script não expõe o header da requisição. Não dá pra preencher sem alterar o HTML (fora de escopo aqui) ou colocar um proxy na frente do GAS (over-engineering para este caso, ver briefing seção 4.2 sobre a mesma limitação do IP).
- **Retenção de dados**: defina uma data para apagar/anonimizar a planilha depois do evento (checklist de LGPD do briefing, seção 5) — isso é uma decisão manual do responsável, não algo que o código resolve sozinho.
