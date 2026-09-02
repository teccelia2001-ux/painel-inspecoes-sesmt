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
-- Pode rodar de novo sem erro: o rename só acontece se ainda houver
-- o que renomear.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'sesmt_inspetores'
       and column_name = 'meta_dinamica'
  ) then
    alter table public.sesmt_inspetores rename column meta_dinamica to meta;
  end if;
end $$;

alter table public.sesmt_inspetores
  drop column if exists meta_estatica;

comment on column public.sesmt_inspetores.meta is 'Meta de inspeções por mês';

-- conferência
select inspetor, polo, funcao, meta, ativo
  from public.sesmt_inspetores
 order by inspetor;
