const csvFile = "final_filtered_route_database.csv";
const svgFile = "nz-admins.svg";

const svgMapContainer = document.getElementById("svgMapContainer");
const markersLayer = document.getElementById("markersLayer");
const routesLayer = document.getElementById("routesLayer");

const routeGroupFilter = document.getElementById("routeGroupFilter");
const routeTypeFilter = document.getElementById("routeTypeFilter");
const resetBtn = document.getElementById("resetBtn");

const detailTitle = document.getElementById("detailTitle");
const detailList = document.getElementById("detailList");

const mapWrapper = document.getElementById("mapWrapper");
const mapContent = document.getElementById("mapContent");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");

let allSites = [];
let filteredSites = [];
let svgLoaded = false;

const nzMinX = 1080000;
const nzMaxX = 2120000;
const nzMinY = 4720000;
const nzMaxY = 6230000;

let zoomLevel = 1;
let panX = 0;
let panY = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let startPanX = 0;
let startPanY = 0;

const paddingLeft = 0.12;
const paddingRight = 0.88;
const paddingTop = 0.08;
const paddingBottom = 0.92;

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
    shape.classList.add("region-shape");
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

            return {
              siteName: row["Name of site"] || "Unknown site",
              clusterGroup: row["cluster_group"] || "Unknown cluster",
              routeGroups: row["route_groups"] || "Unknown route group",
              routeTypeFocus: row["route_type_focus"] || "Unknown route type",
              region: row["Region"] || "Not specified",
              place: row["Place"] || "Not specified",
              category: row["Campsite category"] || "Unknown",
              unpoweredSites: isNaN(unpowered) ? 0 : unpowered,
              bookable: row["Bookable"] || "Unknown",
              free: row["Free"] || "Unknown",
              facilities: row["Facilities cleaned"] || "Not specified",
              activities: row["Activities cleaned"] || "Not specified",
              dogs: row["Dogs cleaned"] || "Not specified",
              landscape: row["Landscape type"] || "Not specified",
              accessBy: row["Access by"] || "Not specified",
              url: row["URL to webpage"] || "",
              x2,
              y2
            };
          })
          .filter(Boolean);

        populateFilters();
        resolve();
      }
    });
  });
}

function populateFilters() {
  const routeGroups = [...new Set(allSites.map(site => site.routeGroups).filter(Boolean))].sort();
  const routeTypes = [...new Set(allSites.map(site => site.routeTypeFocus).filter(Boolean))].sort();

  fillSelect(routeGroupFilter, routeGroups);
  fillSelect(routeTypeFilter, routeTypes);
}

function fillSelect(selectElement, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
}

