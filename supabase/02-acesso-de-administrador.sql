-- ============================================================
-- ACESSO DE ADMINISTRADOR — painel SESMT
--
-- POR QUE ISTO EXISTE
-- Na primeira versão, a regra de escrita era "estar autenticado".
-- Como este projeto Supabase é compartilhado com o controle-leite,
-- qualquer usuário de lá (um produtor, por exemplo) se encaixava
-- nessa regra e poderia editar as equipes do SESMT.
--
-- Este arquivo troca a regra: só quem estiver na lista de
-- administradores grava. Rode inteiro no SQL Editor.
-- Pode rodar mais de uma vez sem problema.
-- ============================================================

-- ---------- 1. lista de administradores ----------
create table if not exists public.sesmt_admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text,
  nome      text,
  criado_em timestamptz not null default now()
);

comment on table public.sesmt_admins is 'Quem pode editar os cadastros do painel SESMT';

-- security definer: consulta a lista ignorando a RLS da própria tabela.
-- Sem isso, a política precisaria consultar a tabela que ela mesma
-- protege, e o Postgres entraria em recursão.
create or replace function public.sesmt_e_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sesmt_admins a where a.user_id = auth.uid());
$$;

grant execute on function public.sesmt_e_admin() to anon, authenticated;

alter table public.sesmt_admins enable row level security;
drop policy if exists "ve a propria linha" on public.sesmt_admins;
drop policy if exists "admin gerencia"     on public.sesmt_admins;
-- cada um enxerga só o próprio registro: a lista de quem administra
-- não fica visível para os demais usuários do projeto
create policy "ve a propria linha" on public.sesmt_admins
  for select to authenticated using (user_id = auth.uid());
create policy "admin gerencia" on public.sesmt_admins
  for all to authenticated using (public.sesmt_e_admin()) with check (public.sesmt_e_admin());

-- ---------- 2. trocar a regra de escrita dos cadastros ----------
drop policy if exists "escrita autenticada" on public.sesmt_equipes;
drop policy if exists "escrita admin"       on public.sesmt_equipes;
create policy "escrita admin" on public.sesmt_equipes
  for all to authenticated using (public.sesmt_e_admin()) with check (public.sesmt_e_admin());

drop policy if exists "escrita autenticada" on public.sesmt_inspetores;
drop policy if exists "escrita admin"       on public.sesmt_inspetores;
create policy "escrita admin" on public.sesmt_inspetores
  for all to authenticated using (public.sesmt_e_admin()) with check (public.sesmt_e_admin());

-- A leitura continua pública: o painel abre para qualquer pessoa.
drop policy if exists "leitura publica" on public.sesmt_equipes;
create policy "leitura publica" on public.sesmt_equipes for select using (true);
drop policy if exists "leitura publica" on public.sesmt_inspetores;
create policy "leitura publica" on public.sesmt_inspetores for select using (true);

-- ============================================================
-- 3. DIZER QUEM É ADMINISTRADOR
--
-- Antes: crie a pessoa em Authentication → Users → Add user.
-- Depois: troque o e-mail abaixo e rode de novo este trecho.
-- ============================================================
insert into public.sesmt_admins (user_id, email, nome)
select id, email, 'Administrador do SESMT'
  from auth.users
 where email = 'troque@pelo.email'      -- <<< TROQUE AQUI
on conflict (user_id) do nothing;

-- Conferir quem tem acesso hoje:
select email, nome, criado_em from public.sesmt_admins order by criado_em;

-- ------------------------------------------------------------
-- Para TIRAR o acesso (a conta continua existindo, só perde o
-- direito de editar):
--
--   delete from public.sesmt_admins where email = 'quem@perde.acesso';
-- ------------------------------------------------------------
