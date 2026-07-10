import fibrasOpticasDisponiveis from "./listaFibrasOpticasDisponiveis.js";
import Midia from "./Midia.js";
import PadraoDeTransmissao from "./PadraoDeTransmissao.js";

const listaPadroesDeTransmissao = [
    new PadraoDeTransmissao(
        "1000Base-SX",
        [
            new Midia(fibrasOpticasDisponiveis[0], 550),
            new Midia(fibrasOpticasDisponiveis[1], 550),
        ],
        "850 nm",
        "1 GB",
    ),
    new PadraoDeTransmissao(
        "1000Base-LX",
        [
            new Midia(fibrasOpticasDisponiveis[0], 550),
            new Midia(fibrasOpticasDisponiveis[1], 550),
            new Midia(fibrasOpticasDisponiveis[2], 5000),
        ],
        "1310 nm",
        "1 GB",
    ),
    new PadraoDeTransmissao(
        "10GBase-LR",
        [new Midia(fibrasOpticasDisponiveis[2], 10000)],
        "1310 nm",
        "10 GB",
    ),
    new PadraoDeTransmissao(
        "10GBase-ER",
        [new Midia(fibrasOpticasDisponiveis[2], 40000)],
        "1550 nm",
        "10 GB",
    ),
    new PadraoDeTransmissao(
        "10GBase-SR",
        [
            new Midia(fibrasOpticasDisponiveis[0], 300),
            new Midia(fibrasOpticasDisponiveis[1], 400),
        ],
        "850 nm",
        "10 GB",
    ),
];

export default listaPadroesDeTransmissao;
