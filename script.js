const csvFile = "DOC_Campsites_8058496540299118787.csv";
const svgFile = "nz-admins.svg";

const svgMapContainer = document.getElementById("svgMapContainer");
const markersLayer = document.getElementById("markersLayer");
const regionFilter = document.getElementById("regionFilter");
const categoryFilter = document.getElementById("categoryFilter");
const resetBtn = document.getElementById("resetBtn");

const detailTitle = document.getElementById("detailTitle");
const officialList = document.getElementById("officialList");

const mapWrapper = document.getElementById("mapWrapper");
const mapContent = document.getElementById("mapContent");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");

let allSites = [];
let filteredSites = [];
let allRegionNames = [];

let activeRegionName = null;
let svgLoaded = false;

let minX = Infinity;
let maxX = -Infinity;
let minY = Infinity;
let maxY = -Infinity;

// zoom + pan
let zoomLevel = 1;
let panX = 0;
let panY = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let startPanX = 0;
let startPanY = 0;

// marker padding inside visible SVG area
const paddingLeft = 0.06;
const paddingRight = 0.94;
const paddingTop = 0.06;
const paddingBottom = 0.94;

init();

async function init() {
  await loadSVGMap();
  await loadCSVData();
  setupEvents();
  applyFilters();
  updateMapTransform();
}

async function loadSVGMap() {
  try {
    const response = await fetch(svgFile);
    const svgText = await response.text();
    svgMapContainer.innerHTML = svgText;
    prepareSVGRegions();
    svgLoaded = true;
  } catch (error) {
    console.error("Failed to load SVG:", error);
  }
}

function prepareSVGRegions() {
  const svg = svgMapContainer.querySelector("svg");
  if (!svg) return;

  svg.removeAttribute("width");
  svg.removeAttribute("height");

  const regionShapes = svg.querySelectorAll("path[id], polygon[id]");

  regionShapes.forEach((shape) => {
    const regionId = shape.getAttribute("id");
    if (!regionId) return;

    shape.classList.add("region-shape");
    shape.dataset.regionId = regionId;

    shape.addEventListener("click", () => {
      activeRegionName = regionId;
      highlightActiveRegion();
      updateRegionPanel(regionId);
      renderMarkers();
    });
  });
}

async function loadCSVData() {
  return new Promise((resolve) => {
    Papa.parse(csvFile, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        allSites = results.data
          .map((row) => {
            const x2 = Number(row["x2"]);
            const y2 = Number(row["y2"]);
            const unpowered = Number(row["Number of unpowered sites"]);

            if (isNaN(x2) || isNaN(y2)) return null;

            minX = Math.min(minX, x2);
            maxX = Math.max(maxX, x2);
            minY = Math.min(minY, y2);
            maxY = Math.max(maxY, y2);

            return {
              siteName: row["Name of site"] || "Unknown site",
              region: row["Region"] || "Not specified",
              category: row["Campsite category"] || "Unknown",
              accessBy: row["Access by"] || "Not specified",
              dogPolicy: cleanText(row["Dogs alllowed"]),
              facilities: cleanText(row["Facilities"]),
              unpoweredSites: isNaN(unpowered) ? 0 : unpowered,
              url: row["URL to webpage"] || "",
              x2,
              y2
            };
          })
          .filter(Boolean);

        allRegionNames = [...new Set(allSites.map((site) => site.region).filter(Boolean))].sort();
        populateFilters();
        resolve();
      }
    });
  });
}

function populateFilters() {
  const categories = [...new Set(allSites.map((site) => site.category).filter(Boolean))].sort();

  allRegionNames.forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  });

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function setupEvents() {
  regionFilter.addEventListener("change", () => {
    activeRegionName = null;
    highlightActiveRegion();
    applyFilters();
  });

  categoryFilter.addEventListener("change", () => {
    applyFilters();
  });

  resetBtn.addEventListener("click", () => {
    regionFilter.value = "all";
    categoryFilter.value = "all";
    activeRegionName = null;
    highlightActiveRegion();
    applyFilters();
  });

  zoomInBtn.addEventListener("click", () => {
    zoomLevel = Math.min(zoomLevel + 0.2, 3);
    updateMapTransform();
  });

  zoomOutBtn.addEventListener("click", () => {
    zoomLevel = Math.max(zoomLevel - 0.2, 1);
    if (zoomLevel === 1) {
      panX = 0;
      panY = 0;
    }
    updateMapTransform();
  });

  zoomResetBtn.addEventListener("click", () => {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    updateMapTransform();
  });

  mapWrapper.addEventListener("mousedown", (event) => {
    if (zoomLevel <= 1) return;

    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    startPanX = panX;
    startPanY = panY;

    mapWrapper.classList.add("dragging");
  });

  window.addEventListener("mousemove", (event) => {
    if (!isDragging) return;

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;

    panX = startPanX + dx;
    panY = startPanY + dy;

    updateMapTransform();
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    mapWrapper.classList.remove("dragging");
  });

  mapWrapper.addEventListener("wheel", (event) => {
    event.preventDefault();

    if (event.deltaY < 0) {
      zoomLevel = Math.min(zoomLevel + 0.1, 3);
    } else {
      zoomLevel = Math.max(zoomLevel - 0.1, 1);
    }

    if (zoomLevel === 1) {
      panX = 0;
      panY = 0;
    }

    updateMapTransform();
  }, { passive: false });

  window.addEventListener("resize", () => {
    renderMarkers();
  });
}

