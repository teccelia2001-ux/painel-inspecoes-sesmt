/* ============================================================
   DADOS REAIS extraídos do relatório Power BI público
   (endpoint /public/reports/querydata, dataset 8fd62510-...)
   Extração: 24/08/2026
   ============================================================ */

/* Ddata — calendário: [Mês/Ano, Serial, Dias Uteis, Dias Uteis até hoje(att), Dias Corridos] */
const DDATA = [
  ["1/2026","202601",22,22,31],["2/2026","202602",20,20,28],["3/2026","202603",22,22,31],
  ["4/2026","202604",22,22,30],["5/2026","202605",21,21,31],["6/2026","202606",22,22,30],
  ["7/2026","202607",23,23,31],["8/2026","202608",21,17,31],["9/2026","202609",22,0,30],
  ["10/2026","202610",22,0,31],["11/2026","202611",21,0,30],["12/2026","202612",23,0,31]
];

/* Inspetores — [INSPETOR, POLO, FUNÇÃO, META DINAMICA, META ESTÁTICA] */
let INSPETORES = [
  ["Acacio","PATOS","Supervisor",4,0],
  ["Aisleudo","SOUSA","Supervisor",4,0],
  ["Edney","SESMT","Técnico Segurança",12,2],
  ["Eliakin","ITAPORANGA","Supervisor",4,0],
  ["Francisco","SESMT","Técnico Segurança",12,2],
  ["Gustavo","TECCEL","Coordenador Operacional",4,2],
  ["Halanildo","CATOLE DO ROCHA","Supervisor",4,0],
  ["Huislan","SESMT","Técnico Segurança",12,2],
  ["Humberto","TECCEL","Supervisor",4,0],
  ["Joab","SESMT","Engenheiro Segurança",4,0],
  ["José Pereira","CAJAZEIRAS","Supervisor",4,0],
  ["Julierme","TECCEL","Gerente Operacional",2,2],
  ["Junielly","PATOS","Supervisor",4,0],
  ["Manoel Vaz","TECCEL","Auditor",4,0],
  ["Samuel","PRINCESA ISABEL","Supervisor",4,0]
];

/* META_MESES foi removido em 27/08/2026. Era a lista de meses com meta
   cadastrada (abr–jul/2026), herdada do Power BI, onde a meta era versionada
   por mês. Fora dela a meta entrava zero, e agosto mostrava 0,0% atingida para
   todo mundo — o painel parecia quebrado. Agora a meta é a do inspetor
   (4ª posição de INSPETORES) e vale em todos os meses. Ver Meta_Insp(). */

/* Equipes — [EQUIPE, TIPO, SUPERVISOR, PONTOS/mês, NOMES ANTERIORES?]
   A última posição só aparece em quem já foi renomeada. É o que permite
   achar uma inspeção feita com o nome antigo — ver reconstruirModelo(). */
