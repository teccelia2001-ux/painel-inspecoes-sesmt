-- ============================================================
-- Painel de Inspeções SESMT — equipes e inspetores no Supabase
--
-- Rode este arquivo inteiro no SQL Editor do projeto Supabase
-- (o mesmo já usado pelo controle-leite). Ele cria as duas
-- tabelas, liga a segurança e já carrega os cadastros atuais.
--
-- Pode rodar mais de uma vez: nada é duplicado nem apagado.
-- ============================================================

-- ---------- EQUIPES ----------
create table if not exists public.sesmt_equipes (
  id            uuid primary key default gen_random_uuid(),
  equipe        text        not null unique,
  tipo          text,
  supervisor    text,
  pontos        integer     not null default 100,
  ativa         boolean     not null default true,
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

comment on table  public.sesmt_equipes is 'Equipes de campo avaliadas na Jornada Segura';
comment on column public.sesmt_equipes.pontos is 'Pontos iniciais por mês de vigência';
comment on column public.sesmt_equipes.tipo   is 'LM, LV, MAN, PER, PLA, POD, REA';

-- ---------- INSPETORES ----------
create table if not exists public.sesmt_inspetores (
  id            uuid primary key default gen_random_uuid(),
  inspetor      text        not null unique,
  cargo         text,
  area          text,
  regional      text,
  funcao        text,
  meta_dinamica integer     not null default 0,
  meta_estatica integer     not null default 0,
  ativo         boolean     not null default true,
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

comment on table  public.sesmt_inspetores is 'Quem faz as inspeções e a meta individual de cada um';
comment on column public.sesmt_inspetores.meta_dinamica is 'Meta de inspeções dinâmicas por mês';

-- ---------- carimbo de atualização ----------
create or replace function public.sesmt_toca_atualizada_em()
returns trigger language plpgsql as $$
begin
  new.atualizada_em = now();
  return new;
end $$;

drop trigger if exists tg_sesmt_equipes_touch on public.sesmt_equipes;
create trigger tg_sesmt_equipes_touch before update on public.sesmt_equipes
  for each row execute function public.sesmt_toca_atualizada_em();

drop trigger if exists tg_sesmt_inspetores_touch on public.sesmt_inspetores;
create trigger tg_sesmt_inspetores_touch before update on public.sesmt_inspetores
  for each row execute function public.sesmt_toca_atualizada_em();

-- ============================================================
-- SEGURANÇA
-- O painel é público: qualquer pessoa com o link LÊ os cadastros.
-- Só quem estiver autenticado pode criar, editar ou excluir.
-- ============================================================
alter table public.sesmt_equipes    enable row level security;
alter table public.sesmt_inspetores enable row level security;

drop policy if exists "leitura publica"     on public.sesmt_equipes;
drop policy if exists "escrita autenticada" on public.sesmt_equipes;
create policy "leitura publica"     on public.sesmt_equipes
  for select using (true);
create policy "escrita autenticada" on public.sesmt_equipes
  for all to authenticated using (true) with check (true);

drop policy if exists "leitura publica"     on public.sesmt_inspetores;
drop policy if exists "escrita autenticada" on public.sesmt_inspetores;
create policy "leitura publica"     on public.sesmt_inspetores
  for select using (true);
create policy "escrita autenticada" on public.sesmt_inspetores
  for all to authenticated using (true) with check (true);

-- ============================================================
-- CARGA INICIAL — os cadastros que hoje estão dentro do painel.
-- "on conflict do nothing" evita duplicar se rodar de novo.
-- ============================================================
insert into public.sesmt_equipes (equipe, tipo, supervisor, pontos) values
  ('CONST 1', 'LM', 'Acacio', 100),
  ('CONST 2', 'LM', 'Acacio', 100),
  ('CONST 3', 'LM', 'Acacio', 100),
  ('CONST 4', 'LM', 'Acacio', 100),
  ('CONST 5', 'LM', 'Acacio', 100),
  ('CONST 6', 'LM', 'Humberto', 100),
  ('CONST 7', 'LM', 'Humberto', 100),
  ('CONST 8', 'LM', 'Humberto', 100),
  ('CONST 9', 'LM', 'Humberto', 100),
  ('CONST 10', 'LM', 'Arlan', 100),
  ('CONST 11', 'LM', 'Arlan', 100),
  ('CONST 12', 'LM', 'Arlan', 100),
  ('CONST 13', 'LM', 'Arlan', 100),
  ('LINHA VIVA 1', 'LV', 'Arlan', 100),
  ('LINHA VIVA 2', 'LV', 'Arisleudo', 100),
  ('LINHA VIVA 3', 'LV', 'Arisleudo', 100),
  ('MANUT 1', 'MAN', 'Arisleudo', 100),
  ('MANUT 2', 'MAN', 'Arisleudo', 100),
  ('MANUT 3', 'MAN', 'Arisleudo', 100),
  ('MANUT 4', 'MAN', 'Arisleudo', 100),
  ('MANUT 5', 'MAN', 'Rangel', 100),
  ('MANUT 6', 'MAN', 'Rangel', 100),
  ('PERDAS PTSRG02', 'PER', 'Rangel', 100),
  ('PERDAS PTSRG03', 'PER', 'Rangel', 100),
  ('PERDAS PTSRG04', 'PER', 'Rangel', 100),
  ('PERDAS PTSRG09', 'PER', 'Rangel', 100),
  ('PERDAS PTSRG12', 'PER', 'Acacio', 100),
  ('PLANTÃO - BTF BT30', 'PLA', 'Acacio', 100),
  ('PLANTÃO - CJZ BT30', 'PLA', 'Acacio', 100),
  ('PLANTÃO - CTRBT30', 'PLA', 'Acacio', 100),
  ('PLANTÃO - CTRBT31', 'PLA', 'Acacio', 100),
  ('PLANTÃO - ITOBT31', 'PLA', 'Humberto', 100),
  ('PLANTÃO - PBLBT30', 'PLA', 'Humberto', 100),
  ('PLANTÃO - PCOBT30', 'PLA', 'Humberto', 100),
  ('PLANTÃO - PRIBT31', 'PLA', 'Humberto', 100),
  ('PLANTÃO - PTSBT36', 'PLA', 'Arlan', 100),
  ('PLANTÃO - PTSCX02', 'PLA', 'Arlan', 100),
  ('PLANTÃO - SBTBT30', 'PLA', 'Arlan', 100),
  ('PLANTÃO - SPX BT30', 'PLA', 'Arlan', 100),
  ('PLANTÃO - SZABT30', 'PLA', 'Arlan', 100),
  ('PLANTÃO - SZACX02', 'PLA', 'Arisleudo', 100),
  ('PLANTÃO CONBT30', 'PLA', 'Arisleudo', 100),
  ('PODA 1', 'POD', 'Arisleudo', 100),
  ('PODA 2', 'POD', 'Arisleudo', 100),
  ('PODA 3', 'POD', 'Arisleudo', 100),
  ('REAVISO - CJZRI01', 'REA', 'Arisleudo', 100),
  ('REAVISO - CTRRI01', 'REA', 'Rangel', 100),
  ('REAVISO - ITORI01', 'REA', 'Rangel', 100),
  ('REAVISO PTSRI03', 'REA', 'Rangel', 100),
  ('REAVISO SSARI02', 'REA', 'Rangel', 100)
on conflict (equipe) do nothing;

insert into public.sesmt_inspetores
  (inspetor, cargo, area, regional, funcao, meta_dinamica, meta_estatica) values
  ('Acacio', 'Supervisor', 'Obras RD', 'OESTE', 'Supervisor', 4, 0),
  ('Arisleudo', 'Supervisor', 'Obras RD', 'OESTE', 'Supervisor', 4, 0),
  ('Arlan', 'Supervisor', 'Obras RD', 'OESTE', 'Supervisor', 4, 0),
  ('Edney', 'Supervisor', 'Obras RD', 'OESTE', 'Técnico Segurança', 12, 2),
  ('Francisco', 'Técnico Segurança', 'Obras RD', 'OESTE', 'Técnico Segurança', 12, 2),
  ('Gustavo', 'Coordenador', 'Obras RD', 'OESTE', 'Coordenador Operacional', 4, 2),
  ('Huislan', 'Técnico Segurança', 'Obras RD', 'OESTE', 'Técnico Segurança', 12, 2),
  ('Humberto', 'Supervisor', 'Obras RD', 'OESTE', 'Supervisor', 4, 0),
  ('Joab', 'Engenheiro Segurança', 'Obras RD', 'OESTE', 'Engenheiro Segurança', 4, 0),
  ('Julierme', 'Gerente Operacional', 'Obras RD', 'OESTE', 'Gerente Operacional', 2, 2),
  ('Rangel', 'Supervisor', 'Obras RD', 'OESTE', 'Supervisor', 4, 2)
on conflict (inspetor) do nothing;

-- ============================================================
-- Depois de rodar: crie quem pode editar em
-- Authentication → Users → Add user (e-mail e senha).
-- Só esses usuários conseguem gravar; o resto do mundo só lê.
-- ============================================================
