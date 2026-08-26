-- ============================================================
-- "Pereira" e "José Pereira" são a mesma pessoa
--
-- As inspeções chegam com o nome "José Pereira", mas o cadastro
-- tinha só "Pereira". Sem casar o nome, as 6 inspeções dele
-- ficavam fora do Ranking de inspetores (grupo "(vazio)").
--
-- Rode no SQL Editor do projeto painel-sesmt.
-- Pode rodar mais de uma vez sem erro.
-- ============================================================

-- 1. Renomeia o cadastro para o nome que vem nas inspeções.
--    Se alguém já tiver criado "José Pereira" à mão, apaga a
--    duplicata "Pereira" em vez de renomear.
do $$
begin
  if exists (select 1 from public.sesmt_inspetores where inspetor = 'José Pereira') then
    delete from public.sesmt_inspetores where inspetor = 'Pereira';
  else
    update public.sesmt_inspetores
       set inspetor = 'José Pereira'
     where inspetor = 'Pereira';
  end if;
end $$;

-- 2. Garante polo, função e metas dele.
update public.sesmt_inspetores
   set polo          = 'CAJAZEIRAS',
       funcao        = 'Supervisor',
       meta_dinamica = 4,
       meta_estatica = 0,
       ativo         = true
 where inspetor = 'José Pereira';

-- 3. Conferência: deve aparecer uma única linha "José Pereira"
--    e nenhuma "Pereira".
select inspetor, polo, funcao, meta_dinamica, meta_estatica, ativo
  from public.sesmt_inspetores
 where inspetor in ('Pereira', 'José Pereira');

-- ------------------------------------------------------------
-- OUTROS QUE ESTAVAM FORA DO RANKING (nome como vem nas inspeções):
--   Manoel Vaz — 6 inspeções (CONST 1, 2, 3, 13, LINHA VIVA 1 e 2)
--   Junielly   — 2 inspeções (PLANTÃO - PTSCX02, DEOP)
-- Resolvidos na migração 07. Juscélio saiu do painel (inspeções
-- removidas de web/data.js e cadastro apagado no 07).
-- ------------------------------------------------------------
