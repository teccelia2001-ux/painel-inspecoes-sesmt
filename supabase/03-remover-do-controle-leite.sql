-- ============================================================
-- LIMPEZA — tirar o SESMT de dentro do projeto do controle-leite
--
-- Rode este arquivo APENAS no projeto ANTIGO (aggdmvtyfrlyipaovczq),
-- e SOMENTE depois que o painel já estiver funcionando no projeto novo.
--
-- Ele apaga as tabelas do SESMT que foram criadas ali por engano.
-- Nada do controle-leite é tocado: só objetos com prefixo sesmt_.
-- ============================================================

-- Confira antes o que será apagado e quantas linhas cada tabela tem:
select 'sesmt_equipes'    as tabela, count(*) from public.sesmt_equipes
union all
select 'sesmt_inspetores', count(*) from public.sesmt_inspetores
union all
select 'sesmt_admins',     count(*) from public.sesmt_admins;

-- ------------------------------------------------------------
-- Conferido? Então rode o bloco abaixo.
-- ------------------------------------------------------------
drop table if exists public.sesmt_equipes    cascade;
drop table if exists public.sesmt_inspetores cascade;
drop table if exists public.sesmt_admins     cascade;

drop function if exists public.sesmt_e_admin()           cascade;
drop function if exists public.sesmt_toca_atualizada_em() cascade;

-- Confirmação: não deve sobrar nada com o prefixo sesmt_
select table_name
  from information_schema.tables
 where table_schema = 'public' and table_name like 'sesmt_%';

-- ------------------------------------------------------------
-- Os usuários criados em Authentication → Users NÃO são apagados
-- por este script. Se você criou uma conta só para administrar o
-- SESMT, remova-a manualmente no painel do projeto antigo.
-- ------------------------------------------------------------
