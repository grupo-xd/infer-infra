import listaPadroesDeTransmissao from "./ListaPadroesDeTransmissao.js";

function definirTipoFibra(velocidade, distanciaMaxima) {
    const fibrasOpticas = padroesAdequados(velocidade, distanciaMaxima);
    if (!fibrasOpticas[0]) return null;

    const corpo = definirProtecaoECapa(fibrasOpticas[0].fibraOptica.tipo);
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

function definirProtecaoECapa(tipo) {
    if (tipo === "FOMM") return { protecao: "Tight Buffer", capa: "LSZH" };
    return { protecao: "Dry Core", capa: "LSZH" };
}

export default definirTipoFibra;
