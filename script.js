
/* =========================================
   ONE SHOT — MEMORY MACHINE 2040
   Interactive Prototype
   ========================================= */

const STORAGE_KEY = "oneshot_memories_v1";
const LETTER_KEY = "oneshot_letters_v1";

let memories = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let letters = JSON.parse(localStorage.getItem(LETTER_KEY) || "[]");

let cameraStream = null;
let holdTimer = null;
let selectedMemoryId = null;

const HOLD_DURATION = 1300;

const $ = (selector) => document.querySelector(selector);

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayMemory() {
  return memories.find(m => m.date === dateKey());
}

function shotsLeft() {
  return todayMemory() ? 0 : 1;
}

let demoMode = false;

function shotsLeft() {
  if (demoMode) return 1;
  return todayMemory() ? 0 : 1;
}


function saveMemories() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
    return true;
  } catch (error) {
    alert("Storage is full or unavailable. Your memory could not be saved.");
    return false;
  }
}

/* =========================================
   NAVIGATION
   ========================================= */

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageName);
  });

  document.querySelectorAll(".mode-button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  if (pageName === "camera") {
    startCamera();
  } else {
    stopCamera();
  }

  if (pageName === "memories") renderArchive();
  if (pageName === "journey") renderTimeline();
  if (pageName === "letters") renderLetters();

  updateReadouts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

/* =========================================
   DEVICE READOUTS
   ========================================= */

function updateReadouts() {
  const left = shotsLeft();
  const count = String(left).padStart(2, "0");

  $("#shotsRemaining").textContent = count;
  $("#allocationReadout").textContent = `${count} / 01`;
  $("#filmFrameCount").textContent = count;
  $("#exposureCount").textContent = count;
  $("#frameCounter").textContent = `FRAME ${count} / 01`;

  $(".film-frame.current").classList.toggle("used", left === 0);

  $("#todayDate").textContent = new Date()
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    })
    .toUpperCase();

  const captureBtn = $("#captureBtn");
  captureBtn.disabled = left === 0;

  if (left === 0) {
    $("#cameraStatus").textContent = "DAILY FRAME LOCKED";
    $("#cameraMessage").textContent =
      "Today's memory has been preserved. Return tomorrow.";
  }
}

/* =========================================
   CAMERA
   ========================================= */

async function startCamera() {
  if (shotsLeft() === 0) {
    $("#cameraStatus").textContent = "FRAME LOCKED";
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    $("#cameraStatus").textContent = "CAMERA UNAVAILABLE";
    $("#cameraMessage").textContent =
      "Open this website with Live Server on localhost or HTTPS to enable the camera.";
    return;
  }

  try {
    
cameraStream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 }
  },
  audio: false
});


   
const cameraVideo = $("#cameraFeed");

cameraVideo.srcObject = cameraStream;
cameraVideo.muted = true;
cameraVideo.playsInline = true;

await cameraVideo.play();

console.log("Camera resolution:",
  cameraVideo.videoWidth,
  cameraVideo.videoHeight
);


const video = $("#cameraFeed");

if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
  await new Promise(resolve => {
    video.addEventListener("loadeddata", resolve, { once: true });
  });
}


    $("#cameraStatus").textContent = "SENSOR ACTIVE";
    $("#cameraMessage").textContent =
      "Hold the shutter for 1.3 seconds to preserve this moment.";
  } catch (error) {
    $("#cameraStatus").textContent = "ACCESS DENIED";
    $("#cameraMessage").textContent =
      "Camera access is required. Allow camera permission and try again.";
  }
}

function stopCamera() {
  cancelHold();

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  $("#cameraFeed").srcObject = null;
}

function cancelHold() {
  clearTimeout(holdTimer);
  holdTimer = null;
  $("#captureBtn").classList.remove("holding");
}