let EQUIPES = [
  ["CONST 1","LM","José Pereira",100],
  ["CONST 10","LM","José Pereira",100],
  ["CONST 11","LM","Eliakin",100],
  ["CONST 12","LM","Samuel",100],
  ["CONST 13","LM","Halanildo",100],
  ["CONST 2","LM","Eliakin",100],
  ["CONST 3","LM","Aisleudo",100],
  ["CONST 4","LM","Eliakin",100],
  ["CONST 6","LM","Acacio",100],
  ["CONST 7","LM","José Pereira",100],
  ["CONST 8","LM","Acacio",100],
  ["CONST 9","LM","Acacio",100],
  ["LINHA VIVA 1 CJZ","LV","José Pereira",100,["LINHA VIVA 1"]],
  ["LINHA VIVA 2 PTS","LV","Acacio",100,["LINHA VIVA 2"]],
  ["LINHA VIVA 3 JR PTS","LV","Acacio",100,["LINHA VIVA 3"]],
  ["MANUT 1","MAN","Acacio",100],
  ["MANUT 2","MAN","Halanildo",100],
  ["MANUT 3","MAN","Aisleudo",100],
  ["MANUT 4","MAN","José Pereira",100],
  ["MANUT 5","MAN","Eliakin",100],
  ["MANUT 6","MAN","Samuel",100],
  ["PERDAS PTSRG01","PER","Junielly",100],
  ["PERDAS PTSRG02","PER","Junielly",100],
  ["PERDAS PTSRG03","PER","Junielly",100],
  ["PERDAS PTSRG04","PER","Junielly",100],
  ["PERDAS PTSRG09","PER","Junielly",100],
  ["PERDAS PTSRG12","PER","Junielly",100],
  ["PLANTÃO - BTF BT30","PLA","Junielly",100],
  ["PLANTÃO - CJZ BT30","PLA","Junielly",100],
  ["PLANTÃO - CONBT30","PLA","Junielly",100,["PLANTÃO CONBT30"]],
  ["PLANTÃO - CTRBT30","PLA","Junielly",100],
  ["PLANTÃO - CTRBT31","PLA","Junielly",100],
  ["PLANTÃO - ITOBT31","PLA","Junielly",100],
  ["PLANTÃO - PBLBT30","PLA","Junielly",100],
  ["PLANTÃO - PCOBT30","PLA","Junielly",100],
  ["PLANTÃO - PRIBT31","PLA","Junielly",100],
  ["PLANTÃO - PTSBT36","PLA","Junielly",100],
  ["PLANTÃO - PTSCX02","PLA","Junielly",100],
  ["PLANTÃO - SBTBT30","PLA","Junielly",100],
  ["PLANTÃO - SPX BT30","PLA","Junielly",100],
  ["PLANTÃO - SZABT30","PLA","Junielly",100],
  ["PLANTÃO - SZACX02","PLA","Junielly",100],
  ["PODA 1 CTR","POD","Halanildo",100,["PODA 1"]],
  ["PODA 2 CJZ","POD","José Pereira",100,["PODA 2"]],
  ["PODA 3 PTS","POD","Acacio",100,["PODA 3"]],
  ["REAVISO - CJZRI01","REA","Junielly",100],
  ["REAVISO - CTRRI01","REA","Junielly",100],
  ["REAVISO - ITORI01","REA","Junielly",100],
  ["REAVISO - PTSRI03","REA","Junielly",100],
  ["REAVISO - SSARI02","REA","Junielly",100]
];

/* CÓPIA CONGELADA do cadastro deste arquivo — a reserva de verdade.

   EQUIPES e INSPETORES acima são SOBRESCRITOS pelo banco em
   Cadastros.aplicarNoModelo(). Até 27/08/2026 a reserva era lida dessas
   mesmas variáveis, então, depois da primeira carga do banco, ela deixava
   de existir: quando o banco falhava mais tarde, o painel mostrava
   "mostrando os cadastros embutidos" com a tabela VAZIA. Reserva que some
   quando o titular funciona não é reserva. */
const EQUIPES_ARQUIVO = EQUIPES.map(r => r.slice());
const INSPETORES_ARQUIVO = INSPETORES.map(r => r.slice());

