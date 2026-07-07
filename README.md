# RodFest Folia — backend do termo de aceite

Backend em Google Apps Script para o `rodfest_termo_de_embarque.html`. Nada no HTML foi alterado.

## Deploy (logado como eitaloversrodfestfolia@gmail.com)

1. **Criar a planilha**: sheets.google.com → planilha em branco → renomear para `Aceites RodFest`.
2. **Pegar o ID**: na URL `https://docs.google.com/spreadsheets/d/ESTE_TRECHO/edit`, copie `ESTE_TRECHO`.
3. **Colar o código**: na planilha, `Extensões → Apps Script`, apague o conteúdo do editor e cole todo o [`Code.gs`](Code.gs).
4. **Configurar o ID**: no topo do `Code.gs`, troque `SHEET_ID` pelo ID copiado no passo 2. Salve.
5. **Publicar como Web App**: `Implantar → Nova implantação` → tipo `App da Web`.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
   - Implantar → autorizar as permissões pedidas (Sheets + Gmail) → copiar a URL do Web App.
6. **Ligar o front-end**: cole essa URL na constante `GAS_ENDPOINT` dentro de `rodfest_termo_de_embarque.html`. É a única edição feita nesse arquivo.
7. **Testar**: preencha o formulário no navegador e confira:
   - linha nova nas abas `Aceites` e `Checkin` (criadas automaticamente no primeiro envio);
   - e-mail de confirmação chegando no e-mail do convidado;
   - notificação chegando em `eitaloversrodfestfolia@gmail.com`.
   - Reenvie com o mesmo telefone → a linha deve ser **atualizada**, não duplicada.

Se quiser rodar o self-check antes de ir para produção: abra o Apps Script, selecione a função `testeUpsert_` no seletor de funções e clique em Executar (cria e apaga uma aba temporária).

## Hospedar o ticket no próprio Apps Script (sem GitHub Pages)

1. No editor do Apps Script (mesmo projeto do `Code.gs`): `Arquivo → Novo → Arquivo HTML`, nomeie exatamente `termo` (vira `termo.html` internamente).
2. Copie todo o conteúdo de [`termo.html`](termo.html) (cópia idêntica do HTML aprovado) para dentro desse arquivo.
3. O `doGet(e)` já está no `Code.gs` e serve esse arquivo automaticamente.
4. `Implantar → Gerenciar implantações → ✏️ (editar a implantação existente) → Versão: Nova versão → Implantar`. Isso atualiza o código sem trocar a URL.
5. Essa mesma URL (a que termina em `/exec`) agora serve o ticket (GET) **e** recebe o formulário (POST) — é uma coisa só.
6. Edite `GAS_ENDPOINT` dentro do arquivo `termo` (o que está colado no Apps Script) para essa mesma URL `/exec`, e repita o passo 4 (nova versão) pra salvar.
7. Abra a URL `/exec` num navegador pra conferir que o ticket aparece certinho e teste o envio do formulário de novo.

Nota: o Apps Script carrega páginas HTML dentro de um iframe (`HtmlService`). Isso normalmente não muda nada visualmente, mas se notar algum comportamento estranho de zoom/viewport no celular, a alternativa é hospedar o mesmo `termo.html` sem alteração nenhuma no GitHub Pages (ver seção abaixo) — o backend (`doPost`) continua o mesmo de qualquer forma.

## Subir pro GitHub (portfólio)

Isso é só pra ter o projeto no seu GitHub — o hospedado de verdade continua sendo o Apps Script. Rode no terminal, dentro desta pasta:

```bash
git init
git add Code.gs README.md termo.html
git commit -m "RodFest Folia: termo de aceite + backend Apps Script"
gh repo create rodfest-termo-de-aceite --private --source=. --push
```

Se não tiver o `gh` (GitHub CLI) instalado: `brew install gh` e depois `gh auth login` (ele abre o navegador pra você logar). Sem `gh`, o caminho manual é: criar o repositório vazio em github.com/new, e então:

```bash
git remote add origin git@github.com:SEU_USUARIO/rodfest-termo-de-aceite.git
git branch -M main
git push -u origin main
```

(Se nunca configurou SSH com o GitHub, use a URL `https://github.com/SEU_USUARIO/rodfest-termo-de-aceite.git` no lugar da `git@...` — o Git vai pedir login na primeira vez. No caminho manual, marque "Private" na hora de criar o repositório em github.com/new.)

## Uso no dia da festa (check-in)

Abra a aba **Checkin** da planilha `Aceites RodFest` no celular/tablet da entrada. Ela tem só `nome | telefone | protocolo`. Use `Ctrl+F`/`Cmd+F` para buscar o telefone da pessoa, ou `Dados → Criar filtro` para ordenar/filtrar por nome.

## Notas

- **Prazo**: o backend rejeita aceites depois de `2026-07-17T23:59:00-03:00` mesmo que alguém burle a validação do front-end (retorna `{ok:false, motivo:"prazo encerrado"}`).
- **user_agent**: fica vazio — o front-end atual não envia esse campo e o Apps Script não expõe o header da requisição. Não dá pra preencher sem alterar o HTML (fora de escopo aqui) ou colocar um proxy na frente do GAS (over-engineering para este caso, ver briefing seção 4.2 sobre a mesma limitação do IP).
- **Retenção de dados**: defina uma data para apagar/anonimizar a planilha depois do evento (checklist de LGPD do briefing, seção 5) — isso é uma decisão manual do responsável, não algo que o código resolve sozinho.
