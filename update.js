<script>
        // Replace with your GitHub username and repository
        const username = "GamingEvolutionCentre";
        const repo = "Website";

        // Optionally include your personal access token for private repos
        const token = ""; // Leave as empty string for public repos
        
        async function fetchUpdates() {
            const url = `https://api.github.com/repos/${username}/${repo}/commits`;
            const headers = token ? { Authorization: `token ${token}` } : {};

            try {
                const response = await fetch(url, { headers });
                if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

                const commits = await response.json();

                const updatesDiv = document.getElementById("updates");
                updatesDiv.innerHTML = "";

                commits.forEach(commit => {
                    const commitDate = new Date(commit.commit.author.date);
                    const commitMessage = commit.commit.message;
                    const commitUrl = commit.html_url;

                    const update = document.createElement("div");
                    update.innerHTML = `
                        <p><strong>${commitMessage}</strong></p>
                        <p>Date: ${commitDate.toLocaleString()}</p>
                        <p><a href="${commitUrl}" target="_blank">View Commit</a></p>
                        <hr>
                    `;
                    updatesDiv.appendChild(update);
                });
            } catch (error) {
                console.error("Error fetching updates:", error);
            }
        }

        // Fetch updates when the page loads
        fetchUpdates();
</script>
