# Associação — notificar a diretoria por e-mail

Quando alguém preenche o formulário **"Quer se tornar associado"** (Google Forms
embutido em `comunidade.html`), a solicitação deve ser enviada por e-mail para a
diretoria avaliar. Como é um Google Forms, isso é feito por um **script vinculado
ao próprio formulário** (`NotificarDiretoria.gs`), com um gatilho *ao enviar*.

## Destinatário

`CONFIG.DESTINO = 'administradorabrev@gmail.com'` (por enquanto) — troque aqui se
mudar o avaliador (ex.: `mauricio.baum@confi.com.vc`).

O e-mail vai com **responder-para (reply-to)** no e-mail do candidato (quando o
formulário coleta e-mail), então a diretoria responde direto para a pessoa.

## Instalação (uma vez)

1. Abra o formulário no modo edição → **⋮ → Editor de scripts** (ou **Extensões →
   Apps Script**).
2. Cole `NotificarDiretoria.gs` e salve.
3. Rode a função **`instalarAcionador`** (▶) e autorize os escopos. Ela cria o
   gatilho *"ao enviar formulário"* (idempotente — não duplica).
4. Envie um teste e confira a caixa de `mauricio.baum@confi.com.vc`.

## Observações

- O script roda na conta dona do formulário (`administradorabrev@gmail.com`) e
  usa `MailApp` (cota diária padrão do Gmail).
- Formulário atual embutido em `comunidade.html`:
  `13FazuXu3I0pqSMSQH_SINEUUknyK-MbYnwsGfAdPszw`
  (título atual: *"CONFIRMAÇÃO DE PARTICIPAÇÃO — ABREV"* — confirmar se é mesmo o
  formulário de associação).
