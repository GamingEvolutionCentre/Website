document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "gec-site-style";

    const buttons = document.querySelectorAll(
        "[data-site-style-option]"
    );

    if (!buttons.length) {
        return;
    }

    function getCurrentStyle() {
        const value =
            document.documentElement.dataset.siteStyle;

        return value === "old" ? "old" : "modern";
    }

    function updateButtons(style) {
        buttons.forEach((button) => {
            const active =
                button.dataset.siteStyleOption === style;

            button.classList.toggle("active", active);

            button.setAttribute(
                "aria-pressed",
                active.toString()
            );
        });
    }

    function setStyle(style) {
        if (style !== "modern" && style !== "old") {
            return;
        }

        document.documentElement.dataset.siteStyle = style;

        try {
            localStorage.setItem(
                STORAGE_KEY,
                style
            );
        } catch (_) {}

        updateButtons(style);

        window.dispatchEvent(
            new CustomEvent(
                "gec-site-style-change",
                {
                    detail: {
                        style
                    }
                }
            )
        );
    }

    buttons.forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                setStyle(
                    button.dataset.siteStyleOption
                );
            }
        );
    });

    updateButtons(getCurrentStyle());
});
