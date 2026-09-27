document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("search-overlay");
    const openButton = document.getElementById("search-open");
    const input = document.getElementById("search-input");
    const resultsContainer = document.getElementById("search-results");
    const summary = document.getElementById("search-summary");
    const filterButtons = [...document.querySelectorAll("[data-search-type]")];
    const moreButton = document.getElementById("search-more");
    const moreContainer = document.getElementById("search-more-container");

    if (
        !overlay ||
        !openButton ||
        !input ||
        !resultsContainer ||
        !summary ||
        !moreButton ||
        !moreContainer
    ) {
        return;
    }

    let pagefind = null;
    let currentType = "All";
    let currentResults = [];
    let visibleResults = 8;
    let searchTimer = null;
    let selectedResult = -1;
    let lastQuery = "";
    let previousFocus = null;

    /*
     * Conservative intent expansion.
     *
     * Pagefind remains the ranking engine. These aliases simply make
     * natural phrases more likely to discover the right GEC content.
     * Add more aliases as your site grows.
     */
    const intentAliases = [
        {
            triggers: ["dj", "dj app", "dj software", "music mixer", "mix music", "mixing music"],
            expansions: ["Deckd", "DJ software", "audio mixing", "music mixing"]
        },
        {
            triggers: ["discord bot", "moderation bot", "discord moderation", "server moderation"],
            expansions: [
                "Gaming Evolution Centre Bot",
                "Discord bot",
                "moderation",
                "server management"
            ]
        },
        {
            triggers: ["xp", "levels", "leveling", "level bot"],
            expansions: ["leveling", "XP", "Discord bot"]
        },
        {
            triggers: ["get app", "install app", "download app", "downloads"],
            expansions: ["download", "software", "release"]
        }
    ];

    async function loadPagefind() {
        if (pagefind) {
            return pagefind;
        }

        try {
            pagefind = await import("/pagefind/pagefind.js");

            await pagefind.options({
                excerptLength: 36,
                highlightParam: "highlight",
                ranking: {
                    termFrequency: 0.82,
                    termSimilarity: 1.15,
                    pageLength: 0.55,
                    termSaturation: 1.2,
                    metaWeights: {
                        title: 8.0,
                        description: 4.5,
                        keywords: 4.0,
                        technologies: 3.5,
                        platforms: 3.0,
                        tags: 2.5,
                        categories: 2.0,
                        type: 1.2
                    }
                }
            });

            await pagefind.init();
            await updateFilterCounts();

            return pagefind;
        } catch (error) {
            console.error("Search failed to initialise:", error);

            summary.textContent =
                "Search is not indexed yet. Run `npm run preview` or `npm run build` first.";

            return null;
        }
    }

    async function updateFilterCounts() {
        if (!pagefind) {
            return;
        }

        try {
            const filters = await pagefind.filters();
            const typeFilters = filters?.type || {};

            filterButtons.forEach((button) => {
                const type = button.dataset.searchType;

                if (!button.dataset.baseLabel) {
                    button.dataset.baseLabel = button.textContent.trim();
                }

                const label = button.dataset.baseLabel;

                if (type === "All") {
                    button.textContent = label;
                    return;
                }

                const count = typeFilters[type];

                button.textContent =
                    typeof count === "number"
                        ? `${label} (${count})`
                        : label;
            });
        } catch (error) {
            console.warn("Could not load Pagefind filter counts:", error);
        }
    }

    async function openSearch() {
        previousFocus = document.activeElement;
        overlay.hidden = false;
        document.body.classList.add("search-open");

        await loadPagefind();

        requestAnimationFrame(() => {
            input.focus();
            input.select();
        });
    }

    function closeSearch() {
        overlay.hidden = true;
        document.body.classList.remove("search-open");
        selectedResult = -1;

        if (previousFocus instanceof HTMLElement) {
            previousFocus.focus();
        }
    }

    openButton.addEventListener("click", openSearch);

    document.querySelectorAll("[data-search-close]").forEach((button) => {
        button.addEventListener("click", closeSearch);
    });

    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();

        if ((event.ctrlKey || event.metaKey) && key === "k") {
            event.preventDefault();
            openSearch();
            return;
        }

        if (key === "/" && !isTypingIntoField(event.target)) {
            event.preventDefault();
            openSearch();
            return;
        }

        if (event.key === "Escape" && !overlay.hidden) {
            closeSearch();
            return;
        }

        if (overlay.hidden) {
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
            return;
        }

        if (event.key === "Enter" && selectedResult >= 0) {
            const items = document.querySelectorAll(".search-result");
            const selected = items[selectedResult];
            const link = selected?.querySelector("a");

            if (link) {
                link.click();
            }
        }
    });

    function isTypingIntoField(element) {
        if (!(element instanceof HTMLElement)) {
            return false;
        }

        return (
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.tagName === "SELECT" ||
            element.isContentEditable
        );
    }

    input.addEventListener("input", async () => {
        clearTimeout(searchTimer);

        selectedResult = -1;
        const query = input.value.trim();
        lastQuery = query;

        const engine = await loadPagefind();

        if (!engine) {
            return;
        }

        if (query.length >= 2) {
            try {
                await engine.preload(query, buildSearchOptions());
            } catch {
                // Preload is an optimization only; searching still works without it.
            }
        }

        searchTimer = setTimeout(() => {
            runSearch(query);
        }, 130);
    });

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            filterButtons.forEach((item) => item.classList.remove("active"));
            button.classList.add("active");

            currentType = button.dataset.searchType || "All";
            visibleResults = 8;

            runSearch(input.value.trim());
        });
    });

    function buildSearchOptions() {
        if (currentType === "All") {
            return {};
        }

        return {
            filters: {
                type: currentType
            }
        };
    }

    function expandedQueries(query) {
        const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
        const queries = [query];

        for (const group of intentAliases) {
            const matched = group.triggers.some((trigger) => {
                return normalized.includes(trigger);
            });

            if (!matched) {
                continue;
            }

            group.expansions.forEach((expansion) => {
                if (!queries.some((item) => item.toLowerCase() === expansion.toLowerCase())) {
                    queries.push(expansion);
                }
            });
        }

        return queries.slice(0, 5);
    }

    async function runSearch(query) {
        const engine = await loadPagefind();

        if (!engine) {
            return;
        }

        if (query.length < 2) {
            currentResults = [];
            resultsContainer.innerHTML = "";
            summary.textContent = "Enter at least 2 characters to search.";
            moreContainer.hidden = true;
            return;
        }

        summary.textContent = "Searching…";

        try {
            const queries = expandedQueries(query);
            const resultSets = [];

            for (const searchQuery of queries) {
                const search = await engine.search(searchQuery, buildSearchOptions());
                resultSets.push(search.results);
            }

            /*
             * Keep Pagefind's primary-query ordering first.
             * Alias matches are appended only when not already present.
             */
            const seen = new Set();
            const merged = [];

            resultSets.forEach((resultSet) => {
                resultSet.forEach((result) => {
                    if (!seen.has(result.id)) {
                        seen.add(result.id);
                        merged.push(result);
                    }
                });
            });

            /*
             * Ignore a stale asynchronous response if the user has
             * already typed a new query.
             */
            if (query !== lastQuery && input.value.trim() !== query) {
                return;
            }

            currentResults = merged;
            visibleResults = 8;

            await renderResults(query);
        } catch (error) {
            console.error("Search failed:", error);
            resultsContainer.innerHTML = "";
            summary.textContent = "Search failed. Please try again.";
            moreContainer.hidden = true;
        }
    }

    async function renderResults(query) {
        const resultSlice = currentResults.slice(0, visibleResults);

        const results = await Promise.all(
            resultSlice.map((result) => result.data())
        );

        resultsContainer.innerHTML = "";

        if (results.length === 0) {
            summary.textContent = `No results found for "${query}".`;

            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <h3>No results found</h3>
                    <p>
                        Try a project name, technology, platform, tag,
                        category, or a more general phrase.
                    </p>
                </div>
            `;

            moreContainer.hidden = true;
            return;
        }

        summary.textContent =
            `${currentResults.length} result${currentResults.length === 1 ? "" : "s"} found`;

        results.forEach((result, index) => {
            const article = document.createElement("article");
            article.className = "search-result";
            article.dataset.searchIndex = String(index);

            const meta = result.meta || {};

            const image = meta.image
                ? `
                    <div class="search-result-image">
                        <img
                            src="${escapeAttribute(meta.image)}"
                            alt=""
                            loading="lazy"
                        >
                    </div>
                `
                : "";

            const description = meta.description
                ? `<p class="search-result-description">${escapeHTML(meta.description)}</p>`
                : "";

            const type = meta.type
                ? `<span>${escapeHTML(meta.type)}</span>`
                : "";

            const technology = meta.technologies
                ? `<span>${escapeHTML(meta.technologies)}</span>`
                : "";

            article.innerHTML = `
                ${image}

                <div class="search-result-content">
                    <div class="search-result-meta">
                        ${type}
                        ${technology}
                    </div>

                    <h3>
                        <a href="${escapeAttribute(result.url)}">
                            ${escapeHTML(meta.title || "Untitled")}
                        </a>
                    </h3>

                    ${description}

                    <p class="search-result-excerpt">
                        ${result.excerpt}
                    </p>
                </div>
            `;

            article.addEventListener("mouseenter", () => {
                selectedResult = index;
                updateSelection();
            });

            resultsContainer.appendChild(article);
        });

        moreContainer.hidden = visibleResults >= currentResults.length;
    }

    moreButton.addEventListener("click", async () => {
        visibleResults += 8;
        await renderResults(input.value.trim());
    });

    function moveSelection(direction) {
        const items = document.querySelectorAll(".search-result");

        if (!items.length) {
            return;
        }

        selectedResult += direction;

        if (selectedResult < 0) {
            selectedResult = items.length - 1;
        }

        if (selectedResult >= items.length) {
            selectedResult = 0;
        }

        updateSelection();
    }

    function updateSelection() {
        const items = document.querySelectorAll(".search-result");

        items.forEach((item, index) => {
            item.classList.toggle("selected", index === selectedResult);
        });

        items[selectedResult]?.scrollIntoView({
            block: "nearest"
        });
    }

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHTML(value);
    }
});
