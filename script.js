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

const routeTitle = document.getElementById("routeTitle");
const routeInfoList = document.getElementById("routeInfoList");

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

const routeMeta = {
  "Nelson Lakes Weekend Camp": {
    primaryType: "camping",
    score: 88,
    start: "Kerr Bay Campsite",
    end: "Lake Rotoroa Campsite",
    summary: "A scenic camping-focused route through the Nelson Lakes area, suitable for relaxed weekend travel."
  },
  "Marlborough Sounds Camp Route": {
    primaryType: "camping",
    score: 84,
    start: "Momorangi Campsite",
    end: "Schoolhouse Bay Campsite",
    summary: "A coastal camping route with access to bays, views, and short outdoor stops around Marlborough Sounds."
  },
  "Canterbury Easy Camp Route": {
    primaryType: "camping",
    score: 80,
    start: "Lake Middleton Campsite",
    end: "Ahuriri Bridge Campsite",
    summary: "An easy-access camping route designed for shorter and simpler outdoor trips."
  },
  "Abel Tasman Coastal Walk": {
    primaryType: "hiking",
    score: 92,
    start: "Tōtaranui Campground",
    end: "Awaroa Campsite",
    summary: "A hiking-focused coastal route based on Great Walk-style movement through Abel Tasman."
  },
  "Nelson Lakes Hiking Escape": {
    primaryType: "hiking",
    score: 85,
    start: "Kerr Bay Campsite",
    end: "West Bay Campsite - Buller Zone",
    summary: "A hiking-oriented route in the Nelson Lakes area with strong lake and forest scenery."
  },
  "Canterbury Short Walk Route": {
    primaryType: "hiking",
    score: 78,
    start: "Lake Poaka Campsite",
    end: "Lake Middleton Campsite",
    summary: "A short walking route suited to users looking for manageable outdoor movement over a short time frame."
  },
  "Marlborough Sounds Water Route": {
    primaryType: "water-based",
    score: 87,
    start: "Momorangi Campsite",
    end: "Camp Bay Campsite",
    summary: "A water-based route focused on boating, fishing, and coastal access around the Marlborough Sounds."
  },
  "Nelson Lakes Lake Activity Route": {
    primaryType: "water-based",
    score: 86,
    start: "West Bay Campsite - Jetty Zone",
    end: "Lake Rotoroa Campsite",
    summary: "A lake-based route organised around water access, boating, and relaxed lakeside activity."
  }
};

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

  const regionShapes = svgMapContainer.querySelectorAll("path[id], polygon[id]");
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
  const routeGroups = Object.keys(routeMeta);
  const routeTypes = ["Camping", "Hiking", "Water-based"];

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

function onFilterChange() {
  applyFilters();
}

function updateMapTransform() {
  mapContent.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

function applyFilters() {
  filteredSites = allSites.filter((site) => {
    const routeGroupMatch =
      routeGroupFilter.value === "all" || site.routeGroups.includes(routeGroupFilter.value);

    const selectedType = routeTypeFilter.value.toLowerCase();
    const routeTypeMatch =
      routeTypeFilter.value === "all" ||
      getPrimaryTypeFromRoutes(site.routeGroups) === selectedType;

    return routeGroupMatch && routeTypeMatch;
  });

  updateRoutePanel();
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
    marker.className = `marker ${getMarkerClass(site.routeGroups)}`;

    marker.style.left = `${site.px}px`;
    marker.style.top = `${site.py}px`;

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
  const threshold = 18;
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

    const radius = 12;
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
    .filter((p) => p.routeGroups.includes(selectedRouteGroup))
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

function updateRoutePanel() {
  const selectedRoute = routeGroupFilter.value;

  if (selectedRoute === "all") {
    routeTitle.textContent = "No route selected";
    routeInfoList.innerHTML = `
      <li>Choose a route group from the filters to view route details.</li>
    `;
    return;
  }

  const meta = routeMeta[selectedRoute];
  if (!meta) return;

  const sitesInRoute = allSites.filter(site => site.routeGroups.includes(selectedRoute));
  const siteNames = sitesInRoute.map(site => site.siteName);

  routeTitle.textContent = selectedRoute;
  routeInfoList.innerHTML = `
    <li><strong>Primary Type:</strong> ${formatPrimaryType(meta.primaryType)}</li>
    <li><strong>Start:</strong> ${meta.start}</li>
    <li><strong>End:</strong> ${meta.end}</li>
    <li><strong>Recommendation Score:</strong> ${meta.score}</li>
    <li><strong>Summary:</strong> ${meta.summary}</li>
    <li><strong>Campsites in Route:</strong> ${siteNames.join(", ")}</li>
  `;
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

function getPrimaryTypeFromRoutes(routeGroupsText) {
  const routeNames = routeGroupsText.split("|").map(r => r.trim());

  for (const routeName of routeNames) {
    if (routeMeta[routeName]) {
      return routeMeta[routeName].primaryType;
    }
  }

  return "default";
}

function getMarkerClass(routeGroupsText) {
  const primary = getPrimaryTypeFromRoutes(routeGroupsText);
  if (primary === "camping") return "camping";
  if (primary === "hiking") return "hiking";
  if (primary === "water-based") return "water-based";
  return "default-route";
}

function formatPrimaryType(type) {
  if (type === "camping") return "Camping";
  if (type === "hiking") return "Hiking";
  if (type === "water-based") return "Water-based";
  return type;
}

function mapValue(value, start1, stop1, start2, stop2) {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}