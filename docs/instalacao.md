# Instalação

## Requisitos

- Node.js 20 ou superior
- Acesso de saída a `https://encontreadvogados.co.mz` na primeira leitura do índice

Não é necessário `npm install`. O projecto não tem dependências de pacotes.

## Desenvolvimento

Na pasta do projecto:

```bash
npm test
npm start
```

O servidor escuta em `http://127.0.0.1:8787` e serve ao mesmo tempo a interface e a API.

Na primeira execução, o arranque lê o índice público. Os pedidos seguintes usam a cache local durante o prazo definido em `CACHE_TTL_HOURS` (6 horas, se nada for alterado). A cache fica em `data/cache/` e não entra no Git.

## Variáveis

Copie `.env.example` para `.env` se quiser mudar a porta, ligar um modelo ou restringir a origem do browser.

| Variável | Função |
| --- | --- |
| `PORT` | Porta HTTP. Omissão: `8787`. |
| `SOURCE_API_BASE` | API pública de leitura do directório. |
| `CACHE_FILE` e `CACHE_TTL_HOURS` | Cache do índice factual. |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | Modelo compatível com a API de chat. Vazio desliga o modelo. |
| `ALLOWED_ORIGIN` | Origem do frontend quando está noutro domínio. Vazio serve só o mesmo servidor. |
| `TRUST_PROXY` | `true` apenas atrás de um proxy que defina `X-Forwarded-For`. |
| `RATE_LIMIT` e `RATE_WINDOW_MS` | Tecto de recomendações por endereço. |
| `ENRICH_CONTACTS` | `false` deixa de ler o telefone publicado no perfil. |
| `EXCLUDE_SLUGS` | Perfis a omitir, separados por vírgulas. |

A chave do modelo fica só no ambiente do servidor. O browser nunca a recebe.

## Testes

```bash
npm test
```

Os testes não contactam o directório nem um modelo. Usam perfis de exemplo e verificam a classificação, a ordem, a privacidade do índice, o limite de pedidos e a página.

## Contentor

```bash
docker build -t jurifind .
docker run --rm -p 8787:8787 -e LLM_API_KEY=%LLM_API_KEY% jurifind
```

No contentor, defina `ALLOWED_ORIGIN` se o site público estiver noutro endereço.
