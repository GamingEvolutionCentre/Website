function openTab(evt, tabName) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

// Open the default tab
document.getElementById("defaultOpen").click();

    <script>
        // Replace with your GitHub username and repository
        const username = "your-username";
        const repo = "your-repository";

        // Optionally include your personal access token for private repos
        const token = "your-github-token"; // Leave as empty string for public repos
        
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
