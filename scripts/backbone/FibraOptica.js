class FibraOptica {
    constructor(
        tipo,
        categoria,
        diametroNucleo,
        fonteOptica,
        protecao = null,
        capa = null,
        velocidadeLimite,
    ) {
        this.tipo = tipo;
        this.categoria = categoria;
        this.diametroNucleo = diametroNucleo;
        this.fonteOptica = fonteOptica;
        this.protecao = protecao;
        this.capa = capa;

        if (tipo === "FOSM") {
            this.setProtecao("Dry Core");
        }
    }

    getNome() {
        return `${this.tipo} ${this.categoria} ${this.protecao} ${this.capa}`;
    }

    setProtecao(protecao) {
        this.protecao = protecao;
    }

    setCapa(capa) {
        this.capa = capa;
    }
}

export default FibraOptica;
