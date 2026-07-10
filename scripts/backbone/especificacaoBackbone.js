
import listaPadroesDeTransmissao from "./listaPadroesDeTransmissao.js"

export const MARGEM_DE_PERCURSO = 1.1
export const SOBRA_RACK = 6
export const NUM_PORTAS_DIO = 48
export const NUM_PORTAS_SFP_SWITCH = 4
export const LISTA_NUM_FIBRAS = [12, 24, 48]

export function createDefaultBackboneSpec() {
    return {
        outdoorSpeed: "10 GB",
        growthMargin: 20,
        building1: {
            name: "Prédio Principal (A)",
            floors: 4,
            floorHeight: 3,
            rackShaftDistance: 10,
            linksPerFloor: 2,
        },
        building2: {
            name: "Prédio Anexo (B)",
            floors: 2,
            floorHeight: 3,
            rackShaftDistance: 5,
            linksPerFloor: 4,
            distance: 250,
            infraMode: "subterraneo",
        },
    }
}

export function calculateBackboneSpecification(
    predios,
    velocidadeGlobal,
    folgaGlobal,
) {
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
    }

    let totalDios = 0
    let totalPatchCordsOpticos = 0
    let totalSwitchesHibridos = 0
    let totalLinks = 0
    let maiorAlturaPredio = 0

    let totalPigtailsQuantidade = 0
    let totalCordoesQuantidade = 0

    let maiorDistanciaAereo = 0
    let maiorDistanciaSubterraneo = 0

    for (const predio of predios) {
        const dadosPredio = calculoPorPredio(predio, folgaGlobal)

        maiorAlturaPredio = Math.max(
            maiorAlturaPredio,
            predio.alturaPiso * predio.numAndares,
        )

        if (predio.forma === "aereo") {
            maiorDistanciaAereo = Math.max(maiorDistanciaAereo, predio.dist)
        } else if (predio.forma === "subterraneo") {
            maiorDistanciaSubterraneo = Math.max(
                maiorDistanciaSubterraneo,
                predio.dist,
            )
        }

        for (const tamanhoFO of dadosPredio.tamanhoFibraOptica) {
            if (tamanhoFO.tipo === "interna") {
                const existente = fibrasOpticas2.interna.fibras.find(
                    (c) => c.numFibras === dadosPredio.aproxNumFibras,
                )
                if (existente) {
                    existente.tamanho += tamanhoFO.tamanho
                } else {
                    fibrasOpticas2.interna.fibras.push({
                        numFibras: dadosPredio.aproxNumFibras,
                        tamanho: tamanhoFO.tamanho,
                    })
                }
            } else if (tamanhoFO.tipo === "externa") {
                if (predio.forma === "aereo") {
                    fibrasOpticas2.externaAereo.numFibras = Math.max(
                        fibrasOpticas2.externaAereo.numFibras,
                        dadosPredio.aproxNumFibras,
                    )
                    fibrasOpticas2.externaAereo.tamanho += tamanhoFO.tamanho
                } else if (predio.forma === "subterraneo") {
                    fibrasOpticas2.externaSubterraneo.numFibras = Math.max(
                        fibrasOpticas2.externaSubterraneo.numFibras,
                        dadosPredio.aproxNumFibras,
                    )
                    fibrasOpticas2.externaSubterraneo.tamanho +=
                        tamanhoFO.tamanho
                }
            }
        }

        totalDios += dadosPredio.numDios
        totalPatchCordsOpticos += dadosPredio.numPatchCordsOpticos
        totalSwitchesHibridos += dadosPredio.numSwitchesHibridos
        totalLinks += predio.numLinksAtivos
        totalPigtailsQuantidade += dadosPredio.numPigtails
        totalCordoesQuantidade += dadosPredio.numCordoesOpticos
    }

    const numSwitchesSeq = Math.ceil(totalLinks / NUM_PORTAS_SFP_SWITCH)

    const pigtails = {
        tipo: "",
        quantidade: totalPigtailsQuantidade,
        tamanho: 1.5,
        encaixe: "LC",
    }
    const cordoesOpticos = {
        tipo: "",
        quantidade: totalCordoesQuantidade,
        tamanho: 2.5,
        encaixe: "LC",
    }

    const result = escolherTipoFibra(velocidadeGlobal, maiorAlturaPredio)
    const classeFibraInterna = result ? result.nome : null

    if (result) {
        pigtails.tipo = result.tipo
        cordoesOpticos.tipo = result.tipo
    }

    const objAereo = escolherTipoFibra(
        velocidadeGlobal,
        maiorDistanciaAereo,
        "aereo",
    )
    const classeFibraAereo = objAereo ? objAereo.nome : null

    const objSubt = escolherTipoFibra(
        velocidadeGlobal,
        maiorDistanciaSubterraneo,
        "subterraneo",
    )
    const classeFibraSubterraneo = objSubt ? objSubt.nome : null

    if (classeFibraInterna) {
        for (const itemFibra of fibrasOpticas2.interna.fibras) {
            itemFibra.nome = classeFibraInterna
        }
        fibrasOpticas2.interna.nome = classeFibraInterna
    }

    if (classeFibraAereo && fibrasOpticas2.externaAereo.tamanho > 0) {
        fibrasOpticas2.externaAereo.nome = classeFibraAereo
    } else {
        fibrasOpticas2.externaAereo.nome =
            fibrasOpticas2.externaAereo.tamanho > 0
                ? "Excede limite físico"
                : ""
    }

    if (
        classeFibraSubterraneo &&
        fibrasOpticas2.externaSubterraneo.tamanho > 0
    ) {
        fibrasOpticas2.externaSubterraneo.nome = classeFibraSubterraneo
    } else {
        fibrasOpticas2.externaSubterraneo.nome =
            fibrasOpticas2.externaSubterraneo.tamanho > 0
                ? "Excede limite físico"
                : ""
    }

    const quantidadeSwitchesAcesso = totalSwitchesHibridos - numSwitchesSeq

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
    }

    let modeloTransceptorSFP = "Não compatível"
    if (objAereo || objSubt) {
        const tipoExternoPredominante = objAereo?.tipo || objSubt?.tipo
        modeloTransceptorSFP =
            tipoExternoPredominante === "FOMM"
                ? `Módulo Transceptor SFP+ ${velocidadeGlobal}-SR (Multimodo 850nm)`
                : `Módulo Transceptor SFP+ ${velocidadeGlobal}-LR (Monomodo 1310nm)`
    }

    const transceptores = {
        modelo: modeloTransceptorSFP,
        quantidade: totalLinks * 2,
    }

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
        pigtails,
        cordoesOpticos,
        switches,
        transceptores,
    }
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
    ]

    const numFibras = predio.numLinksAtivos * 2 * (1 + folga / 100)
    const numPigtails = numFibras
    const numCordoesOpticos = numFibras
    const aproxNumFibras = arredondarNumFibras(numFibras)

    const numDios = Math.ceil(numFibras / NUM_PORTAS_DIO) + 1
    const numPatchCordsOpticos = predio.numLinksAtivos * 2
    const numSwitchesSeq = Math.ceil(
        predio.numLinksAtivos / NUM_PORTAS_SFP_SWITCH,
    )
    const numSwitchesHibridos = numSwitchesSeq + predio.numAndares

    return {
        tamanhoFibraOptica,
        aproxNumFibras,
        numPigtails,
        numCordoesOpticos,
        numDios,
        numPatchCordsOpticos,
        numSwitchesHibridos,
    }
}

