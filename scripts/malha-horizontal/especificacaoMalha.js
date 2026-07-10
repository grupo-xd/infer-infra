export const MARGEM_DE_PERCURSO_HORIZ = 1.1;
export const SOBRA_RACK_HORIZ = 3;
export const SOBRA_TOMADA = 0.3;
export const NUM_PORTAS_PATCH_PANEL = 24;
export const NUM_PORTAS_SWITCH_ACESSO = 24;

export function createDefaultHorizontalSpec() {
    return {
        cableType: "Cat6A",
        growthMargin: 15,
        averageDistanceOption: 30,
        floorsData: [
            { floorIndex: 1, telecomPoints: 12, networkPoints: 24, cftvPoints: 6 }
        ]
    };
}

export function calculateHorizontalSpecification(
    cableType,
    growthMargin,
    averageDistanceOption,
    floorsData
) {
    let totalCaboMetros = 0;
    let totalTomadasComFolga = 0;
    
    let totalTelecomComFolga = 0;
    let totalNetworkComFolga = 0;
    let totalCftvComFolga = 0;

    const detalhePorAndar = [];

    for (const andar of floorsData) {
        const dadosAndar = calculoPorAndar(andar, growthMargin, averageDistanceOption);

        totalCaboMetros += dadosAndar.metragemCaboTotal;
        totalTomadasComFolga += dadosAndar.totalPontosComFolga;
        
        const telecomFolga = Math.ceil((andar.telecomPoints || 0) * (1 + growthMargin / 100));
        const networkFolga = Math.ceil((andar.networkPoints || 0) * (1 + growthMargin / 100));
        const cftvFolga = Math.ceil((andar.cftvPoints || 0) * (1 + growthMargin / 100));
        
        totalTelecomComFolga += telecomFolga;
        totalNetworkComFolga += networkFolga;
        totalCftvComFolga += cftvFolga;

        const ppAndar = Math.ceil(dadosAndar.totalPontosComFolga / NUM_PORTAS_PATCH_PANEL);
        const swAndar = Math.ceil(dadosAndar.totalPontosComFolga / NUM_PORTAS_SWITCH_ACESSO);
        const dvrAndar = Math.ceil(cftvFolga / 24) || 1;

        const uPP = ppAndar * 1;
        const uSW = swAndar * 1;
        const uDVR = dvrAndar * 2;
        const uOrg = (ppAndar + swAndar) * 1;
        const uBand = 4;
        const uExaust = 2;
        
        let uDioAndar = andar.floorIndex === 1 ? 2 : 1;

        const uTotalEquipamentos = uPP + uSW + uDVR + uOrg + uBand + uExaust + uDioAndar;
        const uComMargemSeguranca = Math.ceil(uTotalEquipamentos * 1.5);
        const uComercial = comercialRackComercialSize(uComMargemSeguranca);
        const porcasParafusos = (ppAndar + swAndar + dvrAndar + uOrg + (uDioAndar > 0 ? 1 : 0) + 2) * 4;

        detalhePorAndar.push({
            andar: andar.floorIndex,
            pontosBrutos: dadosAndar.pontosBrutos,
            totalPontosComFolga: dadosAndar.totalPontosComFolga,
            metragemCaboTotal: dadosAndar.metragemCaboTotal,
            patchPanels: ppAndar,
            switches: swAndar,
            dvr: dvrAndar,
            organizadores: uOrg,
            dioUnits: uDioAndar,
            uCalculado: uComMargemSeguranca,
            uNecessarios: uComercial,
            detalheU: `${uDioAndar}U DIO + ${uPP}U Patch Panel + ${uSW}U Switch + ${uDVR}U DVR + ${uOrg}U Organizador + ${uBand}U Bandeja + ${uExaust}U Exaustor = ${uTotalEquipamentos}U (Folga: ${uComMargemSeguranca}U -> Padrão Comercial: ${uComercial}U)`,
            porcasGaiola: porcasParafusos,
            parafusos: porcasParafusos,
            reguaTomadas: Math.ceil((swAndar + dvrAndar + 2) / 8) * 8,
            telecomPoints: telecomFolga,
            networkPoints: networkFolga,
            cftvPoints: cftvFolga
        });
    }

    return {
        cabeamento: {
            categoria: cableType,
            metragemTotal: Math.ceil(totalCaboMetros),
            caixas305m: Math.ceil(totalCaboMetros / 305),
        },
        areaDeTrabalho: {
            conectoresFemea: totalTomadasComFolga,
            espelhos: totalTomadasComFolga,
            etiquetasTomada: totalTomadasComFolga,
            etiquetasEspelho: totalTomadasComFolga,
        },
        cordoes: {
            patchCordsUsuario: { quantidade: totalTomadasComFolga, tamanho: 2.5, categoria: cableType },
            patchCordsRack: {
                azulDados: { quantidade: totalNetworkComFolga, tamanho: 1.5, categoria: cableType },
                amareloVoz: { quantidade: totalTelecomComFolga, tamanho: 1.5, categoria: cableType },
                vermelhoCftv: { quantidade: totalCftvComFolga, tamanho: 1.5, category: cableType }
            }
        },
        identificacao: {
            etiquetasPatchCord: totalTomadasComFolga * 2
        },
        detalhePorAndar
    };
}

function comercialRackComercialSize(uCalculado) {
    if (uCalculado <= 16) {
        for (let u = 4; u <= 16; u += 2) {
            if (uCalculado <= u) return u;
        }
    } else {
        for (let u = 20; u <= 60; u += 4) {
            if (uCalculado <= u) return u;
        }
    }
    return Math.ceil(uCalculado / 4) * 4;
}

function calculoPorAndar(andar, folga, distanciaOpcao) {
    const pontosBrutos = (andar.telecomPoints || 0) + (andar.networkPoints || 0) + (andar.cftvPoints || 0);
    const totalPontosComFolga = Math.ceil(pontosBrutos * (1 + folga / 100));

    const comprimentoPorCabo = (distanciaOpcao + SOBRA_RACK_HORIZ + SOBRA_TOMADA) * MARGEM_DE_PERCURSO_HORIZ;
    const metragemCaboTotal = totalPontosComFolga * comprimentoPorCabo;

    return {
        pontosBrutos,
        totalPontosComFolga,
        metragemCaboTotal,
        caixasDeCabo: Math.ceil(metragemCaboTotal / 305)
    };
}
