const titles = [
    { text: 'Software Developer', color: 'text-blue-400' },
    { text: 'Data Analyst/Engineer', color: 'text-purple-400' },
    { text: 'AI Enthusiast', color: 'text-pink-400' },
    { text: 'Business Strategist', color: 'text-green-400' },
    { text: 'Music Lover', color: 'text-yellow-400' },
    { text: 'Problem Solver', color: 'text-red-400' }
  ];
  
  let currentIndex = 0;
  const typewriterEl = document.getElementById('typewriter');
  
  function typeTitle() {
    const { text, color } = titles[currentIndex];
    typewriterEl.innerHTML = `<span class="${color}">${text}</span>`;
    currentIndex = (currentIndex + 1) % titles.length;
  }
  
  typeTitle();
  setInterval(typeTitle, 2000);
  

// Fetch GitHub repos with descriptions
async function fetchGitHubRepos() {
    const response = await fetch('https://api.github.com/users/jackbrayan17/repos');
    const repos = await response.json();
    return repos.filter(repo => repo.description);
  }
  
  // Fetch Hugging Face Spaces
  async function fetchHuggingFaceSpaces() {
    const response = await fetch('https://huggingface.co/api/spaces?author=JackBrayan17');
    const spaces = await response.json();
    return spaces;
  }
  
  // Create card for projects
  function createProjectCard(title, description, language, date, url) {
    const card = document.createElement('div');
    card.className = 'project-card card-animation';
    card.innerHTML = `
      <h3 class="text-xl font-bold mb-2">${title}</h3>
      <p class="text-gray-300 mb-2">${description}</p>
      <p class="text-sm text-gray-400 mb-2">Language: ${language || 'N/A'}</p>
      <p class="text-sm text-gray-400 mb-4">Published: ${date}</p>
      <a href="${url}" target="_blank" class="text-blue-400 hover:underline">See Project</a>
    `;
    return card;
  }
  
  // Initialize Portfolio
  async function initPortfolio() {
    const githubContainer = document.getElementById('github-projects');
    const huggingfaceContainer = document.getElementById('huggingface-projects');
  
    const [repos, spaces] = await Promise.all([fetchGitHubRepos(), fetchHuggingFaceSpaces()]);
  
    repos.forEach(repo => {
      const date = new Date(repo.created_at);
      const formattedDate = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      const card = createProjectCard(repo.name, repo.description, repo.language, formattedDate, repo.html_url);
      githubContainer.appendChild(card);
    });
  
    spaces.forEach(space => {
      const date = new Date(space.createdAt);
      const formattedDate = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      const card = createProjectCard(space.id, 'Hugging Face Space', space.sdk, formattedDate, `https://huggingface.co/spaces/${space.id}`);
      huggingfaceContainer.appendChild(card);
    });
  }
  
  document.addEventListener('DOMContentLoaded', initPortfolio);
  