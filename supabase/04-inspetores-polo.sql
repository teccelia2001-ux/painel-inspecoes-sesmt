-- ============================================================
-- INSPETORES: Área vira Polo; Cargo e Regional saem
--
-- Rode no SQL Editor do projeto painel-sesmt.
-- Pode rodar mais de uma vez sem erro.
--
-- ATENÇÃO: os valores de "cargo" e "regional" são apagados e não
-- há como recuperá-los depois. Se quiser guardar antes, rode:
--   select inspetor, cargo, regional from public.sesmt_inspetores;
-- e salve o resultado.
-- ============================================================

-- 1. Área vira Polo, preservando o que já estava preenchido
alter table public.sesmt_inspetores rename column area to polo;

-- 2. Campos que saem do cadastro
alter table public.sesmt_inspetores drop column if exists cargo;
alter table public.sesmt_inspetores drop column if exists regional;

comment on column public.sesmt_inspetores.polo is
  'Polo do inspetor (Patos, Sousa, Cajazeiras, Itaporanga...)';

-- 3. Conferência: deve listar inspetor, polo, funcao, metas, ativo
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'sesmt_inspetores'
 order by ordinal_position;

-- ------------------------------------------------------------
-- Os polos vieram de "Obras RD", que era o valor antigo de Área.
-- Ajuste cada inspetor pela aba Ajustes do painel, ou de uma vez:
--
--   update public.sesmt_inspetores set polo = 'PATOS'
--    where inspetor in ('Acacio', 'Edney');
-- ------------------------------------------------------------
