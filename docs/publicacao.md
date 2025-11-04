# Publicação

Este documento explica como publicar o projecto. A existência destes passos no repositório não confirma que já tenham sido executados.

## Código no GitHub

O GitHub não aceita a palavra-passe da conta para `git push`. Use o início de sessão do GitHub CLI ou um token pessoal, e não grave segredos no repositório.

```bash
gh auth login
gh repo create jurifind --source=. --public --remote=origin --push
```

Se o repositório já existir:

```bash
git remote add origin https://github.com/SEU_UTILIZADOR/jurifind.git
git push -u origin main
```

O fluxo `.github/workflows/ci.yml` corre `npm test` em cada push e em cada pull request.

## Frontend no GitHub Pages

O fluxo `.github/workflows/pages.yml` publica apenas a pasta `web/`. Antes de o activar:

1. No repositório, em Settings → Pages, escolha GitHub Actions como fonte.
2. Crie a variável de repositório `JURIFIND_API_BASE` com o endereço público da API, por exemplo `https://jurifind.example.com`. Sem esta variável, a página abre e a recomendação fica no mesmo domínio, o que no Pages não tem API.
3. Faça push para `main`.

O Pages não executa `src/server.js`.

## Backend

O processo Node tem de correr noutro serviço. O `Dockerfile` serve a interface e a API juntas. O `render.yaml` descreve um serviço web na Render, sem o criar automaticamente.

Variáveis mínimas em produção:

- `NODE_ENV=production`
- `TRUST_PROXY=true` se a plataforma colocar um proxy à frente
- `ALLOWED_ORIGIN` com a origem exacta do Pages, se o site e a API estiverem em domínios diferentes
- `LLM_API_KEY` só se quiser o modelo

Confirme `GET /api/health` antes de apontar o frontend para o serviço. `indexReady` deve ficar `true` depois da primeira leitura do directório.

## Domínio .co.mz, DNS e HTTPS

Não há domínio configurado por este repositório.

Só avance se o domínio estiver registado e for controlado por si:

1. Crie o registo DNS que a plataforma indicar. No GitHub Pages, isso é normalmente um `CNAME` para `SEU_UTILIZADOR.github.io` ou os registos `A`/`AAAA` documentados pelo GitHub.
2. Só então acrescente o ficheiro `web/CNAME` com o nome do domínio, sem `https://`.
3. Active o domínio nas definições do Pages e espere pelo certificado HTTPS.
4. Se a API estiver noutro nome, inclua `https://o-seu-dominio` em `ALLOWED_ORIGIN`.
5. Confirme no browser que o cadeado está válido e que uma recomendação devolve perfis de `encontreadvogados.co.mz`.

Não anuncie o domínio, o Pages ou a API como publicados sem esta verificação.