function escolherTipoFibra(velocidade, distanciaMaxima, ambiente = null) {
    const fibrasOpticas = padroesAdequados(velocidade, distanciaMaxima)
    if (!fibrasOpticas[0]) return null

    const corpo = definirProtecaoECapa(
        fibrasOpticas[0].fibraOptica.tipo,
        ambiente,
    )
    fibrasOpticas[0].fibraOptica.setCapa(corpo.capa)
    fibrasOpticas[0].fibraOptica.setProtecao(corpo.protecao)

    return {
        nome: fibrasOpticas[0].fibraOptica.getNome(),
        tipo: fibrasOpticas[0].fibraOptica.tipo,
    }
}

function padroesAdequados(velocidade, distancia) {
    const result = []
    for (const padraoTransmissao of listaPadroesDeTransmissao) {
        if (padraoTransmissao.velocidade === velocidade) {
            for (const midia of padraoTransmissao.listaMidias) {
                if (midia.distancia >= distancia) {
                    result.push({
                        padraoTransmissao: padraoTransmissao.transceiver,
                        fibraOptica: midia.fibraOptica,
                        distancia: midia.distancia,
                    })
                }
            }
        }
    }
    result.sort((a, b) => a.distancia - b.distancia)
    return result
}

function arredondarNumFibras(numFibras) {
    for (const num of LISTA_NUM_FIBRAS) {
        if (numFibras <= num) return num
    }
    return LISTA_NUM_FIBRAS[LISTA_NUM_FIBRAS.length - 1]
}

function definirProtecaoECapa(tipo, ambiente = null) {
    const interna = ambiente === null
    if (interna) {
        if (tipo === "FOMM") return { protecao: "Tight Buffer", capa: "LSZH" }
        return { protecao: "Dry Core", capa: "LSZH" }
    }
    if (tipo === "FOMM") {
        if (ambiente == "aereo") {
            return { protecao: "Loose Autossustentável", capa: "PE" }
        }
        return { protecao: "Loose", capa: "PE" }
    }
    return { protecao: "Dry Core", capa: "PE" }
}
