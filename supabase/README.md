# Banco do painel SESMT

Os cadastros de **equipes** e **inspetores** ficam no Supabase. O resto do
painel (inspeções, não conformidades, calendário) continua embutido no HTML.

Se o banco não responder, o painel abre com os cadastros de `web/data.js`
e avisa na aba Ajustes. Ninguém fica sem o painel por causa de rede.

## Arquivos

| Arquivo | Quando rodar |
|---|---|
| `01-esquema-sesmt.sql` | No projeto **novo**, uma vez. Cria tabelas, segurança e carga inicial. |
| `02-acesso-de-administrador.sql` | Para incluir ou remover administradores. |
| `03-remover-do-controle-leite.sql` | No projeto **antigo**, depois que o novo estiver no ar. |

Todos podem ser rodados mais de uma vez sem duplicar nada.

## Separar do controle-leite

O SESMT começou dentro do projeto do controle-leite, o que trazia um problema:
usuário daquele sistema é usuário autenticado aqui também. Passos para separar:

1. **Criar o projeto** em https://supabase.com/dashboard → *New project*.
   Sugestão de nome: `painel-sesmt`. Região: São Paulo.
2. **Pegar as credenciais** em *Project Settings → API*:
   - `Project URL`
   - `publishable` (ou `anon`) key — é pública por natureza; quem manda no
     que pode ser gravado é a RLS, não a chave.
3. **Trocar no código**: as duas linhas do topo de `web/servidor.js`.
   Depois `cd web && bash build.sh`, commit e push.
4. **Rodar `01-esquema-sesmt.sql`** no SQL Editor do projeto novo.
5. **Criar o administrador**: *Authentication → Users → Add user*, depois
   rodar o `insert` do final de `02-acesso-de-administrador.sql` com o e-mail.
6. **Conferir** o painel na aba Ajustes: deve dizer "administrador" após entrar.
7. **Só então** rodar `03-remover-do-controle-leite.sql` no projeto antigo.

## Quem pode o quê

| Quem | Ler | Gravar |
|---|---|---|
| Qualquer pessoa com o link | sim | não |
| Conta autenticada fora de `sesmt_admins` | sim | não |
| Conta em `sesmt_admins` | sim | sim |

A lista de administradores só é legível pelo próprio dono da linha, então
ninguém descobre quem administra o painel.