/* Inspeções Teccel1 (grão = inspeção) — [ID, Inspetor, Equipe, Tipo Serviço, Data dd/mm/aaaa] */
let INSPECOES = [
["2","Huislan","CONST 1","DCMD C&M","14/04/2026"],
["3","Francisco","MANUT 3","DCMD C&M","15/04/2026"],["4","Francisco","MANUT 2","DCMD C&M","16/04/2026"],
["5","Francisco","MANUT 2","DCMD C&M","17/04/2026"],["6","Edney","CONST 10","DCMD C&M","23/04/2026"],
["7","Joab","CONST 4","DCMD C&M","13/04/2026"],["8","Francisco","CONST 7","DCMD C&M","24/04/2026"],
["9","Edney","CONST 1","DCMD C&M","28/04/2026"],["10","Acacio","CONST 8","DCMD C&M","29/04/2026"],
["11","Francisco","MANUT 2","DCMD C&M","30/04/2026"],
["13","Joab","CONST 7","DCMD C&M","22/04/2026"],["14","Francisco","MANUT 4","DCMD C&M","06/05/2026"],
["15","Edney","CONST 1","DCMD C&M","18/05/2026"],["16","Edney","CONST 7","DCMD C&M","18/05/2026"],
["17","Edney","CONST 10","DCMD C&M","18/05/2026"],["18","Huislan","CONST 12","DCMD C&M","18/05/2026"],
["19","Francisco","CONST 3","DCMD C&M","21/05/2026"],["20","Francisco","CONST 13","DCMD C&M","22/05/2026"],
["21","Joab","CONST 11","DCMD C&M","26/05/2026"],["22","Francisco","MANUT 3","DCMD C&M","25/05/2026"],
["23","Francisco","CONST 13","DCMD C&M","27/05/2026"],["24","Gustavo","MANUT 6","DCMD C&M","27/05/2026"],
["25","Francisco","MANUT 2","DCMD C&M","05/06/2026"],["26","Francisco","MANUT 3","DCMD C&M","19/06/2026"],
["27","Joab","CONST 8","DCMD C&M","18/06/2026"],["28","Joab","CONST 11","DCMD C&M","23/06/2026"],
["29","Joab","MANUT 1","DCMD C&M","25/06/2026"],["30","Edney","CONST 10","DCMD C&M","05/06/2026"],
["31","Edney","CONST 11","DCMD C&M","07/06/2026"],["32","Edney","PLANTÃO - BTF BT30","DCMD C&M","10/06/2026"],
["33","Edney","PLANTÃO - ITOBT31","DCMD C&M","13/06/2026"],["34","Edney","CONST 1","DCMD C&M","04/06/2026"],
["35","Edney","CONST 7","DCMD C&M","08/06/2026"],["36","Edney","CONST 4","DCMD C&M","18/06/2026"],
["37","Edney","CONST 2","DCMD C&M","19/06/2026"],["38","Edney","CONST 11","DCMD C&M","22/06/2026"],
["39","Edney","CONST 7","DCMD C&M","25/06/2026"],["40","Edney","LINHA VIVA 1","DCMD C&M","25/06/2026"],
["41","Aisleudo","CONST 3","DCMD C&M","26/06/2026"],["42","José Pereira","CONST 10","DCMD C&M","27/06/2026"],
["43","Francisco","CONST 1","DCMD C&M","08/07/2026"],["44","Edney","CONST 7","DCMD C&M","01/07/2026"],
["45","Edney","CONST 10","DCMD C&M","01/07/2026"],["46","Edney","MANUT 4","DCMD C&M","01/07/2026"],
["47","Edney","CONST 11","DCMD C&M","07/07/2026"],["48","Francisco","CONST 3","DCMD C&M","20/07/2026"],
["49","Francisco","MANUT 3","DCMD C&M","20/07/2026"],["50","Edney","CONST 4","DCMD C&M","23/07/2026"],
["51","Edney","CONST 4","DCMD C&M","21/07/2026"],["52","Francisco","CONST 13","DCMD C&M","23/07/2026"],
["53","Edney","CONST 7","DCMD C&M","22/07/2026"],["54","Edney","CONST 10","DCMD C&M","13/07/2026"],
["55","Joab","CONST 9","DCMD C&M","27/07/2026"],["56","Francisco","CONST 3","DCMD C&M","24/07/2026"],
["57","Joab","CONST 6","DCMD C&M","28/07/2026"],["58","Joab","CONST 8","DCMD C&M","30/07/2026"],
["59","Edney","CONST 10","DCMD C&M","27/07/2026"],["60","Edney","CONST 11","DCMD C&M","31/07/2026"],
["61","Aisleudo","CONST 3","DCMD C&M","23/07/2026"],["62","José Pereira","MANUT 4","DCMD C&M","02/08/2026"],
["63","José Pereira","MANUT 4","DCMD C&M","03/08/2026"],["64","Huislan","CONST 12","DCMD C&M","02/07/2026"],
["65","Huislan","CONST 8","DCMD C&M","03/07/2026"],["66","Huislan","CONST 6","DCMD C&M","07/07/2026"],
["67","José Pereira","CONST 7","DCMD C&M","03/08/2026"],["68","Huislan","CONST 9","DCMD C&M","28/07/2026"],
["69","Francisco","CONST 3","DCMD C&M","03/08/2026"],["70","José Pereira","MANUT 4","DCMD C&M","10/08/2026"],
["71","José Pereira","MANUT 4","DCMD C&M","14/07/2026"],["72","Aisleudo","CONST 3","DCMD C&M","12/08/2026"],
["73","Joab","CONST 7","DCMD C&M","18/08/2026"],["74","Joab","CONST 13","DCMD C&M","19/08/2026"],
["75","Manoel Vaz","CONST 1","DCMD C&M","18/08/2026"],["76","Manoel Vaz","CONST 13","DCMD C&M","19/08/2026"],
["77","Manoel Vaz","CONST 3","DCMD C&M","21/08/2026"],
["78","Francisco","PLANTÃO - SZABT30","DEOP","20/04/2026"],["79","Huislan","PLANTÃO - PTSBT36","DEOP","22/04/2026"],
["80","Huislan","PLANTÃO - PTSCX02","DEOP","23/04/2026"],["81","Huislan","PLANTÃO - PRIBT31","DEOP","24/04/2026"],
["82","Edney","PLANTÃO - ITOBT31","DEOP","18/05/2026"],["83","Huislan","PLANTÃO - PTSCX02","DEOP","04/05/2026"],
["84","Huislan","PLANTÃO - PTSBT36","DEOP","08/05/2026"],["85","Joab","PLANTÃO - BTF BT30","DEOP","08/05/2026"],
["86","Joab","PLANTÃO - PBLBT30","DEOP","28/05/2026"],["87","Francisco","PLANTÃO - SZACX02","DEOP","04/06/2026"],
["88","Francisco","PLANTÃO - CTRBT31","DEOP","20/06/2026"],["89","Junielly","PLANTÃO - PTSCX02","DEOP","25/06/2026"],
["90","Francisco","PLANTÃO - CTRBT31","DEOP","21/07/2026"],["91","Junielly","PLANTÃO - PTSCX02","DEOP","03/08/2026"],
["92","Huislan","PLANTÃO - PTSBT36","DEOP","03/07/2026"],["93","Huislan","PLANTÃO - PTSCX02","DEOP","06/07/2026"],
["94","Huislan","PLANTÃO - PRIBT31","DEOP","17/07/2026"],["95","Huislan","PLANTÃO - PTSBT36","DEOP","03/08/2026"],
["97","Huislan","LINHA VIVA 3","DCMD LV","17/04/2026"],
["98","Edney","LINHA VIVA 1","DCMD LV","23/04/2026"],["99","Huislan","MANUT 3","DCMD LV","30/04/2026"],
["100","Joab","LINHA VIVA 2","DCMD LV","27/04/2026"],["101","Francisco","LINHA VIVA 1","DCMD LV","11/06/2026"],
["102","Joab","LINHA VIVA 1","DCMD LV","29/07/2026"],["103","Acacio","LINHA VIVA 3","DCMD LV","17/07/2026"],
["104","Francisco","LINHA VIVA 1","DCMD LV","03/08/2026"],["105","Francisco","LINHA VIVA 1","DCMD LV","10/08/2026"],
["106","Manoel Vaz","LINHA VIVA 1","DCMD LV","18/08/2026"],["107","Manoel Vaz","LINHA VIVA 2","DCMD LV","21/08/2026"],
["108","Manoel Vaz","CONST 2","DCMD LV","21/08/2026"],["109","Huislan","PODA 2","DCMD PODA","04/05/2026"],
["110","Acacio","PODA 3","DCMD PODA","31/07/2026"],["111","Francisco","PERDAS PTSRG04","DECP","22/04/2026"],
["112","Joab","REAVISO - CJZRI01","DECP","29/05/2026"],["113","Francisco","PERDAS PTSRG04","DECP","25/06/2026"],
["114","Francisco","PERDAS PTSRG03","DECP","28/07/2026"],["115","Huislan","PERDAS PTSRG03","DECP","10/07/2026"],
["116","Huislan","PERDAS PTSRG12","DECP","28/07/2026"],["117","Francisco","PERDAS PTSRG03","DECP","27/07/2026"],
["118","Francisco","PERDAS PTSRG03","DECP","14/08/2026"],
["119","Junielly","PLANTÃO - ITOBT31","DECP","12/08/2026"],
["120","Junielly","PLANTÃO CONBT30","DEOP","12/08/2026"],
["121","Junielly","PLANTÃO - BTF BT30","DEOP","12/08/2026"],
["122","Junielly","PLANTÃO - PTSCX02","DEOP","21/08/2026"],
["123","Francisco","CONST 10","DCMD C&M","25/08/2026"],
["124","Aisleudo","MANUT 3","DCMD C&M","25/08/2026"],
["125","Francisco","CONST 10","DCMD C&M","25/08/2026"]
];

