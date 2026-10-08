# Artigos com ajustes e newsletter pelo frontend

Cockpit: https://abrev-agentes.tiny-book-1851.chatgpt.site

Versão publicada: 51. Fonte do frontend: `ea7c22e7395aef7f421d51ea2dd9f81cb9005950`.

## Como usar

1. Abra **Atualização do Site/Blog**, escolha **Blog → Nova publicação** e anexe o estudo original em PDF ou selecione um documento já indexado na Biblioteca.
2. Informe o objetivo e clique **Criar artigo e auditar**. Quando faltar informação essencial, responda às perguntas apresentadas antes da produção.
3. Confira a prévia institucional no protocolo. Em **Solicitar ajustes no artigo**, comente o que deve mudar e clique **Enviar ajustes e recriar o artigo**. O agente recebe a versão anterior, o PDF original e o histórico de comentários; cada nova versão passa pelo Auditor independente. Versões anteriores ficam preservadas.
4. Use **Publicar no blog** ou **Publicar ajustes no blog** para encaminhar a versão aprovada. A fila assinada é consultada a cada cinco minutos. O protocolo só mostra **Publicado** depois da comprovação do HTML, destaque no índice e PDF original no ar.
5. Depois da publicação verificada, use **Enviar newsletter aos inscritos** para solicitar o disparo. O status e o comprovante ficam no mesmo protocolo. Revisões e publicação não disparam newsletter automaticamente.

## Revisões publicadas

O endereço e o PDF original são preservados, mesmo quando o título muda. Artigo e cartão do índice são atualizados juntos. O executor compara os hashes da base publicada antes de escrever; alterações externas divergentes bloqueiam a revisão. Recibos de publicação são separados por protocolo e hash editorial.

## Envio e prevenção de duplicidade

`newsletter-cockpit.yml` verifica a fila assinada e usa os segredos de Apps Script já configurados no GitHub. A seleção continua restrita aos inscritos ativos da Comunidade; cadastros de teste não entram no envio. Registra uma campanha imutável antes de chamar o serviço de email. Um registro anterior nunca provoca novo disparo automático. Resposta perdida ou timeout após o disparo mostram estado incerto; resultado parcial conserva os números reais.

Comprovantes públicos contêm identificadores de campanha, quantidades e execução, sem endereços de destinatários ou segredos. O frontend só aceita resultados de uma execução concluída com sucesso do workflow exato da newsletter.

A campanha anterior de Ângelo já foi enviada a 7 inscritos e aparece como concluída: https://github.com/Abrev-IA/abrev-site/actions/runs/37797344863 . Nenhum novo disparo dessa campanha foi feito para testar a integração.

## Validação desta entrega

Testes automatizados de criação/revisão com Auditor, preservação do texto anterior, renderização da prévia e comentários, publicação separada, assinatura das filas, proteção da base publicada, bloqueio de campanhas repetidas, timeout, envio parcial e comprovação. Typecheck e build de produção concluídos. A validação de envio da nova integração utiliza serviço de email simulado; a verificação operacional lê a fila sem criar campanha de teste para inscritos reais. Navegação autenticada no browser não foi realizada nesta entrega.


Verificação operacional concluída em 08/10/2026: [execução 37853012981](https://github.com/Abrev-IA/abrev-site/actions/runs/37853012981) terminou com sucesso. Os oito testes do executor passaram e a consulta da fila retornou zero solicitações de envio, sem novo disparo. O frontend respondeu HTTP 200; endpoints de fila responderam HTTP 200 e a rota de newsletter do protocolo exigiu login (HTTP 401 sem sessão).
