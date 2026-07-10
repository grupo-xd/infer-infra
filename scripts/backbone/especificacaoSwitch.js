const LISTA_NUM_PORTAS = [8, 24, 48];

function especificacaoSwitch(numLinksAtivos, folga, velocidade) {
    const numPortas = numLinksAtivos * (1 + folga / 100);

    const switchCore = {
        modelo: `Switch de Core L3 - 24 Portas SFP+ ${velocidade}`,
        quantidade: 1,
    };

    const switchesAcesso = {
        modelos: [],
    };

    const result = calcularQuantidadePortas(numLinksAtivos, folga);
    result.forEach((quantidade, numPortas) => {
        if (quantidade > 0) {
            switchesAcesso.modelos.push({
                nome: `Switch de Acesso L2 - ${numPortas} Portas RJ-45 Gigabit + 4 Portas de Uplink SFP+ ${velocidade}`,
                quantidade,
            });
        }
    });

    return { switchCore, switchesAcesso, mapaResultados: result };
}

function calcularQuantidadePortas(numLinksAtivos, folga) {
    let result = new Map();

    for (const NUM_PORTAS of LISTA_NUM_PORTAS) {
        result.set(NUM_PORTAS, 0);
    }

    let quantidadePortas = Math.ceil(numLinksAtivos * (1 + folga / 100));

    for (let i = LISTA_NUM_PORTAS.length - 1; i >= 0; i--) {
        const atual = LISTA_NUM_PORTAS[i];

        if (quantidadePortas >= atual) {
            const qtdSwitches = Math.floor(quantidadePortas / atual);
            result.set(atual, qtdSwitches);

            quantidadePortas = quantidadePortas % atual;
        }
    }

    if (quantidadePortas > 0) {
        const menorSwitch = LISTA_NUM_PORTAS[0];
        const qtdAtualdoMenor = result.get(menorSwitch);
        result.set(menorSwitch, qtdAtualdoMenor + 1);
    }

    return result;
}

export default especificacaoSwitch;
