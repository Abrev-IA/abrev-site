# Medição de contatos e solicitações — ABREV

Propriedade GA4: `553013769`. Fluxo ABREV: `15730815539`.
ID de medição: `G-D2D314Q1CQ`.

## Eventos

| Evento | Gatilho | Significado |
| --- | --- | --- |
| `abrev_contact_click` | Clique em e-mail, telefone ou WhatsApp | Intenção de contato; não comprova mensagem enviada. |
| `abrev_chat_open` | API do Tidio disponível e janela aberta | Abertura do atendimento; não comprova conversa ou lead. |
| `abrev_collaboration_click` | Clique para Google Forms | Saída para formulário externo; não comprova envio. |
| `abrev_registration_start` | Primeiro foco em um campo de cada formulário por carregamento | Início do preenchimento. |
| `abrev_registration_request` | POST resolvido pelo navegador após validação | Solicitação enviada com resposta opaca; `delivery_status=unconfirmed`. |
| `abrev_registration_error` | POST rejeitado por falha de rede | Falha de envio detectável pelo navegador. |

`form_id`: `community`, `study` ou `event`.
`contact_method`: `email`, `phone`, `whatsapp`, `chat` ou `google_forms`.
`link_placement`: `header`, `footer`, `central` ou `content`.
Os parâmetros usam listas fechadas. Nenhum evento lê nome, e-mail, telefone,
mensagem, texto do link, URL de destino ou assunto de e-mail para o Analytics.
O `page_location` padrão exclui query string e fragmento.

## Consentimento e contagem

Eventos `abrev_*` exigem `abrev_cookie_consent=accepted`. Eventos anteriores ao
consentimento não ficam em fila para envio posterior. Revogar bloqueia os novos
eventos. A tag base mantém o Consent Mode já existente, inicialmente negado.
Prévias e localhost não carregam a tag.

No GA4, `abrev_registration_request` é evento principal por ocorrência, sem valor
monetário padrão. `abrev_contact_click` é evento principal uma vez por sessão,
também sem valor monetário. Os cliques continuam disponíveis na contagem de
eventos, além da contagem de sessões com intenção de contato.

## Limites

Os POSTs do Apps Script usam `mode:no-cors`: a resposta é opaca. Não é possível
confirmar por esse retorno que houve gravação na planilha, entrega de e-mail ou
inclusão de um novo inscrito. Duplicados e erros de aplicação também não são
identificáveis pelo navegador. Por isso não se dispara `sign_up` ou
`generate_lead` como confirmação de cadastro. Para contagem de cadastros
efetivados, conciliar os registros do backend ou adicionar confirmação autenticada
por requisição no serviço de cadastros em uma evolução específica.

Google Forms e conversas do Tidio não são inspecionados para inferir conclusão.
Não se interceptam respostas de formulários externos.

## Validação e acompanhamento

Executar `node --test tests/analytics.test.cjs` para consentimento, inicialização,
sanitização, links, início único e falhas/sucesso de transporte do evento.
Os testes usam rede simulada e não enviam cadastro, e-mail ou newsletter.

No GA4, usar Tempo real para verificar chegada dos eventos; nos relatórios,
comparar usuários/sessões, inícios, solicitações enviadas e erros por página.
O total de solicitações não equivale a pessoas únicas nem cadastros confirmados.
Eventos novos podem levar tempo para aparecer nos relatórios consolidados.
