const playlistContainer = document.getElementById("playlist");
const clearDbBtn = document.getElementById("clearDbBtn");
const categoryFilter = document.getElementById("categoryFilter");
const reloadBtn = document.getElementById('reloadPlaylistBtn');
const STORAGE_KEY = "universal_playlist";
let currentPlaylist = [];

// Элементы модального окна плеера
const playerModal = document.getElementById('playerModal');
const modalPlayerContainer = document.getElementById('modalPlayerContainer');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalCategory = document.getElementById('modalCategory');
const modalDescription = document.getElementById('modalDescription');
const closePlayerModal = document.getElementById('closePlayerModal');
const closePlayerBtn = document.getElementById('closePlayerBtn');
const sharePlayerBtn = document.getElementById('sharePlayerBtn');
let currentMediaItem = null; // Текущий выбранный элемент

// --- Загрузка плейлистов при старте ---
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      currentPlaylist = JSON.parse(saved);
      updateFilterOptions(currentPlaylist);
      renderPlaylist(currentPlaylist);
    } catch (e) {
      console.warn("Ошибка чтения localStorage:", e);
      currentPlaylist = [];
      updateFilterOptions([]);
      renderPlaylist([]);
    }
  } else {
    loadAllPlaylists();
  }
});

// --- Кнопка очистки плейлиста ---
clearDbBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  currentPlaylist = [];
  playlistContainer.innerHTML = "<p>📭 Плейлист очищен.</p>";
  updateFilterOptions([]);
});

// --- Кнопка загрузки всех плейлистов ---
reloadBtn.addEventListener('click', () => {
  loadAllPlaylists(true);
});

// --- Фильтр по категориям ---
categoryFilter.addEventListener("change", () => {
  const selected = categoryFilter.value;
  if (selected === "all") {
    renderPlaylist(currentPlaylist);
  } else {
    const filtered = currentPlaylist.filter(item => item.category === selected);
    renderPlaylist(filtered);
  }
});

// --- Загрузка и объединение всех плейлистов из playlists.json ---
function loadAllPlaylists(showAlert) {
  fetch('playlists.json')
    .then(res => res.json())
    .then(files => Promise.all(files.map(file => fetch(file).then(r => r.json()))))
    .then(playlistsArrays => {
      const combined = playlistsArrays.flat();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      currentPlaylist = combined;
      updateFilterOptions(combined);
      renderPlaylist(combined);
      if (showAlert) alert('Плейлисты обновлены!');
    })
    .catch(err => {
      playlistContainer.innerHTML = "<p>❌ Не удалось загрузить плейлисты.</p>";
      console.error("Ошибка загрузки плейлистов:", err);
      if (showAlert) alert('Ошибка загрузки плейлистов!');
    });
}

function getTileType(item) {
  if (item.vk_oid && item.vk_id && item.vk_hash) return "vk";
  if (item.id) return "gd";
  if (item.url) return "stream";
  return "unknown";
}