/* Perguntas com resposta "Não Conforme" — [ID inspeção, Pergunta, Categoria, Gravidade, Pontos N.C] */
const Q = {
  V1:"Os veículos utlizados na atividade estão em boas condições de uso? (pneus inclusive estepe em condição de uso, com lampadas de sinalização, freio, farol, ré, giroflex, pisca alerta, luz auxiliar de serviço e etc)",
  V2:"Veículo com cabine principal e auxiliar em boas condições de uso, como estrutura, trancas, vidros, bancos?",
  V3:"Cintos de segurança do veículo, inclusive cabine auxiliar em condições de uso e/ou sendo utilizados pelos passageiros?",
  V4:"Veículo possui documentação de regularização veicular da cabine auxiliar?",
  V5:"Estacionar os veículos pesados (Caminhões e caminhonete) corretamente e calçados.",
  V6:"Transporte de materiais soltos na cabine auxiliar?",
  V7:"O veículo utlizado na atividade está em boas condições de uso? (pneus inclusive estepe em condição de uso, com lampadas de sinalização, freio, farol, ré, giroflex, pisca alerta, luz auxiliar de serviço e etc);",
  V8:"Os veículos (CARRO E MOTOCICLETA ) utlizados na atividade estão em boas condições de uso? (pneus inclusive estepe em condição de uso, com lampadas de sinalização, freio, farol, ré, giroflex, pisca alerta, luz auxiliar de serviço e etc);",
  P1:"A área de trabalho foi isolada e sinalizada corretamente?",
  P2:"As normas, procedimentos de segurança e instruções técnicas foram atendidos durante a execução das atividades?",
  P3:"Na operação de equipamentos de movimentação de carga foram instalados os estabilizadores e calçados?",
  P4:"Os grampos para prender as coberturas foram instalados corretamente?",
  P5:"APR contempla todos os riscos e medidas de controle da atividade (Preenchimento correto)",
  P6:"Em caso de desligamento da rede, todos os aterramentos estão posicionados de forma adequada (Rede BT e/ou MT)?",
  P7:"O serviço no SEP e/ou altura foi realizado sob supervisão de outro(a) colaborador(a)? Exceto para corte simbólico, permitido apenas no disjuntor conforme instruções técnicas?",
  P8:"Realizar ou permitir a realização de serviço de colaborador sem treinamentos obrigatórios, ou das Instruções técnicas IT, e/ou Procedimento operacional Padrão POP.",
  P9:"Os colaboradores envolvidos na atividade estavam fora da zona de queda de materiais durante movimentação de carga?",
  P10:"Os colaboradores envolvidos na atividade estavam sem uso de adornos?",
  P11:"A atividade foi executada com a ordem de serviço e/ou autorização de serviço?",
  P12:"As atividades foram executadas na melhor postura para evitar lesões osteomuscular?",
  P13:"As ferramentas/equipamentos foram içadas/descidas por meio do conjunto de içamento (corda/carretilha)?",
  P14:"Em caso de atividades noturnas, a iluminação é suficiente para executar a atividade com segurança?",
  P15:"Em trabalho com apoio de equipe de linha viva, as partes vivas foram cobertas/isoladas?",
  P16:"Foi instalado corretamente o detector de ausência de tensão?",
  P17:"A atividade foi executada após bloqueio do religador?",
  P18:"As coberturas foram instaladas de modo a proteger as partes vivas onde o serviço será executado?",
  P19:"O(s) eletricista(s) de solo se mantém distante do veiculo durante a intervenção em linha viva?",
  P20:"A(s) manobra(s) de chave(s) foi realizada conforme IT_Nº 0223, atentando para sequencia correta e dispositivo DAC para situações necessárias?",
  P21:"Para o caso de substituição de medidores em caixa de medição individual que estejam ligados com condutores de bitola superior a 25 mm², foi desligado o disjuntor da Unidade Consumidora e desenergizar o ramal de ligação do cliente?",
  E1:"Os EPI's/EPC's exceto para risco elétrico e altura estavam adequados durante a execução do serviço?",
  E2:"As escadas com degraus, montantes, travas, cordas e carretilhas estão em boas condições de uso?",
  E3:"Os EPI's e EPC's para risco elétrico foram utilizados em boas condições de uso e com teste em dia(Capacete, óculos, balaclava, fardamento, luvas, coberturas, mangas, botina, etc)?",
  P22:"Foi realizada a APR antes do início das atividades?",
  E4:"Os EPI's e EPC's para risco de altura foram utilizados em boas condições de uso e com validade em dia?"
};

