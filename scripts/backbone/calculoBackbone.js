import listaPadroesDeTransmissao from "./listaPadroesDeTransmissao.js";

const formulario = document.getElementById("form-orcamento");

// Constantes de Engenharia de Redes
const MARGEM_DE_PERCURSO = 1.1;
const SOBRA_RACK = 6;
const NUM_PORTAS_DIO = 48; // Padronizado para conectores de alta densidade LC Duplex
const NUM_PORTAS_SFP_SWITCH = 4;
const LISTA_NUM_FIBRAS = [12, 24, 48];

formulario.addEventListener("submit", (event) => {
    // Evita o refresh da página
    event.preventDefault();

    // Mapeia e higieniza os dados do formulário (Garante tipos numéricos)
    const predioUm = {
        nome: document.getElementById("building-1-name").value,
        numAndares: Number(document.getElementById("building-1-floors").value),
        alturaPiso: Number(
            document.getElementById("building-1-floor-height").value,
        ),
        distRackShaft: Number(
            document.getElementById("building-1-rack-shaft-dist").value,
        ),
        numLinksAtivos:
            Number(
                document.getElementById("building-1-links-per-floor").value,
            ) * Number(document.getElementById("building-1-floors").value),
        dist: 0, // Prédio da SEQ assume distância zero da central
    };

    const predioDois = {
        nome: document.getElementById("building-2-name").value,
        numAndares: Number(document.getElementById("building-2-floors").value),
        alturaPiso: Number(
            document.getElementById("building-2-floor-height").value,
        ),
        distRackShaft: Number(
            document.getElementById("building-2-rack-shaft-dist").value,
        ),
        numLinksAtivos:
            Number(
                document.getElementById("building-2-links-per-floor").value,
            ) * Number(document.getElementById("building-2-floors").value),
        dist: Number(document.getElementById("building-2-distance").value),
        forma: document.getElementById("building-2-inframode").value,
    };

    const velocidade = document.getElementById("outdoor-speed").value;
    const folga = Number(document.getElementById("growth-margin").value);

    // Dispara a função principal de processamento
    const resultadoOrcamento = calculo(
        [predioUm, predioDois],
        velocidade,
        folga,
    );

    console.log("=== RELATÓRIO DE ESPECIFICAÇÃO TÉCNICA ===");
    console.log(resultadoOrcamento);
});

