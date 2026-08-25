-- ============================================================
-- POLOS POR INSPETOR + ajustes de cadastro
--
-- Rode no SQL Editor do projeto painel-sesmt, depois do 04.
-- Pode rodar mais de uma vez sem duplicar nada.
--
-- Selecione TUDO (Ctrl+A) antes de dar Run.
-- ============================================================

-- 1. Correção de nome: Arisleudo -> Aisleudo
update public.sesmt_inspetores
   set inspetor = 'Aisleudo'
 where inspetor = 'Arisleudo';

-- 2. Rangel sai, Samuel entra no lugar dele (mesma linha, metas de
--    supervisor padrão: dinâmica 4, estática 0)
update public.sesmt_inspetores
   set inspetor       = 'Samuel',
       funcao         = 'Supervisor',
       meta_dinamica  = 4,
       meta_estatica  = 0
 where inspetor = 'Rangel';

-- 3. Inspetores novos (só insere se ainda não existirem)
insert into public.sesmt_inspetores
       (inspetor, polo, funcao, meta_dinamica, meta_estatica, ativo)
select v.inspetor, v.polo, v.funcao, v.meta_dinamica, v.meta_estatica, true
  from (values
          ('Pereira',   'CAJAZEIRAS',      'Supervisor', 4, 0),
          ('Halanildo', 'CATOLE DO ROCHA', 'Supervisor', 4, 0)
       ) as v(inspetor, polo, funcao, meta_dinamica, meta_estatica)
 where not exists (
         select 1 from public.sesmt_inspetores i
          where i.inspetor = v.inspetor
       );

-- 4. Polos informados
update public.sesmt_inspetores set polo = 'PATOS'           where inspetor = 'Acacio';
update public.sesmt_inspetores set polo = 'SOUSA'           where inspetor = 'Aisleudo';
update public.sesmt_inspetores set polo = 'CAJAZEIRAS'      where inspetor = 'Pereira';
update public.sesmt_inspetores set polo = 'PRINCESA ISABEL' where inspetor = 'Samuel';
update public.sesmt_inspetores set polo = 'ITAPORANGA'      where inspetor = 'Eliakin';
update public.sesmt_inspetores set polo = 'CATOLE DO ROCHA' where inspetor = 'Halanildo';

-- 5. Conferência
select inspetor, polo, funcao, meta_dinamica, meta_estatica, ativo
  from public.sesmt_inspetores
 order by polo, inspetor;

-- ------------------------------------------------------------
-- Ainda com o polo antigo "Obras RD" (não foram informados):
--   Edney, Francisco, Gustavo, Huislan, Humberto, Joab, Julierme
-- Ajuste pela aba Ajustes do painel ou acrescente updates acima.
-- ------------------------------------------------------------
