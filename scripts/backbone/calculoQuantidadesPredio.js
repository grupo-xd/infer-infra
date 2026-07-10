const LISTA_NUM_FIBRAS = [12, 24, 48];
const MARGEM_DE_PERCURSO = 1.1;
const SOBRA_RACK = 6;
const NUM_PORTAS_SFP_SWITCH = 4;

const NUM_PORTAS_DIO = 48; // Padronizado para conectores de alta densidade LC Duplex

function calculoQuantidadesPredio(predio, folga) {
    const tamanhoFibraOptica = Math.ceil(
        (predio.numAndares * predio.alturaPiso + predio.distRackShaft) *
            MARGEM_DE_PERCURSO +
            SOBRA_RACK,
    );

    const numFibrasAtivas = predio.numLinksAtivos * 2 * (1 + folga / 100);
    const numPigtails = numFibrasAtivas;
    const numCordoesOpticos = numFibrasAtivas;
    const numTotalFibras = arredondarNumTotalFibras(numFibrasAtivas);

    const numDios = Math.ceil(numFibrasAtivas / NUM_PORTAS_DIO) + 1;
    const numPatchCordsOpticos = predio.numLinksAtivos * 2;
    const numSwitchesSeq = Math.ceil(
        predio.numLinksAtivos / NUM_PORTAS_SFP_SWITCH,
    );
    const numSwitchesHibridos = numSwitchesSeq + predio.numAndares;

    return {
        tamanhoFibraOptica,
        numTotalFibras,
        numPigtails,
        numCordoesOpticos,
        numDios,
        numPatchCordsOpticos,
        numSwitchesHibridos,
    };
}

function arredondarNumTotalFibras(numFibras) {
    for (let num of LISTA_NUM_FIBRAS) {
        if (numFibras <= num) return num;
    }
    return LISTA_NUM_FIBRAS[LISTA_NUM_FIBRAS.length - 1];
}

export default calculoQuantidadesPredio;
