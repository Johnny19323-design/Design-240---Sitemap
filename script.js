const csvFile = "DOC_Campsites_8058496540299118787.csv";
const svgFile = "nz-admins.svg";

const svgMapContainer = document.getElementById("svgMapContainer");
const markersLayer = document.getElementById("markersLayer");
const regionFilter = document.getElementById("regionFilter");
const categoryFilter = document.getElementById("categoryFilter");
const resetBtn = document.getElementById("resetBtn");

const detailTitle = document.getElementById("detailTitle");
const officialList = document.getElementById("officialList");

let allSites = [];
let filteredSites = [];
let allRegionNames = [];
let activeRegionName = null;

let minX = Infinity;
let maxX = -Infinity;
let minY = Infinity;
let maxY = -Infinity;

const pointOffsetX = 20;
const paddingX = 6;
const paddingY = 6;

loadSVGMap();
loadCSVData();

async function loadSVGMap() {
  const response = await fetch(svgFile);
  const svgText = await response.text();
  svgMapContainer.innerHTML = svgText;

  prepareSVGRegions();
}

function prepareSVGRegions() {
  const svg = svgMapContainer.querySelector("svg");
  if (!svg) return;

  const possibleShapes = svg.querySelectorAll("path, polygon, g");

  possibleShapes.forEach((shape, index) => {
    // skip the outer svg group if too broad
    if (shape === svg) return;

    // try to find region name from id / name / title
    const regionName =
      shape.getAttribute("name") ||
      shape.getAttribute("id") ||
      shape.querySelector("title")?.textContent ||
      `region-${index}`;

    // avoid tagging marker groups or empty groups
    const hasVisibleGeometry =
      shape.tagName.toLowerCase() === "path" ||
      shape.tagName.toLowerCase() === "polygon" ||
      shape.querySelector("path, polygon");

    if (!hasVisibleGeometry) return;

    shape.classList.add("region-shape");
    shape.dataset.region = regionName;

    shape.addEventListener("click", () => {
      activeRegionName = regionName;
      highlightActiveRegion();
      updateRegionPanel(regionName);
      regionFilter.value = "all";
      applyFilters();
    });
  });
}

function highlightActiveRegion() {
  const shapes = svgMapContainer.querySelectorAll(".region-shape");
  shapes.forEach(shape => {
    shape.classList.remove("active-region");
    if (activeRegionName && shape.dataset.region === activeRegionName) {
      shape.classList.add("active-region");
    }
  });
}

function loadCSVData() {
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

      allRegionNames = [...new Set(allSites.map(site => site.region).filter(Boolean))].sort();
      populateFilters();
      applyFilters();
    }
  });
}

function populateFilters() {
  const categories = [...new Set(allSites.map(site => site.category).filter(Boolean))].sort();

  allRegionNames.forEach(region => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  });

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function applyFilters() {
  filteredSites = allSites.filter(site => {
    const regionMatch = regionFilter.value === "all" || site.region === regionFilter.value;
    const categoryMatch = categoryFilter.value === "all" || site.category === categoryFilter.value;

    if (activeRegionName) {
      // if a region on the SVG is clicked, keep only matching region names where possible
      return regionMatch && categoryMatch && site.region.toLowerCase().includes(activeRegionName.toLowerCase().replace(/-/g, " "));
    }

    return regionMatch && categoryMatch;
  });

  renderMarkers();

  if (!activeRegionName) {
    clearDetailPanel();
  }
}

function renderMarkers() {
  markersLayer.innerHTML = "";

  filteredSites.forEach(site => {
    const marker = document.createElement("div");
    marker.className = `marker ${getCategoryClass(site.category)}`;

    const xPercent = mapValue(site.x2, minX, maxX, paddingX, 100 - paddingX) + pointOffsetX * 0.08;
    const yPercent = mapValue(site.y2, maxY, minY, paddingY, 100 - paddingY);

    marker.style.left = `${xPercent}%`;
    marker.style.top = `${yPercent}%`;

    const size = clamp(mapValue(site.unpoweredSites, 0, 300, 6, 14), 6, 14);
    marker.style.width = `${size}px`;
    marker.style.height = `${size}px`;

    marker.addEventListener("mouseenter", () => {
      updateCampsitePanel(site);
    });

    markersLayer.appendChild(marker);
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
    <li><strong>Website:</strong> ${site.url ? `<a href="${site.url}" target="_blank">Open DOC page</a>` : "Not available"}</li>
  `;
}

function updateRegionPanel(regionName) {
  detailTitle.textContent = regionName;

  const regionSites = allSites.filter(site =>
    site.region.toLowerCase().includes(regionName.toLowerCase().replace(/-/g, " "))
  );

  officialList.innerHTML = `
    <li><strong>Selected Region:</strong> ${regionName}</li>
    <li><strong>Campsites found:</strong> ${regionSites.length}</li>
    <li><strong>Purpose:</strong> region highlight + campsite filtering</li>
    <li><strong>Next step:</strong> connect official and experience layers</li>
  `;
}

function clearDetailPanel() {
  detailTitle.textContent = "Select a region or campsite";
  officialList.innerHTML = `
    <li>Click a region on the map or move over a campsite marker.</li>
  `;
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