let NC = [
["10",Q.V1,"Veículos","Leve",-1],["100",Q.P16,"Procedimentos","Gravíssimo",-10],
["101",Q.P4,"Procedimentos","Grave",-5],["103",Q.P8,"Procedimentos","Grave",-5],
["104",Q.V7,"Veículos","",0],["106",Q.P1,"Procedimentos","Grave",-5],
["106",Q.P4,"Procedimentos","Grave",-5],["107",Q.P18,"Procedimentos","",0],
["108",Q.P5,"Procedimentos","Gravíssimo",-10],["108",Q.P2,"Procedimentos","Gravíssimo",-10],
["108",Q.P19,"Procedimentos","",0],["109",Q.P1,"Procedimentos","Grave",-5],
["11",Q.P1,"Procedimentos","Grave",-5],["11",Q.P3,"Procedimentos","Leve",-1],
["111",Q.E2,"EPI/EPC","Leve",-1],["111",Q.E1,"EPI/EPC","Leve",-1],
["13",Q.P3,"Procedimentos","Leve",-1],
["14",Q.P2,"Procedimentos","Gravíssimo",-10],["14",Q.P7,"Procedimentos","Leve",-1],
["19",Q.V1,"Veículos","Leve",-1],["19",Q.V6,"Procedimentos","Leve",-1],
["19",Q.V4,"Veículos","Leve",-1],["2",Q.V3,"Veículos","Grave",-5],
["2",Q.V1,"Veículos","Leve",-1],["2",Q.V2,"Veículos","Leve",-1],
["20",Q.P3,"Procedimentos","Leve",-1],["20",Q.V4,"Veículos","Leve",-1],
["21",Q.P1,"Procedimentos","Grave",-5],["21",Q.P6,"Procedimentos","Gravíssimo",-10],
["21",Q.V5,"Veículos","Leve",-1],["23",Q.V1,"Veículos","Leve",-1],
["24",Q.V1,"Veículos","Leve",-1],["25",Q.E1,"EPI/EPC","Leve",-1],
["27",Q.V3,"Veículos","Grave",-5],["29",Q.P12,"Procedimentos","Leve",-1],
["4",Q.P13,"Procedimentos","Leve",-1],["43",Q.V1,"Veículos","Leve",-1],
["48",Q.P2,"Procedimentos","Gravíssimo",-10],["49",Q.P2,"Procedimentos","Gravíssimo",-10],
["5",Q.P7,"Procedimentos","Leve",-1],["52",Q.P3,"Procedimentos","Leve",-1],
["52",Q.V1,"Veículos","Leve",-1],["55",Q.E1,"EPI/EPC","Leve",-1],
["56",Q.V1,"Veículos","Leve",-1],["68",Q.P1,"Procedimentos","Grave",-5],
["68",Q.V5,"Veículos","Leve",-1],["68",Q.E1,"EPI/EPC","Leve",-1],
["69",Q.P5,"Procedimentos","Gravíssimo",-10],["72",Q.V2,"Veículos","Leve",-1],
["74",Q.P1,"Procedimentos","Grave",-5],["74",Q.P9,"Procedimentos","Leve",-1],
["74",Q.P10,"Procedimentos","Grave",-5],["75",Q.P2,"Procedimentos","Gravíssimo",-10],
["75",Q.P6,"Procedimentos","Gravíssimo",-10],["75",Q.P15,"Procedimentos","Gravíssimo",-10],
["76",Q.P9,"Procedimentos","Leve",-1],["77",Q.P5,"Procedimentos","Gravíssimo",-10],
["77",Q.P2,"Procedimentos","Gravíssimo",-10],["77",Q.V1,"Veículos","Leve",-1],
["77",Q.V2,"Veículos","Leve",-1],["78",Q.V8,"Veículos","",0],
["8",Q.P3,"Procedimentos","Leve",-1],["8",Q.V2,"Veículos","Leve",-1],
["80",Q.P20,"Procedimentos","",0],["80",Q.E2,"EPI/EPC","Leve",-1],
["80",Q.P7,"Procedimentos","Leve",-1],["80",Q.P21,"Procedimentos","",0],
["81",Q.P14,"Procedimentos","Leve",-1],["81",Q.V5,"Veículos","Leve",-1],
["87",Q.P7,"Procedimentos","Leve",-1],["88",Q.E3,"EPI/EPC","Leve",-1],
["92",Q.E1,"EPI/EPC","Leve",-1],["93",Q.P1,"Procedimentos","Grave",-5],
["93",Q.P11,"Procedimentos","Leve",-1],["97",Q.P1,"Procedimentos","Grave",-5],
["97",Q.P17,"Procedimentos","",0],["97",Q.P11,"Procedimentos","Leve",-1],
["97",Q.P4,"Procedimentos","Grave",-5],["97",Q.P8,"Procedimentos","Grave",-5],
["119",Q.P2,"Procedimentos","Gravíssimo",-10],
["119",Q.P22,"Procedimentos","Gravíssimo",-10],
["119",Q.P5,"Procedimentos","Gravíssimo",-10],
["119",Q.E3,"EPI/EPC","Leve",-1],
["120",Q.E2,"EPI/EPC","Leve",-1],
["121",Q.V5,"Veículos","Leve",-1],
["121",Q.V8,"Veículos","",0],
["123",Q.E1,"EPI/EPC","Leve",-1],
["124",Q.E4,"EPI/EPC","Leve",-1],
["124",Q.P15,"Procedimentos","Gravíssimo",-10],
["125",Q.E1,"EPI/EPC","Leve",-1]
];

/* O histórico congelado, como veio do relatório original e dos formulários.
   As inspeções feitas pelo app moram no banco e são juntadas a isto na
   memória, a cada sincronização — ver Sincronia, em app.js. Guardar o
   original aqui é o que permite sincronizar duas vezes sem dobrar nada. */
const HISTORICO = { inspecoes: INSPECOES, nc: NC };

/* Carimbo de atualização do relatório original */
const ATUALIZACAO = "26/08/2026 08:48:46";

/* Versão do build — carimbada no rodapé para conferir cache do navegador */
const VERSAO = "20260826-1100";