function updateMapTransform() {
  mapContent.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

function applyFilters() {
  filteredSites = allSites.filter((site) => {
    const regionMatch =
      regionFilter.value === "all" || site.region === regionFilter.value;

    const categoryMatch =
      categoryFilter.value === "all" || site.category === categoryFilter.value;

    return regionMatch && categoryMatch;
  });

  renderMarkers();

  if (!activeRegionName) {
    clearDetailPanel();
  }
}

function renderMarkers() {
  markersLayer.innerHTML = "";

  if (!svgLoaded) return;

  const svg = svgMapContainer.querySelector("svg");
  if (!svg) return;

  const svgRect = svg.getBoundingClientRect();
  const wrapperRect = svgMapContainer.getBoundingClientRect();

  const svgLeft = svgRect.left - wrapperRect.left;
  const svgTop = svgRect.top - wrapperRect.top;
  const svgWidth = svgRect.width;
  const svgHeight = svgRect.height;

  filteredSites.forEach((site) => {
    const marker = document.createElement("div");
    marker.className = `marker ${getCategoryClass(site.category)}`;

    const relativeX = mapValue(site.x2, minX, maxX, paddingLeft, paddingRight);
    const relativeY = mapValue(site.y2, maxY, minY, paddingTop, paddingBottom);

    const px = svgLeft + svgWidth * relativeX;
    const py = svgTop + svgHeight * relativeY;

    marker.style.left = `${px}px`;
    marker.style.top = `${py}px`;

    const size = clamp(mapValue(site.unpoweredSites, 0, 300, 5, 10), 5, 10);
    marker.style.width = `${size}px`;
    marker.style.height = `${size}px`;

    marker.addEventListener("mouseenter", () => {
      updateCampsitePanel(site);
    });

    marker.addEventListener("click", () => {
      updateCampsitePanel(site);
    });

    markersLayer.appendChild(marker);
  });
}

function highlightActiveRegion() {
  const shapes = svgMapContainer.querySelectorAll(".region-shape");
  shapes.forEach((shape) => {
    shape.classList.remove("active-region");
    if (activeRegionName && shape.dataset.regionId === activeRegionName) {
      shape.classList.add("active-region");
    }
  });
}

function updateCampsitePanel(site) {
  detailTitle.textContent = site.siteName;

  officialList.innerHTML = `
    <li><strong>Region:</strong> ${site.region}</li>
    <li><strong>Category:</strong> ${site.category}</li>
    <li><strong>Access:</strong> ${site.accessBy}</li>
    <li><strong>Dog Policy:</strong> ${site.dogPolicy}</li>
    <li><strong>Unpowered Sites:</strong> ${site.unpoweredSites}</li>
    <li><strong>Facilities:</strong> ${site.facilities}</li>
    <li><strong>Website:</strong> ${
      site.url ? `<a href="${site.url}" target="_blank">Open DOC page</a>` : "Not available"
    }</li>
  `;
}

function updateRegionPanel(regionId) {
  detailTitle.textContent = getFriendlyRegionName(regionId);

  officialList.innerHTML = `
    <li><strong>Selected Region:</strong> ${getFriendlyRegionName(regionId)}</li>
    <li><strong>Map interaction:</strong> region highlight only</li>
    <li><strong>Markers:</strong> remain visible unless filtered from the left panel</li>
    <li><strong>Navigation:</strong> zoom and drag enabled</li>
  `;
}

function clearDetailPanel() {
  detailTitle.textContent = "Select a region or campsite";
  officialList.innerHTML = `
    <li>Click a region on the map or hover over a campsite marker.</li>
  `;
}

function getFriendlyRegionName(regionId) {
  const names = {
    NZAUK: "Auckland",
    NZBOP: "Bay of Plenty",
    NZCAN: "Canterbury",
    NZGIS: "Gisborne",
    NZHKB: "Hawke's Bay",
    NZMBH: "Marlborough",
    NZMWT: "Manawatū-Whanganui",
    NZNSN: "Nelson",
    NZNTL: "Northland",
    NZOTA: "Otago",
    NZSTL: "Southland",
    NZTAS: "Tasman",
    NZTKI: "Taranaki",
    NZWGN: "Wellington",
    NZWKO: "Waikato",
    NZWTC: "West Coast"
  };

  return names[regionId] || regionId;
}

function getCategoryClass(category) {
  const value = category.toLowerCase().trim();
  if (value === "great walk") return "great-walk";
  return value.replace(/\s+/g, "-") || "unknown";
}

function cleanText(value) {
  if (!value) return "Not specified";
  let cleaned = String(value);
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned || "Not specified";
}

function mapValue(value, start1, stop1, start2, stop2) {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}