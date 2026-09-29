document.addEventListener("DOMContentLoaded", () => {

    const STORAGE_KEY = "gec-theme";

    const button =
        document.getElementById("theme-toggle");


    if (!button) {
        return;
    }


    function currentTheme() {

        return (
            document.documentElement.dataset.theme === "light"
        )
            ? "light"
            : "dark";
    }


    function updateButton(theme) {

        const lightOn =
            theme === "light";


        button.classList.toggle(
            "light-on",
            lightOn
        );


        button.setAttribute(
            "aria-pressed",
            String(lightOn)
        );


        button.setAttribute(
            "aria-label",
            lightOn
                ? "Turn light mode off"
                : "Turn light mode on"
        );


        button.title =
            lightOn
                ? "Light mode on"
                : "Light mode off";
    }


    function setTheme(theme) {

        if (
            theme !== "light" &&
            theme !== "dark"
        ) {
            return;
        }


        document.documentElement.dataset.theme =
            theme;


        try {
            localStorage.setItem(
                STORAGE_KEY,
                theme
            );
        } catch (_) {}


        updateButton(theme);
    }


    button.addEventListener(
        "click",
        () => {

            setTheme(
                currentTheme() === "light"
                    ? "dark"
                    : "light"
            );

        }
    );


    updateButton(currentTheme());

});
