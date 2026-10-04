document.addEventListener("DOMContentLoaded", () => {
    const navContainer = document.getElementById("gec-nav-container");
    const menuButton = document.getElementById("mobile-menu-button");
    const navigation = document.getElementById("main-navigation");
    const searchButton = document.getElementById("mobile-search-button");
    const search = document.getElementById("site-search");
    const searchInput = document.getElementById("search-input");

    if (!navContainer || !menuButton || !navigation) {
        return;
    }

    function closeMenu() {
        navigation.classList.remove("open");
        menuButton.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation");
    }

    function closeSearch() {
        navContainer.classList.remove("mobile-search-open");

        if (searchButton) {
            searchButton.classList.remove("open");
            searchButton.setAttribute("aria-expanded", "false");
            searchButton.setAttribute("aria-label", "Open search");
        }
    }

    function openSearch() {
        if (!searchButton || !search || !searchInput) {
            return;
        }

        closeMenu();
        navContainer.classList.add("mobile-search-open");
        searchButton.classList.add("open");
        searchButton.setAttribute("aria-expanded", "true");
        searchButton.setAttribute("aria-label", "Close search");

        requestAnimationFrame(() => {
            searchInput.focus();
        });
    }

    menuButton.addEventListener("click", () => {
        const willOpen = !navigation.classList.contains("open");

        closeSearch();
        navigation.classList.toggle("open", willOpen);
        menuButton.classList.toggle("open", willOpen);
        menuButton.setAttribute("aria-expanded", String(willOpen));
        menuButton.setAttribute(
            "aria-label",
            willOpen ? "Close navigation" : "Open navigation"
        );
    });

    if (searchButton && search && searchInput) {
        searchButton.addEventListener("click", () => {
            const isOpen = navContainer.classList.contains("mobile-search-open");

            if (isOpen) {
                closeSearch();
                searchInput.blur();
            } else {
                openSearch();
            }
        });

        searchInput.addEventListener("focus", () => {
            if (window.innerWidth <= 900) {
                navContainer.classList.add("mobile-search-open");
                searchButton.classList.add("open");
                searchButton.setAttribute("aria-expanded", "true");
                searchButton.setAttribute("aria-label", "Close search");
            }
        });
    }

    navigation.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
            closeSearch();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            closeMenu();
            closeSearch();
        }
    });
});
