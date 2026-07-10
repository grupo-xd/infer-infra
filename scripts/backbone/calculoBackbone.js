import calculoQuantidadesPredio from "./calculoQuantidadesPredio.js";
import definirTipoFibra from "./definirTipoFibra.js";
import especificacaoSwitch from "./especificacaoSwitch.js";

const formulario = document.getElementById("form-orcamento");

formulario.addEventListener("submit", (event) => {
    event.preventDefault();

    const predio = {
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
    };

    predio.altura = predio.alturaPiso * predio.numAndares;

    const velocidade = document.getElementById("outdoor-speed").value;
    const folga = Number(document.getElementById("growth-margin").value);

    const resultadoOrcamento = calculo(predio, velocidade, folga);

    console.log("=== RELATÓRIO DE ESPECIFICAÇÃO TÉCNICA ===");
    console.log(resultadoOrcamento);
});

function calculo(predio, velocidade, folga) {
    const fibraOptica = {
        nome: "",
        numFibras: 0,
        tamanho: 0,
    };

    let totalDios = 0;
    let totalPatchCordsOpticos = 0;
    let totalPigtailsQuantidade = 0;
    let totalCordoesQuantidade = 0;

    // 1. Processamento dos dados físicos do prédio
    const dadosPredio = calculoQuantidadesPredio(predio, folga);
    fibraOptica.tamanho = Math.ceil(dadosPredio.tamanhoFibraOptica);
    fibraOptica.numFibras = dadosPredio.numTotalFibras;

    totalDios += dadosPredio.numDios;
    totalPatchCordsOpticos += dadosPredio.numPatchCordsOpticos;
    totalPigtailsQuantidade += dadosPredio.numPigtails;
    totalCordoesQuantidade += dadosPredio.numCordoesOpticos;

    // 2. Processamento dos Ativos (Switches e componentes de rede)
    // O seu especificacaoSwitch agora retorna o objeto com { switchCore, switchesAcesso, mapaResultados }
    const dadosSwitches = especificacaoSwitch(
        predio.numAndares,
        predio.numLinksAtivos,
        folga,
        velocidade,
    );

    // 3. Cálculo automatizado dos Transceptores SFP baseado no hardware de acesso ativo
    let totalSwitchesAcesso = 0;
    dadosSwitches.mapaResultados.forEach((quantidade) => {
        totalSwitchesAcesso += quantidade;
    });

    const transceptores = {
        modelo: "",
        quantidade: totalSwitchesAcesso * 4, // Uplink duplo (2 no acesso + 2 no core por switch)
    };

    // 4. Conectividade Interna (Pigtails e Patch Cords)
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

    // 5. Descoberta do tipo físico do laser e da mídia óptica
    const result = definirTipoFibra(velocidade, predio.altura);

    if (result) {
        pigtails.tipo = result.tipo;
        cordoesOpticos.tipo = result.tipo;
        fibraOptica.nome = result.nome;

        // Atribui o modelo correto do laser SFP dependendo se a fibra é Monomodo (FOMM) ou Multimodo (FOMM)
        transceptores.modelo =
            result.tipo === "FOMM"
                ? `Módulo Transceptor SFP+ ${velocidade}-SR (Multimodo 850nm)`
                : `Módulo Transceptor SFP+ ${velocidade}-LR (Monomodo 1310nm)`;
    }

    // 6. Retorno do Memorial Descritivo estruturado
    return {
        fibraOptica,
        totalDios,
        totalPatchCordsOpticos,
        pigtails,
        cordoesOpticos,
        ativos: {
            switchCore: dadosSwitches.switchCore,
            switchesAcesso: dadosSwitches.switchesAcesso.modelos,
            transceptores,
        },
    };
}