function captureMemory() {
 

  const video = $("#cameraFeed");
  const canvas = $("#photoCanvas");

if (
  !video.videoWidth ||
  !video.videoHeight ||
  video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
) {
  $("#cameraMessage").textContent =
    "Camera is still loading. Please wait a moment.";
  return;
}


  if (!video.videoWidth || !video.videoHeight) return;

  const maxWidth = 1000;
  const scale = Math.min(1, maxWidth / video.videoWidth);

  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const image = canvas.toDataURL("image/jpeg", 0.72);

  // DEMO MODE: preview without saving the photo

if (demoMode) {
  const overlay = $("#shutterOverlay");
  overlay.style.opacity = "1";

  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 350);

  // Remove previous preview
  document.querySelector("#demoPhotoPreview")?.remove();
  document.querySelector("#demoRetakeBtn")?.remove();

  // Display captured photo
  const preview = document.createElement("img");
  preview.id = "demoPhotoPreview";
  preview.src = image;
  preview.alt = "Your demo photograph";

  const viewfinder = document.querySelector("#camera .viewfinder");
  viewfinder.appendChild(preview);

  // Create retake button
  const retakeBtn = document.createElement("button");
  retakeBtn.id = "demoRetakeBtn";
  retakeBtn.type = "button";
  retakeBtn.textContent = "↻ RETAKE PHOTO";

  viewfinder.appendChild(retakeBtn);

  retakeBtn.addEventListener("click", () => {
    preview.remove();
    retakeBtn.remove();

    $("#cameraMessage").textContent =
      "Demo ready. Hold the shutter to capture again.";
  });

  $("#cameraMessage").textContent =
    "DEMO PHOTO — Preview your moment or retake it.";

  $("#cameraStatus").textContent = "DEMO / PREVIEW";

  return;
}


  const memory = {
    id: Date.now().toString(),
    date: dateKey(),
    image,
    note: ""
  };

  // Only commit the daily shot if saving succeeds.
  memories.push(memory);

  if (!saveMemories()) {
    memories.pop();
    return;
  }

  const overlay = $("#shutterOverlay");
  overlay.style.opacity = "1";

  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 350);

  stopCamera();
  updateReadouts();

  $("#cameraStatus").textContent = "MEMORY PRESERVED";
  $("#cameraMessage").textContent =
    "One moment, chosen from a thousand.";

  setTimeout(() => showPage("memories"), 850);
}

const captureBtn = $("#captureBtn");

captureBtn.addEventListener("pointerdown", event => {
  if (shotsLeft() === 0 || !cameraStream) return;

  event.preventDefault();
  captureBtn.setPointerCapture(event.pointerId);

  captureBtn.classList.add("holding");

  holdTimer = setTimeout(() => {
    holdTimer = null;
    captureMemory();
  }, HOLD_DURATION);
});

["pointerup", "pointercancel", "lostpointercapture"].forEach(type => {
  captureBtn.addEventListener(type, cancelHold);
});

captureBtn.addEventListener("contextmenu", event => event.preventDefault());

/* =========================================
   ARCHIVE
   ========================================= */

function renderArchive() {
  const grid = $("#memoryGrid");
  const empty = $("#emptyMemories");

  grid.innerHTML = "";

  $("#archiveCount").textContent =
    `${String(memories.length).padStart(3, "0")} PRESERVED FRAMES`;

  empty.style.display = memories.length ? "none" : "block";

  [...memories].reverse().forEach(memory => {
    const card = document.createElement("div");
    card.className = "memory-card";

const serial = document.createElement("div");
serial.className = "memory-serial";
serial.textContent =
  `OS—2040 / FRAME ${String(memories.indexOf(memory) + 1).padStart(3, "0")}`;


    const image = document.createElement("img");
    image.src = memory.image;
    image.alt = `Memory from ${memory.date}`;

    const date = document.createElement("p");
    date.textContent = memory.date;

    const note = document.createElement("p");
    note.textContent = memory.note || "A moment worth keeping.";

    card.append(serial, image, date, note);



   
    card.addEventListener("click", () => openMemory(memory.id));
    grid.appendChild(card);
  });

  // Add an empty film frame after saved memories
  if (memories.length > 0) {
    const futureFrame = document.createElement("div");
    futureFrame.className = "future-film-frame";

    futureFrame.innerHTML = `
      <div class="future-frame-icon">＋</div>
      <h3>MORE MOMENTS AHEAD</h3>
      <p>ONE FRAME PER DAY<br>A LIFETIME OF STORIES</p>
      <span class="future-frame-line"></span>
    `;

    grid.appendChild(futureFrame);
  }
}



function openMemory(id) {
  const memory = memories.find(m => m.id === id);
  if (!memory) return;

  selectedMemoryId = id;

  $("#modalImage").src = memory.image;
  $("#modalDate").textContent = memory.date;
  $("#memoryNote").value = memory.note || "";

  $("#memoryModal").hidden = false;
}

$("#closeModal").addEventListener("click", () => {
  $("#memoryModal").hidden = true;
});

$("#memoryModal").addEventListener("click", event => {
  if (event.target.id === "memoryModal") {
    $("#memoryModal").hidden = true;
  }
});