function renderPlaylist(items) {
  playlistContainer.innerHTML = "";
  items.forEach(item => {
    const { title, poster, category } = item;
    const type = getTileType(item);
    let imageSrc = poster || "";
    if (!imageSrc) {
      if (type === "gd" && item.id) imageSrc = `https://drive.google.com/thumbnail?id=${item.id}`;
      if (type === "vk") imageSrc = "https://vk.com/images/video_placeholder.png";
    }

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <img src="${imageSrc}" />
      <div class="tile-title">${title || "Без названия"}</div>
      <div class="tile-category">📁 ${category || "Без категории"}</div>
      <div class="tile-type">
        ${
          type === "vk" ? "VK" :
          type === "gd" ? "Google Drive" :
          type === "stream" ? "Stream" : ""
        }
      </div>
    `;

    tile.addEventListener("click", () => {
      showPlayerInModal(item);
    });

    playlistContainer.appendChild(tile);
  });
}

function updateFilterOptions(items) {
  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
  categoryFilter.innerHTML = `<option value="all">Все категории</option>`;
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
}

// --- Модальное окно "О проекте" ---
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const closeModal = document.getElementById('closeModal');
aboutBtn.addEventListener('click', () => {
  aboutModal.style.display = 'flex';
});
closeModal.addEventListener('click', () => {
  aboutModal.style.display = 'none';
});
window.addEventListener('click', e => {
  if (e.target === aboutModal) aboutModal.style.display = 'none';
});

// --- Функции для работы с плеером в модальном окне ---
function showPlayerInModal(item) {
  currentMediaItem = item;
  modalPlayerContainer.innerHTML = '';
  modalTitle.textContent = item.title || 'Без названия';
  modalCategory.textContent = item.category || 'Без категории';
  modalDescription.textContent = item.description || '';
  modalPoster.src = item.poster || getDefaultPoster(item);

  const type = getTileType(item);
  let playerHTML = '';

  if (type === "vk") {
    playerHTML = `
      <div class="video-responsive">
        <iframe src="https://vk.com/video_ext.php?oid=${item.vk_oid}&id=${item.vk_id}&hash=${item.vk_hash}"
                frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>
      </div>`;
  } 
  else if (type === "gd") {
    playerHTML = `
      <div class="video-responsive">
        <iframe src="https://drive.google.com/file/d/${item.id}/preview" 
                frameborder="0" allowfullscreen></iframe>
      </div>`;
  } 
  else if (type === "stream") {
    if (item.url.endsWith('.mp3') || item.url.endsWith('.aac') || item.url.endsWith('.ogg') || item.url.endsWith('.wav')) {
      playerHTML = `<audio controls autoplay src="${item.url}" style="width:100%; max-width:520px; background:#000;"></audio>`;
    } 
    else if (item.url.endsWith('.m3u8')) {
      playerHTML = `
        <video controls autoplay src="${item.url}" 
       style="display:block; margin:0 auto; width:100%; max-width:720px; background:#000;" 
       poster="${item.poster || ''}">
      </video>
        <div style="color:#fff; font-size:0.95em; margin-top:8px;">
          <b>Внимание:</b> Если поток не играет, попробуйте открыть в мобильном Chrome или Safari.
        </div>`;
    } 
    else {
      playerHTML = `<iframe src="${item.url}" frameborder="0" allowfullscreen style="width:100%; min-height:360px; background:#000;"></iframe>`;
    }
    playerHTML = `<div class="video-responsive">${playerHTML}</div>`;
  }

  modalPlayerContainer.innerHTML = playerHTML;
  playerModal.style.display = 'flex';
}

function getDefaultPoster(item) {
  const type = getTileType(item);
  if (type === "gd" && item.id) return `https://drive.google.com/thumbnail?id=${item.id}`;
  if (type === "vk") return "https://vk.com/images/video_placeholder.png";
  return "";
}

// Обработчики закрытия модального окна
closePlayerModal.addEventListener('click', closePlayerModalHandler);
closePlayerBtn.addEventListener('click', closePlayerModalHandler);
function closePlayerModalHandler() {
  playerModal.style.display = 'none';
  const mediaElements = modalPlayerContainer.querySelectorAll('video, audio');
  mediaElements.forEach(media => {
    if (typeof media.pause === 'function') media.pause();
    if ('currentTime' in media) media.currentTime = 0;
  });
  const iframeElements = modalPlayerContainer.querySelectorAll('iframe');
  iframeElements.forEach(iframe => {
    iframe.src = '';
    iframe.remove();
    modalPlayerContainer.innerHTML = '';
  });
  modalPlayerContainer.innerHTML = '';
}

// Обработчик для кнопки "Поделиться"
sharePlayerBtn.addEventListener('click', function() {
  if (!currentMediaItem) return;
  const title = modalTitle.textContent;
  const desc = modalDescription.textContent;
  const cat = modalCategory.textContent;
  const poster = modalPoster.src || '';
  let text = '';
  if (title) text += `СМОТРИ ОТ MediaGood: 🎬 ${title}\n`;
  if (poster) text += `ПОСТЕР: ${poster}\n`;
  if (cat) text += `КАТЕГОРИЯ: ${cat}\n`;
  if (desc) text += `ОПИСАНИЕ: ${desc}\n❗❗❗СМОТРИ 👀 ЗДЕСЬ⤵️:\n`;
  if (navigator.share) {
    navigator.share({
      title: title,
      text: text,
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('Информация о медиа скопирована!');
    });
  }
});