function calculo(predios, velocidadeGlobal, folgaGlobal) {
    const fibrasOpticas2 = {
        interna: { nome: "", fibras: [], tipo: "interna" },
        externaAereo: {
            nome: "",
            numFibras: 0,
            tamanho: 0,
            tipo: "externa",
            subTipo: "aereo",
        },
        externaSubterraneo: {
            nome: "",
            numFibras: 0,
            tamanho: 0,
            tipo: "externa",
            subTipo: "subterraneo",
        },
    };

    let totalDios = 0;
    let totalPatchCordsOpticos = 0;
    let totalSwitchesHibridos = 0;
    let totalLinks = 0;
    let maiorAlturaPredio = 0;

    // Contadores para o acúmulo de conectividade interna
    let totalPigtailsQuantidade = 0;
    let totalCordoesQuantidade = 0;

    let maiorDistanciaAereo = 0;
    let maiorDistanciaSubterraneo = 0;

    for (let predio of predios) {
        const dadosPredio = calculoPorPredio(predio, folgaGlobal);

        maiorAlturaPredio = Math.max(
            maiorAlturaPredio,
            predio.alturaPiso * predio.numAndares,
        );

        if (predio.forma === "aereo") {
            maiorDistanciaAereo = Math.max(maiorDistanciaAereo, predio.dist);
        } else if (predio.forma === "subterraneo") {
            maiorDistanciaSubterraneo = Math.max(
                maiorDistanciaSubterraneo,
                predio.dist,
            );
        }

        for (let tamanhoFO of dadosPredio.tamanhoFibraOptica) {
            if (tamanhoFO.tipo === "interna") {
                const existente = fibrasOpticas2.interna.fibras.find(
                    (c) => c.numFibras === dadosPredio.aproxNumFibras,
                );
                if (existente) {
                    existente.tamanho += tamanhoFO.tamanho;
                } else {
                    fibrasOpticas2.interna.fibras.push({
                        numFibras: dadosPredio.aproxNumFibras,
                        tamanho: tamanhoFO.tamanho,
                    });
                }
            } else if (tamanhoFO.tipo === "externa") {
                if (predio.forma === "aereo") {
                    fibrasOpticas2.externaAereo.numFibras = Math.max(
                        fibrasOpticas2.externaAereo.numFibras,
                        dadosPredio.aproxNumFibras,
                    );
                    fibrasOpticas2.externaAereo.tamanho += tamanhoFO.tamanho;
                } else if (predio.forma === "subterraneo") {
                    fibrasOpticas2.externaSubterraneo.numFibras = Math.max(
                        fibrasOpticas2.externaSubterraneo.numFibras,
                        dadosPredio.aproxNumFibras,
                    );
                    fibrasOpticas2.externaSubterraneo.tamanho +=
                        tamanhoFO.tamanho;
                }
            }
        }

        totalDios += dadosPredio.numDios;
        totalPatchCordsOpticos += dadosPredio.numPatchCordsOpticos;
        totalSwitchesHibridos += dadosPredio.numSwitchesHibridos;
        totalLinks += predio.numLinksAtivos;

        // Acumula os acessórios calculados por prédio
        totalPigtailsQuantidade += dadosPredio.numPigtails;
        totalCordoesQuantidade += dadosPredio.numCordoesOpticos;
    }

    const numSwitchesSeq = Math.ceil(totalLinks / NUM_PORTAS_SFP_SWITCH);

    // Objetos estruturados para acessórios internos
    const pigtails = {
        tipo: "",
        quantidade: totalPigtailsQuantidade,
        tamanho: 1.5,
        encaixe: "LC",
    };
    const cordoesOpticos = {
        tipo: "",
        quantidade: totalCordoesQuantidade,
        tamanho: 2.5,
        encaixe: "LC",
    };

    const result = escolherTipoFibra(velocidadeGlobal, maiorAlturaPredio);
    const classeFibraInterna = result ? result.nome : null;

    if (result) {
        pigtails.tipo = result.tipo;
        cordoesOpticos.tipo = result.tipo;
    }

    const objAereo = escolherTipoFibra(
        velocidadeGlobal,
        maiorDistanciaAereo,
        "aereo",
    );
    const classeFibraAereo = objAereo ? objAereo.nome : null;

    const objSubt = escolherTipoFibra(
        velocidadeGlobal,
        maiorDistanciaSubterraneo,
        "subterraneo",
    );
    const classeFibraSubterraneo = objSubt ? objSubt.nome : null;

    if (classeFibraInterna) {
        for (let itemFibra of fibrasOpticas2.interna.fibras) {
            itemFibra.nome = classeFibraInterna;
        }
        fibrasOpticas2.interna.nome = classeFibraInterna;
    }

    if (classeFibraAereo && fibrasOpticas2.externaAereo.tamanho > 0) {
        fibrasOpticas2.externaAereo.nome = classeFibraAereo;
    } else {
        fibrasOpticas2.externaAereo.nome =
            fibrasOpticas2.externaAereo.tamanho > 0
                ? "Excede limite físico"
                : "";
    }

    if (
        classeFibraSubterraneo &&
        fibrasOpticas2.externaSubterraneo.tamanho > 0
    ) {
        fibrasOpticas2.externaSubterraneo.nome = classeFibraSubterraneo;
    } else {
        fibrasOpticas2.externaSubterraneo.nome =
            fibrasOpticas2.externaSubterraneo.tamanho > 0
                ? "Excede limite físico"
                : "";
    }

    // --- NOVA LÓGICA: ESPECIFICAÇÃO DE ATIVOS (SWITCHES E TRANSCEPTORES) ---

    // Quantidade de switches dedicados apenas para a distribuição nos andares/acesso
    const quantidadeSwitchesAcesso = totalSwitchesHibridos - numSwitchesSeq;

    const switches = {
        core: {
            modelo: `Switch de Core L3 com portas SFP+ ${velocidadeGlobal}`,
            quantidade: numSwitchesSeq,
        },
        acesso: {
            modelo: `Switch de Acesso L2 24 Portas RJ-45 + 4 Portas de Uplink SFP+ ${velocidadeGlobal}`,
            quantidade:
                quantidadeSwitchesAcesso > 0 ? quantidadeSwitchesAcesso : 0,
        },
    };

    // Identificação do tipo físico do laser baseado no tipo de fibra escolhido na rede externa
    let modeloTransceptorSFP = "Não compatível";
    if (objAereo || objSubt) {
        const tipoExternoPredominante = objAereo?.tipo || objSubt?.tipo;
        modeloTransceptorSFP =
            tipoExternoPredominante === "FOMM"
                ? `Módulo Transceptor SFP+ ${velocidadeGlobal}-SR (Multimodo 850nm)`
                : `Módulo Transceptor SFP+ ${velocidadeGlobal}-LR (Monomodo 1310nm)`;
    }

    const transceptores = {
        modelo: modeloTransceptorSFP,
        quantidade: totalLinks * 2, // 1 em cada ponta do link ativo
    };

    return {
        fibrasEspecificadas: [
            fibrasOpticas2.interna.nome,
            fibrasOpticas2.externaAereo.nome,
            fibrasOpticas2.externaSubterraneo.nome,
        ].filter((nome) => nome !== ""),

        fibrasOpticas2,
        totalDios,
        totalPatchCordsOpticos,
        totalSwitchesHibridos,
        numSwitchesSeq,

        // Retorno dos novos blocos estruturados
        pigtails,
        cordoesOpticos,
        switches,
        transceptores,
    };
}

