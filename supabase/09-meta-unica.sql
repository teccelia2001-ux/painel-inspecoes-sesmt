-- ============================================================
-- 09 — Meta única de inspeção
--
-- O cadastro tinha duas metas por inspetor: dinâmica e estática.
-- Só a dinâmica entrava em algum cálculo (Meta_Insp, "meta até hoje",
-- % atingida); a estática era campo morto, preenchido e nunca lido.
--
-- Aqui a dinâmica vira a meta única (a coluna passa a se chamar "meta")
-- e a estática é excluída. Os números do painel NÃO mudam: a meta de
-- cada inspetor continua sendo exatamente a que já valia.
--
-- RODAR ANTES de publicar a versão nova do painel.
-- ============================================================

alter table public.sesmt_inspetores
  rename column meta_dinamica to meta;

alter table public.sesmt_inspetores
  drop column if exists meta_estatica;

comment on column public.sesmt_inspetores.meta is 'Meta de inspeções por mês';

-- conferência
select inspetor, polo, funcao, meta, ativo
  from public.sesmt_inspetores
 order by inspetor;
