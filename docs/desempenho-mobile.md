# Imagens e navegação móvel — novembro de 2026

## Alterações

- Cinco fotos da home com `srcset` de 480, 768, 1200 e 1600 px e `sizes` por layout.
- Qualidade de imagem 72, mantendo as fotografias e os endereços de origem.
- Imagem principal com prioridade alta; as outras quatro usam carregamento tardio.
- Dimensões intrínsecas da marca nas páginas públicas, preservando proporção com CSS.
- Botão secundário com fundo transparente para manter contraste com o texto branco.
- Menu móvel com área de toque mínima, limite de altura e rolagem, estado ARIA
  sincronizado ao fechar por link, clique externo, Escape ou mudança de breakpoint.
- Carregamento da lista completa de imprensa somente ao aproximar a seção da tela.
  Os links estáticos permanecem disponíveis se houver falha de rede.
- Conteúdo da home visível por padrão, mesmo sem JavaScript/IntersectionObserver.
- Links do rodapé separados visualmente.

## Evidência de tamanho

Comparação por download HTTP dos cinco arquivos anteriores e suas variantes de
480 px, sem contar cabeçalhos HTTP ou benefício de cache:

| Foto/uso | Antes (bytes) | Variante de 480 px (bytes) |
| --- | ---: | ---: |
| Foto principal | 248901 | 42327 |
| Centro logístico | 279511 | 45259 |
| Operação e varejo | 192728 | 58990 |
| Faixa de reuso | 308688 | 42327 |
| Faixa logística | 251259 | 45259 |
| Total | 1281087 | 234162 |

Redução aproximada de 82% nessa comparação. O navegador escolhe arquivos maiores
conforme largura e densidade da tela; o percentual não representa ganho total de
velocidade, Core Web Vitals ou nota Lighthouse. As fotos repetidas podem compartilhar
cache porque as variantes agora usam os mesmos endereços.

## Verificação

Na prévia com viewport móvel de 390 px, o navegador selecionou as variantes de
480 px e não apresentou rolagem horizontal da página. Menu testado com abertura,
Escape e navegação por link. Seis reportagens carregaram ao aproximar o carrossel.
Prévia desktop de 1280 px verificada visualmente, com marca proporcional e fotos.
Links, recursos locais, canonical e JSON-LD verificados nas 12 páginas públicas.
Testes existentes de Analytics e publicação passaram.

A tentativa de consulta ao PageSpeed Insights retornou HTTP 429 (limite do
serviço). Não há nota auditada de Lighthouse nem medição nova de LCP, INP ou CLS.
