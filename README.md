# Ciranda

Ciranda e o modulo independente de videoconferencia da **Plataforma Fermento - Gestao Sociocultural**.

Ambiente de teste:

```text
https://ciranda.fermentocultural.com.br
```

## Escopo desta versao

Esta entrega cria uma base incremental para transformar a pagina inicial em uma aplicacao real de videoconferencia da Fermento Cultural, preservando o WebRTC direto que ja funcionava.

Inclui:

- lista de salas fixas persistidas;
- criacao de sala fixa com slug permanente;
- tela de configuracoes, historico, arquivos e Google Drive da sala;
- criacao de uma sessao separada para cada reuniao;
- entrada na sala a partir de uma sala fixa;
- captura local de audio/video via navegador;
- conexao WebRTC direta entre duas pessoas na mesma sala;
- sinalizacao simples no proprio servidor Node do Ciranda;
- participantes conectados;
- chat de texto dentro da sala;
- controles de microfone, camera, compartilhamento de tela, legendas, traducao, audio de traducao e sair;
- rota tecnica `/health`;
- porta configuravel por variavel de ambiente, com padrao `3002`;
- servicos abstratos para gravacao, transcricao, traducao e Google Drive.

## Stack atual

Frontend:

- HTML, CSS e JavaScript puro em `public/`;
- sem framework frontend nesta etapa;
- Web Speech API no navegador para legenda/traducao experimental;
- WebRTC direto pelo navegador para audio/video.

Backend:

- Node.js com servidor HTTP nativo em `server.js`;
- rotas JSON para salas fixas e sinalizacao WebRTC;
- armazenamento local em JSON por enquanto;
- migrations SQL documentadas para migracao futura para banco relacional.

Nao ha autenticacao, banco externo, LiveKit, Egress ou Google Drive real configurados ainda.

## Requisitos

- Node.js 18 ou superior.
- npm.
- HTTPS no ambiente publico para camera/microfone funcionarem corretamente nos navegadores.

## Instalacao

```bash
npm install
```

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

## Deploy com PM2

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
pm2 save
```

## Deploy automatico com GitHub Actions

O workflow `.github/workflows/deploy.yml` roda em push para `main` e tambem pode ser acionado manualmente pela aba **Actions** do GitHub.

Secrets necessarios:

```text
CIRANDA_SSH_HOST
CIRANDA_SSH_USER
CIRANDA_SSH_KEY
```

O deploy automatico executa na VPS:

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

## Persistencia

Nesta etapa, o Ciranda usa armazenamento local em JSON para viabilizar salas fixas sem exigir um banco externo imediatamente.

Por padrao:

```text
data/ciranda-store.json
```

Esse arquivo nao deve ser commitado. Ele fica na VPS e guarda:

- `video_rooms`
- `video_room_members`
- `video_sessions`
- `video_session_participants`
- `video_recordings`
- `video_transcripts`
- `video_captions`

Variaveis opcionais:

```text
CIRANDA_DATA_DIR=/var/lib/ciranda
CIRANDA_STORE_FILE=/var/lib/ciranda/ciranda-store.json
```

## Migrations

O arquivo `migrations/001_ciranda_video_schema.sql` documenta a estrutura SQL segura para uma futura migracao para banco relacional.

Ele cria, sem destruir dados:

- `video_rooms`
- `video_room_members`
- `video_sessions`
- `video_session_participants`
- `video_recordings`
- `video_transcripts`
- `video_captions`

## Salas fixas e sessoes

A sala fixa e um registro permanente. Ela possui slug, nome, descricao, cliente/projeto, politica de gravacao e `drive_folder_id`.

Cada vez que alguem entra numa sala fixa, o backend cria uma `video_session` com um `technical_room_id`. Esse ID tecnico e usado pelo WebRTC atual. Assim, a sala fixa nao depende da chamada continuar aberta.

## Google Drive, gravacao e transcricao

Os servicos existem como camada isolada:

```text
src/services/google-drive.js
src/services/recording.js
src/services/transcription.js
```

Se a sala nao tiver `drive_folder_id`, os arquivos ficam marcados como `local_pending_sync`.

Gravacao e transcricao ainda estao em modo `pending_provider`, prontos para receber LiveKit Egress, Whisper, Google Speech-to-Text, LiveKit Agents ou outro provedor depois.

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
CIRANDA_DATA_DIR=/var/lib/ciranda
```

## WebRTC direto

O Ciranda usa uma sinalizacao simples no proprio `server.js`:

- `POST /api/join`
- `POST /api/signal`
- `GET /api/messages`
- `POST /api/leave`

Essa versao foi pensada para validar a chamada direta entre duas pessoas, mantendo o projeto sem SDK externo, sem token e sem segredo.

## Regras do projeto

- Nao mexer em `ceceorio/fermcic`.
- Nao mexer em `ceceorio/fermento-site`.
- Manter o Ciranda independente.
- Nao commitar `.env` real.
- Nao inserir chaves, tokens ou segredos no codigo.
