-- ============================================================
-- Nomes de supervisor em sesmt_equipes desatualizados
--
-- O painel monta o filtro "Supervisor" a partir de sesmt_equipes.
-- Lá os nomes ficaram para trás em relação a sesmt_inspetores:
--
--   Arisleudo -> Aisleudo       (erro de digitação, 12 equipes)
--   Rangel    -> Samuel         (renomeado no 05, mas só nos
--                                inspetores, 10 equipes)
--   PEREIRA   -> José Pereira   (mesma pessoa do 06, 2 equipes)
--
-- Resultado: o filtro mostrava "Rangel" e "Arisleudo", que não
-- existem mais no cadastro, e o supervisor não cruzava com o
-- inspetor.
--
-- Rode no SQL Editor do projeto painel-sesmt, depois do 07.
-- Pode rodar mais de uma vez sem erro.
-- ============================================================

update public.sesmt_equipes set supervisor = 'Aisleudo'
 where supervisor = 'Arisleudo';

update public.sesmt_equipes set supervisor = 'Samuel'
 where supervisor = 'Rangel';

update public.sesmt_equipes set supervisor = 'José Pereira'
 where supervisor in ('PEREIRA', 'Pereira');

-- Conferência 1: nenhum nome antigo deve sobrar.
select supervisor, count(*) as equipes
  from public.sesmt_equipes
 group by supervisor
 order by supervisor;

-- Conferência 2: todo supervisor de equipe tem de existir como
--                inspetor. Esta consulta deve vir vazia.
select distinct e.supervisor
  from public.sesmt_equipes e
 where e.supervisor is not null
   and e.supervisor <> ''
   and not exists (
         select 1 from public.sesmt_inspetores i
          where i.inspetor = e.supervisor
       );

-- ------------------------------------------------------------
-- Nota: CONST 1 e CONST 10 são mesmo do José Pereira (confirmado).
-- O seed em web/data.js trazia Acacio e Arlan nessas duas e foi
-- corrigido para bater com o banco.
-- ------------------------------------------------------------
