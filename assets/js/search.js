document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("site-search");
    const form = document.getElementById("site-search-form");
    const input = document.getElementById("search-input");
    const panel = document.getElementById("search-inline-panel");
    const resultsContainer = document.getElementById("search-results");
    const summary = document.getElementById("search-summary");

    if (!search || !form || !input || !panel || !resultsContainer || !summary) {
        return;
    }

    let searchIndexPromise = null;
    let searchGeneration = 0;
    let searchTimer = null;
    let selectedResult = -1;

    function loadSearchIndex() {
        if (!searchIndexPromise) {
            searchIndexPromise = fetch("/index.json", {
                headers: {
                    Accept: "application/json"
                }
            })
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error("Search index failed to load.");
                    }

                    return response.json();
                })
                .catch((error) => {
                    searchIndexPromise = null;
                    throw error;
                });
        }

        return searchIndexPromise;
    }

    function normaliseList(value) {
        if (Array.isArray(value)) {
            return value;
        }

        if (value === null || value === undefined || value === "") {
            return [];
        }

        return [String(value)];
    }

    function searchableValue(item) {
        return [
            item.title,
            item.contents,
            item.description,
            item.section,
            item.type,
            ...normaliseList(item.tags),
            ...normaliseList(item.categories),
            ...normaliseList(item.technologies),
            ...normaliseList(item.platforms),
            ...normaliseList(item.keywords)
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
    }

    function openPanel() {
        panel.hidden = false;
        input.setAttribute("aria-expanded", "true");
        search.classList.add("is-open");
    }

    function closePanel() {
        panel.hidden = true;
        input.setAttribute("aria-expanded", "false");
        search.classList.remove("is-open");
        selectedResult = -1;
        updateSelection();
    }

    function updateSelection() {
        const results = [...resultsContainer.querySelectorAll(".search-result")];

        results.forEach((result, index) => {
            result.classList.toggle("selected", index === selectedResult);
        });

        results[selectedResult]?.scrollIntoView({
            block: "nearest"
        });
    }

    function moveSelection(direction) {
        const results = [...resultsContainer.querySelectorAll(".search-result")];

        if (!results.length) {
            selectedResult = -1;
            return;
        }

        selectedResult += direction;

        if (selectedResult < 0) {
            selectedResult = results.length - 1;
        }

        if (selectedResult >= results.length) {
            selectedResult = 0;
        }

        updateSelection();
    }

    function createResult(item, index) {
        const link = document.createElement("a");
        link.className = "search-result";
        link.href = item.permalink || item.url || "#";
        link.dataset.searchIndex = String(index);

        const text = document.createElement("span");
        text.className = "search-result-text";

        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = item.title || "Untitled";

        const metadata = [
            item.section,
            ...normaliseList(item.categories).slice(0, 2)
        ].filter(Boolean);

        text.appendChild(title);

        if (metadata.length) {
            const section = document.createElement("span");
            section.className = "search-result-section";
            section.textContent = metadata.join(" · ");
            text.appendChild(section);
        }

        const arrow = document.createElement("span");
        arrow.className = "search-result-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";

        link.append(text, arrow);

        link.addEventListener("mouseenter", () => {
            selectedResult = index;
            updateSelection();
        });

        return link;
    }

    async function runSearch(rawQuery) {
        const query = rawQuery.trim();
        const generation = ++searchGeneration;

        if (!query) {
            clearTimeout(searchTimer);
            resultsContainer.replaceChildren();
            summary.textContent = "Enter a search term.";
            closePanel();
            return;
        }

        openPanel();
        summary.textContent = "Loading search index…";

        try {
            const index = await loadSearchIndex();

            if (generation !== searchGeneration) {
                return;
            }

            const terms = query
                .toLowerCase()
                .split(/\s+/)
                .filter(Boolean);

            const matches = index
                .filter((item) => {
                    const value = searchableValue(item);
                    return terms.every((term) => value.includes(term));
                })
                .slice(0, 50);

            summary.textContent = matches.length
                ? `${matches.length} result${matches.length === 1 ? "" : "s"}`
                : "No results found.";

            selectedResult = -1;
            resultsContainer.replaceChildren(
                ...matches.map((item, index) => createResult(item, index))
            );
        } catch (error) {
            if (generation !== searchGeneration) {
                return;
            }

            resultsContainer.replaceChildren();
            summary.textContent =
                error instanceof Error
                    ? error.message
                    : "Search failed.";
        }
    }

    input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchGeneration += 1;
        selectedResult = -1;

        const query = input.value;

        if (!query.trim()) {
            resultsContainer.replaceChildren();
            summary.textContent = "Enter a search term.";
            closePanel();
            return;
        }

        openPanel();
        summary.textContent = "Searching…";

        searchTimer = setTimeout(() => {
            runSearch(query);
        }, 120);
    });

    input.addEventListener("focus", () => {
        if (input.value.trim()) {
            runSearch(input.value);
        }
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closePanel();
            input.blur();
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveSelection(1);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(-1);
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const results = [...resultsContainer.querySelectorAll(".search-result")];
        const target =
            results[selectedResult >= 0 ? selectedResult : 0];

        if (target instanceof HTMLAnchorElement) {
            window.location.href = target.href;
            return;
        }

        runSearch(input.value);
    });

    document.addEventListener("pointerdown", (event) => {
        if (!search.contains(event.target)) {
            closePanel();
        }
    });

    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();

        if ((event.ctrlKey || event.metaKey) && key === "k") {
            event.preventDefault();
            input.focus();
            input.select();
            return;
        }

        if (
            key === "/" &&
            !["INPUT", "TEXTAREA", "SELECT"].includes(
                document.activeElement?.tagName || ""
            ) &&
            !document.activeElement?.isContentEditable
        ) {
            event.preventDefault();
            input.focus();
        }
    });
});