$("#saveNoteBtn").addEventListener("click", () => {
  const memory = memories.find(m => m.id === selectedMemoryId);
  if (!memory) return;

  const oldNote = memory.note;
  memory.note = $("#memoryNote").value.trim();

  if (!saveMemories()) {
    memory.note = oldNote;
    return;
  }

  $("#memoryModal").hidden = true;
  renderArchive();
});

/* =========================================
   TIMELINE
   ========================================= */

function renderTimeline() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  $("#calendarTitle").textContent =
    now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    }).toUpperCase();

  $("#totalMemories").textContent =
    String(memories.length).padStart(2, "0");

  $("#daysCaptured").textContent =
    String(new Set(memories.map(m => m.date)).size).padStart(2, "0");

  const start = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const firstDay = start.getDay();

  const grid = $("#calendarGrid");
  grid.innerHTML = "";

  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    .forEach(day => {
      const element = document.createElement("div");
      element.className = "calendar-weekday";
      element.textContent = day;
      grid.appendChild(element);
    });

  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  let capturedThisMonth = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    const key = dateKey(new Date(year, month, day));
    const memory = memories.find(m => m.date === key);

    cell.textContent = String(day).padStart(2, "0");

    if (memory) {
      cell.classList.add("captured");
      cell.textContent += " ●";
      capturedThisMonth++;
      cell.style.cursor = "pointer";
      cell.addEventListener("click", () => openMemory(memory.id));
    } else if (day <= today) {
      cell.textContent += " ○";
    }

    grid.appendChild(cell);
  }

  $("#daysUncaptured").textContent =
    String(Math.max(0, today - capturedThisMonth)).padStart(2, "0");
}

/* =========================================
   FUTURE LETTERS
   ========================================= */

function renderLetters() {
  const container = $("#sealedLetters");
  container.innerHTML = "";

  letters.forEach(letter => {
    const element = document.createElement("div");
    element.className = "sealed-letter";

    const unlockDate = new Date(letter.unlockAt);
    const unlocked = Date.now() >= unlockDate.getTime();

    const heading = document.createElement("strong");
    heading.textContent = unlocked
      ? "✉ YOUR LETTER IS READY"
      : "✉ SEALED MEMORY";

    const date = document.createElement("p");
    date.textContent =
      "UNLOCKS: " + unlockDate.toLocaleDateString("en-US");

    element.append(heading, date);

    if (unlocked) {
      const message = document.createElement("p");
      message.textContent = letter.text;
      element.appendChild(message);
    }

    container.appendChild(element);
  });
}

$("#sealLetterBtn").addEventListener("click", () => {
  const text = $("#futureLetter").value.trim();

  if (!text) {
    $("#letterStatus").textContent =
      "Write something to your future self first.";
    return;
  }

  const unlockAt = new Date();
  unlockAt.setFullYear(unlockAt.getFullYear() + 1);

  const letter = {
    id: Date.now().toString(),
    text,
    createdAt: new Date().toISOString(),
    unlockAt: unlockAt.toISOString()
  };

  letters.push(letter);

  try {
    localStorage.setItem(LETTER_KEY, JSON.stringify(letters));
  } catch (error) {
    letters.pop();
    $("#letterStatus").textContent =
      "Unable to save your letter. Please try again.";
    return;
  }

  $("#futureLetter").value = "";
  $("#letterStatus").textContent =
    "Your letter has been sealed for one year.";

  renderLetters();
});

/* =========================================
   CLOCK
   ========================================= */

function updateClock() {
  $("#cameraTime").textContent =
    new Date().toLocaleTimeString("en-US", {
      hour12: false
    });
}

setInterval(updateClock, 1000);

/* =========================================
   INITIALIZE
   ========================================= */

updateReadouts();
updateClock();
renderArchive();
renderTimeline();
renderLetters();

const demoBtn = document.querySelector("#demoModeBtn");

demoBtn.addEventListener("click", () => {
  demoMode = !demoMode;

if (!demoMode) {
  // Remove demo photo and retake button
  document.querySelector("#demoPhotoPreview")?.remove();
  document.querySelector("#demoRetakeBtn")?.remove();

  // Reset the preview status
  $("#cameraMessage").textContent =
    "Demo mode disabled. Normal capture rules restored.";
}


  demoBtn.textContent = demoMode
    ? "DISABLE DEMO MODE"
    : "ENABLE DEMO MODE";

  document.querySelector("#demoModeStatus").textContent =
    demoMode ? "DEMO ACTIVE" : "DEMO OFF";

  updateReadouts();

  if (document.querySelector("#camera").classList.contains("active")) {
    if (demoMode) startCamera();
    else stopCamera();
  }
});
