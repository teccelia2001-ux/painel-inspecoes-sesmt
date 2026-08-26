-- ============================================================
-- Fecha o Ranking de inspetores: cadastra Junielly e Manoel Vaz,
-- e tira Juscélio do painel.
--
-- Rode no SQL Editor do projeto painel-sesmt, depois do 06.
-- Pode rodar mais de uma vez sem erro.
-- ============================================================

-- 1. Inspetores novos (só insere se ainda não existirem).
--    O nome tem de ser igual ao que vem nas inspeções, senão
--    elas continuam caindo em "(vazio)".
insert into public.sesmt_inspetores
       (inspetor, polo, funcao, meta_dinamica, meta_estatica, ativo)
select v.inspetor, v.polo, v.funcao, v.meta_dinamica, v.meta_estatica, true
  from (values
          ('Junielly',   'PATOS',  'Supervisor', 4, 0),
          ('Manoel Vaz', 'TECCEL', 'Auditor',    4, 0)
       ) as v(inspetor, polo, funcao, meta_dinamica, meta_estatica)
 where not exists (
         select 1 from public.sesmt_inspetores i
          where i.inspetor = v.inspetor
       );

-- 2. Se já existirem com outro polo/função, alinha.
update public.sesmt_inspetores
   set polo = 'PATOS', funcao = 'Supervisor', ativo = true
 where inspetor = 'Junielly';

update public.sesmt_inspetores
   set polo = 'TECCEL', funcao = 'Auditor', ativo = true
 where inspetor = 'Manoel Vaz';

-- 3. Juscélio sai do cadastro.
--    As 3 inspeções dele (ids 1, 12 e 96) e a não conformidade
--    da inspeção 12 já foram removidas de web/data.js, que é
--    onde as inspeções ficam — o banco guarda só os cadastros.
delete from public.sesmt_inspetores where inspetor = 'Juscélio';

-- 4. Conferência: nenhum "Juscélio", e Junielly e Manoel Vaz presentes.
select inspetor, polo, funcao, meta_dinamica, meta_estatica, ativo
  from public.sesmt_inspetores
 order by polo, inspetor;
