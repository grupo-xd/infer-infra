const BASE_PATH = location.hostname.endsWith("github.io")
    ? `/${location.pathname.split("/")[1]}`
    : ""

const theme = Object.freeze({
    LIGHT: "light",
    DARK: "dark",
})

const pageRoot = document.documentElement
const themeButtonEl = document.getElementById("theme-button")
const themeButtonImageEl = themeButtonEl.querySelector("img")
const logoImageEl = document.querySelector("#header .logo img")

const themeImages = {
    light: `${BASE_PATH}/assets/ui/light-mode.svg`,
    dark: `${BASE_PATH}/assets/ui/dark-mode.svg`,
}

const logoImages = {
    light: `${BASE_PATH}/assets/logo/light-logo.png`,
    dark: `${BASE_PATH}/assets/logo/dark-logo.png`,
}

const iconImages = {
    light: `${BASE_PATH}/assets/icons/dark-icon.png`,
    dark: `${BASE_PATH}/assets/icons/light-icon.png`,
}

const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
let actualTheme

function loadTheme() {
    const storedTheme = localStorage.getItem("theme")

    if (storedTheme === theme.LIGHT || storedTheme === theme.DARK) {
        actualTheme = storedTheme
        return
    }

    actualTheme = systemTheme.matches
        ? theme.DARK
        : theme.LIGHT
}

function storeTheme() {
    localStorage.setItem("theme", actualTheme)
}

function renderButton() {
    themeButtonImageEl.src =
        actualTheme === theme.LIGHT
            ? themeImages.dark
            : themeImages.light
}

function renderLogo() {
    logoImageEl.src =
        actualTheme === theme.LIGHT
            ? logoImages.light
            : logoImages.dark
}

function renderIcon() {
    let favicon =
        document.querySelector('link[rel="icon"]') ??
        document.querySelector('link[rel="shortcut icon"]')

    if (!favicon) {
        favicon = document.createElement("link")
        favicon.rel = "icon"
        document.head.appendChild(favicon)
    }

    favicon.href =
        actualTheme === theme.DARK
            ? iconImages.light
            : iconImages.dark
}

function renderTheme() {
    pageRoot.classList.toggle(
        "dark",
        actualTheme === theme.DARK
    )

    renderButton()
    renderLogo()
    renderIcon()
}

function switchTheme() {
    actualTheme =
        actualTheme === theme.DARK
            ? theme.LIGHT
            : theme.DARK

    storeTheme()
    renderTheme()
}

function initTheme() {
    loadTheme()
    renderTheme()
}

systemTheme.addEventListener("change", ({ matches }) => {
    if (localStorage.getItem("theme") !== null)
        return

    actualTheme = matches
        ? theme.DARK
        : theme.LIGHT

    renderTheme()
})

themeButtonEl.addEventListener("click", switchTheme)
document.addEventListener("DOMContentLoaded", initTheme)
