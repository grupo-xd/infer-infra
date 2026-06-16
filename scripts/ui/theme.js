const BASE_PATH =
    location.hostname.endsWith("github.io")
        ? `/${location.pathname.split('/')[1]}`
        : ""

const pageRoot = document.documentElement

const themeButtonEl = document.getElementById("theme-button")
const themeButtonImageEl = themeButtonEl.getElementsByTagName("img")[0]

const themeImages = {
    light: `${BASE_PATH}/assets/ui/light_mode.svg`,
    dark: `${BASE_PATH}/assets/ui/dark_mode.svg`
}

const theme = Object.freeze({
    LIGHT: "light",
    DARK: "dark"
})

let actualTheme

function switchTheme() {
    if (actualTheme === theme.DARK)
        actualTheme = theme.LIGHT
    else if (actualTheme === theme.LIGHT)
        actualTheme = theme.DARK

    renderTheme()
}

function renderButton() {
    themeButtonImageEl.src =
        actualTheme === theme.LIGHT
            ? themeImages.dark
            : themeImages.light

    if (actualTheme === theme.DARK) {
        pageRoot.classList.add("dark")
        themeButtonImageEl.style.filter = "none"
    } else {
        pageRoot.classList.remove("dark")
        themeButtonImageEl.style.filter = "invert(1)"
    }
}

function renderTheme() {
    renderButton()
}

function initTheme() {
    actualTheme = theme.LIGHT
    renderTheme()
}

themeButtonEl.addEventListener("click", switchTheme)

document.addEventListener("DOMContentLoaded", () => {
    initTheme()
})
