# Ciranda

Ciranda e o modulo independente de videoconferencia da **Plataforma Fermento - Gestao Sociocultural**.

Ambiente de teste:

```text
https://ciranda.fermentocultural.com.br
```

## Escopo desta versao

Esta primeira entrega cria uma base funcional e independente com:

- tela de entrada da sala;
- campo para nome do participante;
- campo para nome da sala;
- estrutura visual de sala de video;
- captura local de audio/video via navegador;
- conexao WebRTC direta entre duas pessoas na mesma sala;
- sinalizacao simples no proprio servidor Node do Ciranda;
- participantes conectados;
- chat de texto dentro da sala;
- controles de microfone, camera, compartilhamento de tela, legendas, traducao, audio de traducao e sair;
- rota tecnica `/health`;
- porta configuravel por variavel de ambiente, com padrao `3002`;
- estrutura WebRTC direta, sem SDK externo nesta primeira entrega.

## Requisitos

- Node.js 18 ou superior.
- npm.
- HTTPS no ambiente publico para camera/microfone funcionarem corretamente nos navegadores.

## Instalacao

```bash
npm install
```

> A versao atual nao possui dependencias externas, mas `npm install` deve ser mantido no fluxo da VPS para compatibilidade com proximas entregas.

## Build

```bash
npm run build
```

O build copia os arquivos de `public/` para `dist/`.

## Start

```bash
npm start
```

Por padrao a aplicacao sobe na porta `3002`.

Para usar outra porta:

```bash
PORT=3002 npm start
```

## Health check

```bash
curl http://localhost:3002/health
```

Resposta esperada:

```json
{
  "ok": true,
  "service": "ciranda",
  "status": "healthy",
  "timestamp": "..."
}
```

## Deploy automatico com GitHub Actions

O repositorio possui o workflow `.github/workflows/deploy.yml`.

Ele roda automaticamente quando houver push na branch `main` e tambem pode ser executado manualmente pela aba **Actions** do GitHub.

Configure estes secrets no GitHub, em **Settings > Secrets and variables > Actions**:

```text
CIRANDA_SSH_HOST=IP ou host da VPS
CIRANDA_SSH_USER=usuario SSH da VPS, por exemplo root
CIRANDA_SSH_KEY=chave privada SSH autorizada na VPS
```

O workflow faz:

```bash
cd /var/www/ciranda
git fetch origin
git reset --hard origin/main
rm -rf dist
npm install
npm run build
PORT=3002 pm2 restart ciranda --update-env
pm2 save
```

## Deploy manual com PM2

Exemplo:

```bash
npm install
npm run build
PORT=3002 pm2 start server.js --name ciranda
pm2 save
```

Para reiniciar depois de uma atualizacao:

```bash
npm install
npm run build
PORT=3002 pm2 restart ciranda --update-env
```

Se a VPS estiver com aviso de branches divergentes por causa de publicacao anterior, use dentro de `/var/www/ciranda`:

```bash
git fetch origin
git reset --hard origin/main
npm install
npm run build
PORT=3002 pm2 restart ciranda --update-env
```

## Nginx

O Nginx deve fazer proxy do subdominio para a porta interna `3002`.

Exemplo conceitual:

```nginx
server {
  server_name ciranda.fermentocultural.com.br;

  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Variaveis de ambiente

Use `.env.example` como referencia. Nao commitar `.env` real.

```text
PORT=3002
PUBLIC_STUN_URL=stun:stun.l.google.com:19302
```

## WebRTC direto

O Ciranda usa uma sinalizacao simples no proprio `server.js`:

- `POST /api/join`
- `POST /api/signal`
- `GET /api/messages`
- `POST /api/leave`

Essa primeira versao foi pensada para validar a chamada direta entre duas pessoas, mantendo o projeto sem SDK externo, sem token e sem segredo.

Observacao importante: esta versao usa STUN publico para ajudar dois navegadores a se encontrarem. Em algumas redes, principalmente 4G/5G corporativo ou roteadores mais fechados, uma chamada WebRTC direta pode precisar de TURN. Isso nao exige LiveKit, mas exige um servidor TURN proprio ou contratado.

## Regras do projeto

- Nao mexer em `ceceorio/fermcic`.
- Nao mexer em `ceceorio/fermento-site`.
- Manter o Ciranda independente.
- Nao commitar `.env` real.
- Nao inserir chaves, tokens ou segredos no codigo.