function setupEvents() {
  routeGroupFilter.addEventListener("change", onFilterChange);
  routeTypeFilter.addEventListener("change", onFilterChange);

  resetBtn.addEventListener("click", () => {
    routeGroupFilter.value = "all";
    routeTypeFilter.value = "all";
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    applyFilters();
    updateMapTransform();
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

  mapWrapper.addEventListener(
    "wheel",
    (event) => {
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
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    renderMarkers();
  });
}

function onFilterChange() {
  applyFilters();
}

function updateMapTransform() {
  mapContent.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

function applyFilters() {
  filteredSites = allSites.filter((site) => {
    const routeGroupMatch =
      routeGroupFilter.value === "all" || site.routeGroups === routeGroupFilter.value;

    const routeTypeMatch =
      routeTypeFilter.value === "all" || site.routeTypeFocus === routeTypeFilter.value;

    return routeGroupMatch && routeTypeMatch;
  });

  clearDetailPanel();
  renderMarkers();
}

function renderMarkers() {
  markersLayer.innerHTML = "";
  routesLayer.innerHTML = "";

  if (!svgLoaded) return;

  const svg = svgMapContainer.querySelector("svg");
  if (!svg) return;

  const svgRect = svg.getBoundingClientRect();
  const containerRect = svgMapContainer.getBoundingClientRect();

  const svgLeft = svgRect.left - containerRect.left;
  const svgTop = svgRect.top - containerRect.top;
  const svgWidth = svgRect.width;
  const svgHeight = svgRect.height;

  let projected = filteredSites.map((site) => {
    const relativeX = mapValue(site.x2, nzMinX, nzMaxX, paddingLeft, paddingRight);
    const relativeY = mapValue(site.y2, nzMaxY, nzMinY, paddingTop, paddingBottom);

    return {
      ...site,
      px: svgLeft + svgWidth * relativeX,
      py: svgTop + svgHeight * relativeY
    };
  });

  projected = spreadOverlappingPoints(projected);

  drawRouteLines(projected);

  projected.forEach((site) => {
    const marker = document.createElement("div");
    marker.className = `marker ${getRouteTypeClass(site.routeTypeFocus)}`;

    marker.style.left = `${site.px}px`;
    marker.style.top = `${site.py}px`;

    const size = clamp(mapValue(site.unpoweredSites, 0, 300, 8, 13), 8, 13);
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

function spreadOverlappingPoints(points) {
  const threshold = 16;
  const groups = [];

  points.forEach((point) => {
    let placed = false;

    for (const group of groups) {
      const dx = point.px - group.cx;
      const dy = point.py - group.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < threshold) {
        group.points.push(point);
        group.cx = group.points.reduce((sum, p) => sum + p.px, 0) / group.points.length;
        group.cy = group.points.reduce((sum, p) => sum + p.py, 0) / group.points.length;
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push({
        cx: point.px,
        cy: point.py,
        points: [point]
      });
    }
  });

  const result = [];

  groups.forEach((group) => {
    if (group.points.length === 1) {
      result.push(group.points[0]);
      return;
    }

    const radius = 10;
    group.points.forEach((point, index) => {
      const angle = (Math.PI * 2 * index) / group.points.length;
      result.push({
        ...point,
        px: group.cx + Math.cos(angle) * radius,
        py: group.cy + Math.sin(angle) * radius
      });
    });
  });

  return result;
}

function drawRouteLines(points) {
  const selectedRouteGroup = routeGroupFilter.value;
  if (selectedRouteGroup === "all") return;

  const routePoints = points
    .filter((p) => p.routeGroups === selectedRouteGroup)
    .sort((a, b) => a.y2 - b.y2);

  if (routePoints.length < 2) return;

  const pathData = routePoints
    .map((p, index) => `${index === 0 ? "M" : "L"} ${p.px} ${p.py}`)
    .join(" ");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("class", "route-line");
  routesLayer.appendChild(path);
}

function updateCampsitePanel(site) {
  detailTitle.textContent = site.siteName;

  detailList.innerHTML = `
    <li><strong>Route Group:</strong> ${site.routeGroups}</li>
    <li><strong>Route Type:</strong> ${site.routeTypeFocus}</li>
    <li><strong>Cluster:</strong> ${site.clusterGroup}</li>
    <li><strong>Region:</strong> ${site.region}</li>
    <li><strong>Place:</strong> ${site.place}</li>
    <li><strong>Category:</strong> ${site.category}</li>
    <li><strong>Access:</strong> ${site.accessBy}</li>
    <li><strong>Activities:</strong> ${site.activities}</li>
    <li><strong>Facilities:</strong> ${site.facilities}</li>
    <li><strong>Landscape:</strong> ${site.landscape}</li>
    <li><strong>Dogs:</strong> ${site.dogs}</li>
    <li><strong>Bookable:</strong> ${site.bookable}</li>
    <li><strong>Free:</strong> ${site.free}</li>
    <li><strong>Unpowered Sites:</strong> ${site.unpoweredSites}</li>
    <li><strong>Website:</strong> ${
      site.url ? `<a href="${site.url}" target="_blank">Open DOC page</a>` : "Not available"
    }</li>
  `;
}

function clearDetailPanel() {
  detailTitle.textContent = "Select a campsite";
  detailList.innerHTML = `
    <li>Use the filters on the left or hover over a campsite marker.</li>
  `;
}

function getRouteTypeClass(routeType) {
  const value = String(routeType).toLowerCase();

  if (value.includes("camping")) return "camping";
  if (value.includes("hiking")) return "hiking";
  if (value.includes("water")) return "water-based";

  return "default-route";
}

function mapValue(value, start1, stop1, start2, stop2) {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}