function calculoPorPredio(predio, folga) {
    const tamanhoFibraOptica = [
        {
            tipo: "interna",
            tamanho:
                (predio.numAndares * predio.alturaPiso + predio.distRackShaft) *
                    MARGEM_DE_PERCURSO +
                SOBRA_RACK,
        },
        { tipo: "externa", tamanho: predio.dist * MARGEM_DE_PERCURSO },
    ];

    const numFibras = predio.numLinksAtivos * 2 * (1 + folga / 100);
    const numPigtails = numFibras;
    const numCordoesOpticos = numFibras;
    const aproxNumFibras = arredondarNumFibras(numFibras);

    const numDios = Math.ceil(numFibras / NUM_PORTAS_DIO) + 1;
    const numPatchCordsOpticos = predio.numLinksAtivos * 2;
    const numSwitchesSeq = Math.ceil(
        predio.numLinksAtivos / NUM_PORTAS_SFP_SWITCH,
    );
    const numSwitchesHibridos = numSwitchesSeq + predio.numAndares;

    return {
        tamanhoFibraOptica,
        aproxNumFibras,
        numPigtails,
        numCordoesOpticos,
        numDios,
        numPatchCordsOpticos,
        numSwitchesHibridos,
    };
}

function escolherTipoFibra(velocidade, distanciaMaxima, ambiente = null) {
    const fibrasOpticas = padroesAdequados(velocidade, distanciaMaxima);
    if (!fibrasOpticas[0]) return null;

    const corpo = definirProtecaoECapa(
        fibrasOpticas[0].fibraOptica.tipo,
        ambiente,
    );
    fibrasOpticas[0].fibraOptica.setCapa(corpo.capa);
    fibrasOpticas[0].fibraOptica.setProtecao(corpo.protecao);

    return {
        nome: fibrasOpticas[0].fibraOptica.getNome(),
        tipo: fibrasOpticas[0].fibraOptica.tipo,
    };
}

function padroesAdequados(velocidade, distancia) {
    let result = [];
    for (const padraoTransmissao of listaPadroesDeTransmissao) {
        if (padraoTransmissao.velocidade === velocidade) {
            for (const midia of padraoTransmissao.listaMidias) {
                if (midia.distancia >= distancia) {
                    result.push({
                        padraoTransmissao: padraoTransmissao.transceiver,
                        fibraOptica: midia.fibraOptica,
                        distancia: midia.distancia,
                    });
                }
            }
        }
    }
    result.sort((a, b) => a.distancia - b.distancia);
    return result;
}

function arredondarNumFibras(numFibras) {
    for (let num of LISTA_NUM_FIBRAS) {
        if (numFibras <= num) return num;
    }
    return LISTA_NUM_FIBRAS[LISTA_NUM_FIBRAS.length - 1];
}

function definirProtecaoECapa(tipo, ambiente = null) {
    const interna = ambiente === null;
    if (interna) {
        if (tipo === "FOMM") return { protecao: "Tight Buffer", capa: "LSZH" };
        return { protecao: "Dry Core", capa: "LSZH" };
    }
    if (tipo === "FOMM") {
        if (ambiente == "aereo") {
            return { protecao: "Loose Autossustentável", capa: "PE" };
        }
        return { protecao: "Loose", capa: "PE" };
    }
    return { protecao: "Dry Core", capa: "PE" };
}
