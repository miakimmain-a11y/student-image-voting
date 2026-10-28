(() => {
  const config = window.APP_CONFIG || {};
  const BUCKET = "class-vote-images";
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_FILES_PER_UPLOAD = 5;

  const gallery = document.querySelector("#gallery");
  const emptyState = document.querySelector("#emptyState");
  const imageInput = document.querySelector("#imageInput");
  const uploadStatus = document.querySelector("#uploadStatus");
  const summary = document.querySelector("#summary");
  const notice = document.querySelector("#notice");
  const sortSelect = document.querySelector("#sortSelect");
  const refreshButton = document.querySelector("#refreshButton");
  const imageViewer = document.querySelector("#imageViewer");
  const viewerImage = document.querySelector("#viewerImage");
  const viewerTitle = document.querySelector("#viewerTitle");
  const viewerClose = document.querySelector("#viewerClose");

  let db = null;
  let images = [];
  let voteCounts = new Map();
  let loading = false;

  function setStatus(message, kind = "") {
    uploadStatus.textContent = message;
    uploadStatus.className = `status full-width ${kind}`;
  }

  function showNotice(message) {
    notice.textContent = message;
    notice.hidden = !message;
  }

  function setup() {
    if (!window.supabase || !config.SUPABASE_URL ||
        !config.SUPABASE_PUBLISHABLE_KEY ||
        config.SUPABASE_URL.includes("YOUR_PROJECT_ID") ||
        config.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE")) {
      showNotice("Setup is incomplete. The site administrator must add the Supabase URL and Publishable key to config.js.");
      summary.textContent = "Setup required";
      imageInput.disabled = true;
      return false;
    }
    db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
    showNotice("");
    return true;
  }

  async function loadImages() {
    if (!db || loading) return;
    loading = true;
    refreshButton.disabled = true;
    summary.textContent = "Loading data…";
    try {
      const { data: rows, error: imageError } = await db
        .from("images")
        .select("id, title, image_path, created_at")
        .order("created_at", { ascending: false });
      if (imageError) throw imageError;

      const { data: votes, error: voteError } = await db
        .from("image_votes")
        .select("image_id");
      if (voteError) throw voteError;

      images = rows || [];
      voteCounts = new Map();
      (votes || []).forEach(v => voteCounts.set(v.image_id, (voteCounts.get(v.image_id) || 0) + 1));
      render();
      summary.textContent = `${images.length} image(s) · ${(votes || []).length} total vote(s)`;
      showNotice("");
    } catch (error) {
      console.error(error);
      summary.textContent = "Unable to load data";
      showNotice(`Could not load data: ${error.message || "Check your Supabase settings and policies."}`);
    } finally {
      loading = false;
      refreshButton.disabled = false;
    }
  }

  function render() {
    gallery.replaceChildren();
    const mode = sortSelect.value;
    const list = [...images];
    if (mode === "votes") {
      list.sort((a, b) => (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
        || new Date(b.created_at) - new Date(a.created_at));
    } else if (mode === "oldest") {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    emptyState.hidden = list.length !== 0;
    list.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "image-card";

      const wrap = document.createElement("div");
      wrap.className = "image-wrap";
      const fullImageUrl = publicImageUrl(item.image_path);
      const openImage = document.createElement("button");
      openImage.type = "button";
      openImage.className = "image-open-button";
      openImage.setAttribute("aria-label", `View full image: ${item.title}`);
      const img = document.createElement("img");
      img.src = fullImageUrl;
      img.alt = item.title;
      img.loading = "lazy";
      openImage.append(img);
      openImage.addEventListener("click", () => openViewer(fullImageUrl, item.title));
      wrap.append(openImage);

      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = `#${index + 1}`;
      wrap.append(rank);

      const content = document.createElement("div");
      content.className = "card-content";
      const name = document.createElement("p");
      name.className = "image-name";
      name.textContent = item.title;

      const date = document.createElement("p");
      date.className = "image-date";
      date.textContent = new Date(item.created_at).toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });

      const bottom = document.createElement("div");
      bottom.className = "card-bottom";
      const total = document.createElement("span");
      total.className = "vote-total";
      total.textContent = `${voteCounts.get(item.id) || 0} vote(s)`;

      const vote = document.createElement("button");
      vote.type = "button";
      vote.className = "vote-button";
      vote.setAttribute("aria-label", `Vote for ${item.title}`);
      vote.innerHTML = '<span aria-hidden="true">♥</span><span>Vote</span>';
      vote.addEventListener("click", () => castVote(item.id, vote));

      bottom.append(total, vote);
      content.append(name, date, bottom);
      card.append(wrap, content);
      gallery.append(card);
    });
  }

  function openViewer(src, title) {
    viewerImage.src = src;
    viewerImage.alt = title;
    viewerTitle.textContent = title;
    if (typeof imageViewer.showModal === "function") {
      imageViewer.showModal();
    } else {
      imageViewer.setAttribute("open", "");
    }
  }

  function closeViewer() {
    if (typeof imageViewer.close === "function" && imageViewer.open) {
      imageViewer.close();
    } else {
      imageViewer.removeAttribute("open");
    }
    viewerImage.removeAttribute("src");
  }

  function publicImageUrl(path) {
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function castVote(imageId, button) {
    button.disabled = true;
    try {
      const { error } = await db.from("image_votes").insert({ image_id: imageId });
      if (error) throw error;
      await loadImages();
    } catch (error) {
      console.error(error);
      showNotice(`Vote failed: ${error.message || "Please try again."}`);
    } finally {
      button.disabled = false;
    }
  }

  async function resizeImage(file) {
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = sourceUrl;
      });
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image conversion failed")), "image/jpeg", 0.84);
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  function safeFileName(name) {
    const base = name.replace(/\.[^.]+$/, "").normalize("NFKC")
      .replace(/[^\w가-힣-]+/g, "-").replace(/-+/g, "-").slice(0, 48);
    return base || "image";
  }

  async function uploadFiles(fileList) {
    if (!db) return;
    const files = [...fileList];
    if (!files.length) return;
    if (files.length > MAX_FILES_PER_UPLOAD) {
      setStatus(`You can upload up to ${MAX_FILES_PER_UPLOAD} images at a time.`, "error");
      imageInput.value = "";
      return;
    }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    for (const file of files) {
      if (!allowed.has(file.type)) {
        setStatus(`${file.name}: Please use a JPG, PNG, WEBP, or GIF file.`, "error");
        imageInput.value = "";
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStatus(`${file.name}: Each image must be 5 MB or smaller.`, "error");
        imageInput.value = "";
        return;
      }
    }

    imageInput.disabled = true;
    setStatus("Uploading images…");
    let uploaded = 0;
    for (const file of files) {
      let path = null;
      try {
        const blob = await resizeImage(file);
        path = `${crypto.randomUUID()}-${safeFileName(file.name)}.jpg`;
        const { error: storageError } = await db.storage.from(BUCKET).upload(path, blob, {
          contentType: "image/jpeg",
          upsert: false,
          cacheControl: "3600"
        });
        if (storageError) throw storageError;

        const title = file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Untitled image";
        const { error: rowError } = await db.from("images").insert({
          title,
          image_path: path
        });
        if (rowError) {
          await db.storage.from(BUCKET).remove([path]);
          throw rowError;
        }
        uploaded += 1;
      } catch (error) {
        console.error(error);
        setStatus(`Upload error: ${error.message || "Check your settings and storage policies."}`, "error");
        break;
      }
    }

    if (uploaded > 0) {
      setStatus(`${uploaded} image(s) uploaded successfully!`, "success");
      await loadImages();
    }
    imageInput.disabled = false;
    imageInput.value = "";
  }

  imageInput.addEventListener("change", event => uploadFiles(event.target.files));
  viewerClose.addEventListener("click", closeViewer);
  imageViewer.addEventListener("click", event => {
    if (event.target === imageViewer) closeViewer();
  });
  imageViewer.addEventListener("close", () => viewerImage.removeAttribute("src"));
  refreshButton.addEventListener("click", loadImages);
  sortSelect.addEventListener("change", render);

  if (setup()) {
    loadImages();
    // Refresh the gallery every 15 seconds to show other participants' uploads and votes.
    window.setInterval(loadImages, 15000);
  }
})();
