# AGENTS.md — Ciranda

Este repositório contém o Ciranda, módulo independente de videoconferência da Fermento Cultural.

## Objetivo principal

Desenvolver uma aplicação separada para testes e publicação em:

```txt
ciranda.fermentocultural.com.br
```

## Repositórios que NÃO devem ser alterados

Não alterar, clonar para dentro, reescrever ou integrar diretamente estes repositórios nesta fase:

- `ceceorio/fermcic`
- `ceceorio/fermento-site`

O Ciranda deve permanecer independente até decisão expressa de integração.

## Diretrizes técnicas

- Criar uma aplicação Node/React ou Next.js adequada para deploy em VPS.
- Preparar scripts claros de `dev`, `build` e `start`.
- Usar uma porta interna configurável por variável de ambiente, com sugestão padrão `3002`.
- Preparar o projeto para execução via PM2 com o nome `ciranda`.
- Documentar comandos de instalação e deploy no README quando forem definidos.
- Criar `.env.example` sempre que novas variáveis forem necessárias.
- Nunca commitar `.env` real.

## Diretrizes de segurança

- Não inserir segredos no código.
- Não commitar tokens de LiveKit, API keys, senhas SMTP, credenciais de banco, JWT secrets ou URLs privadas.
- Não criar migrações destrutivas sem autorização explícita.
- Não apagar arquivos existentes sem justificar no pull request.
- Preferir mudanças pequenas, rastreáveis e reversíveis.

## Produto

O Ciranda deve ser tratado como uma sala de videoconferência própria da Fermento Cultural, com identidade visual distinta e possibilidade futura de integração ao sistema principal.

Prioridades de produto:

1. Aplicação independente funcional.
2. Interface limpa, moderna e confortável para uso prolongado.
3. Estrutura preparada para LiveKit ou tecnologia equivalente.
4. Possibilidade futura de gravação, biblioteca de gravações, legendas e acessibilidade.
5. Documentação clara para deploy em `ciranda.fermentocultural.com.br`.

## Fluxo de trabalho

- Trabalhar em branch antes de propor mudanças grandes.
- Abrir pull request para revisão quando possível.
- Explicar no PR o que foi alterado, como testar e quais riscos existem.
- Não fazer integração com produção sem revisão humana.
