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
    summary: "A scenic camping-focused route through the Nelson Lakes area, suitable for relaxed weekend travel.",
    stops: [
      "Kerr Bay Campsite",
      "West Bay Campsite - Jetty Zone",
      "West Bay Campsite - Buller Zone",
      "Lake Rotoroa Campsite"
    ]
  },
  "Marlborough Sounds Camp Route": {
    primaryType: "camping",
    score: 84,
    summary: "A coastal camping route with access to bays, views, and short outdoor stops around Marlborough Sounds.",
    stops: [
      "Momorangi Campsite",
      "Whatamango Bay Campsite",
      "Camp Bay Campsite",
      "Schoolhouse Bay Campsite"
    ]
  },
  "Canterbury Easy Camp Route": {
    primaryType: "camping",
    score: 80,
    summary: "An easy-access camping route designed for shorter and simpler outdoor trips.",
    stops: [
      "Lake Middleton Campsite",
      "Lake Poaka Campsite",
      "Ahuriri Bridge Campsite"
    ]
  },
  "Abel Tasman Coastal Walk": {
    primaryType: "hiking",
    score: 92,
    summary: "A hiking-focused coastal route based on Great Walk-style movement through Abel Tasman.",
    stops: [
      "Tōtaranui Campground",
      "Anchorage Campsite",
      "Bark Bay Campsite",
      "Awaroa Campsite"
    ]
  },
  "Nelson Lakes Hiking Escape": {
    primaryType: "hiking",
    score: 85,
    summary: "A hiking-oriented route in the Nelson Lakes area with strong lake and forest scenery.",
    stops: [
      "Kerr Bay Campsite",
      "West Bay Campsite - Buller Zone",
      "Lake Rotoroa Campsite"
    ]
  },
  "Canterbury Short Walk Route": {
    primaryType: "hiking",
    score: 78,
    summary: "A short walking route suited to users looking for manageable outdoor movement over a short time frame.",
    stops: [
      "Lake Poaka Campsite",
      "Lake Middleton Campsite"
    ]
  },
  "Marlborough Sounds Water Route": {
    primaryType: "water-based",
    score: 87,
    summary: "A water-based route focused on boating, fishing, and coastal access around the Marlborough Sounds.",
    stops: [
      "Momorangi Campsite",
      "Whatamango Bay Campsite",
      "Camp Bay Campsite"
    ]
  },
  "Nelson Lakes Lake Activity Route": {
    primaryType: "water-based",
    score: 86,
    summary: "A lake-based route organised around water access, boating, and relaxed lakeside activity.",
    stops: [
      "West Bay Campsite - Jetty Zone",
      "Lake Rotoroa Campsite"
    ]
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
  routeGroupFilter.addEventListener("change", () => {
    if (routeGroupFilter.value !== "all") {
      routeTypeFilter.value = "all";
    }
    applyFilters();
  });

  routeTypeFilter.addEventListener("change", () => {
    if (routeTypeFilter.value !== "all") {
      routeGroupFilter.value = "all";
    }
    applyFilters();
  });

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

function updateMapTransform() {
  mapContent.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

function applyFilters() {
  filteredSites = allSites.filter((site) => {
    const routeNames = parseRouteNames(site.routeGroups);

    const routeGroupMatch =
      routeGroupFilter.value === "all" || routeNames.includes(routeGroupFilter.value);

    const selectedType = routeTypeFilter.value.toLowerCase();
    const routeTypeMatch =
      routeTypeFilter.value === "all" ||
      routeNames.some((routeName) => routeMeta[routeName]?.primaryType === selectedType);

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

  const markerEntries = [];

  filteredSites.forEach((site) => {
    const relativeX = mapValue(site.x2, nzMinX, nzMaxX, paddingLeft, paddingRight);
    const relativeY = mapValue(site.y2, nzMaxY, nzMinY, paddingTop, paddingBottom);

    const basePx = svgLeft + svgWidth * relativeX;
    const basePy = svgTop + svgHeight * relativeY;

    const matchedRoutes = getMatchedRoutesForSite(site);

    matchedRoutes.forEach((routeName) => {
      const primaryType = routeMeta[routeName]?.primaryType || "default";

      markerEntries.push({
        ...site,
        displayRouteName: routeName,
        markerType: primaryType,
        px: basePx,
        py: basePy
      });
    });
  });

  const spreadMarkers = spreadOverlappingMarkers(markerEntries);

  drawRouteLines(spreadMarkers);

  spreadMarkers.forEach((entry) => {
    const marker = document.createElement("div");
    marker.className = `marker ${getMarkerClassFromType(entry.markerType)}`;

    marker.style.left = `${entry.px}px`;
    marker.style.top = `${entry.py}px`;

    marker.addEventListener("mouseenter", () => {
      updateCampsitePanel(entry);
    });

    marker.addEventListener("click", () => {
      updateCampsitePanel(entry);
    });

    markersLayer.appendChild(marker);
  });
}

function getMatchedRoutesForSite(site) {
  const routeNames = parseRouteNames(site.routeGroups);

  let matched = routeNames;

  if (routeGroupFilter.value !== "all") {
    matched = matched.filter((name) => name === routeGroupFilter.value);
  }

  if (routeTypeFilter.value !== "all") {
    const selectedType = routeTypeFilter.value.toLowerCase();
    matched = matched.filter((name) => routeMeta[name]?.primaryType === selectedType);
  }

  return matched;
}

function spreadOverlappingMarkers(markers) {
  const threshold = 18;
  const groups = [];

  markers.forEach((marker) => {
    let placed = false;

    for (const group of groups) {
      const dx = marker.px - group.cx;
      const dy = marker.py - group.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < threshold) {
        group.markers.push(marker);
        group.cx = group.markers.reduce((sum, m) => sum + m.px, 0) / group.markers.length;
        group.cy = group.markers.reduce((sum, m) => sum + m.py, 0) / group.markers.length;
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push({
        cx: marker.px,
        cy: marker.py,
        markers: [marker]
      });
    }
  });

  const result = [];

  groups.forEach((group) => {
    if (group.markers.length === 1) {
      result.push(group.markers[0]);
      return;
    }

    const radius = 14;
    group.markers.forEach((marker, index) => {
      const angle = (Math.PI * 2 * index) / group.markers.length;
      result.push({
        ...marker,
        px: group.cx + Math.cos(angle) * radius,
        py: group.cy + Math.sin(angle) * radius
      });
    });
  });

  return result;
}

function drawRouteLines(markers) {
  const selectedRouteGroup = routeGroupFilter.value;
  if (selectedRouteGroup === "all") return;

  const meta = routeMeta[selectedRouteGroup];
  if (!meta || !meta.stops || meta.stops.length < 2) return;

  const orderedMarkers = meta.stops
    .map((stopName) =>
      markers.find(
        (m) =>
          m.siteName === stopName &&
          m.displayRouteName === selectedRouteGroup
      )
    )
    .filter(Boolean);

  if (orderedMarkers.length < 2) return;

  const pathData = orderedMarkers
    .map((m, index) => `${index === 0 ? "M" : "L"} ${m.px} ${m.py}`)
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

  const stopsText = meta.stops.join(" → ");

  routeTitle.textContent = selectedRoute;
  routeInfoList.innerHTML = `
    <li><strong>Primary Type:</strong> ${formatPrimaryType(meta.primaryType)}</li>
    <li><strong>Start:</strong> ${meta.stops[0]}</li>
    <li><strong>Route Stops:</strong> ${stopsText}</li>
    <li><strong>End:</strong> ${meta.stops[meta.stops.length - 1]}</li>
    <li><strong>Recommendation Score:</strong> ${meta.score}</li>
    <li><strong>Summary:</strong> ${meta.summary}</li>
  `;
}

function updateCampsitePanel(entry) {
  detailTitle.textContent = entry.siteName;

  detailList.innerHTML = `
    <li><strong>Selected Route:</strong> ${entry.displayRouteName}</li>
    <li><strong>Route Group(s):</strong> ${entry.routeGroups}</li>
    <li><strong>Route Type:</strong> ${entry.routeTypeFocus}</li>
    <li><strong>Cluster:</strong> ${entry.clusterGroup}</li>
    <li><strong>Region:</strong> ${entry.region}</li>
    <li><strong>Place:</strong> ${entry.place}</li>
    <li><strong>Category:</strong> ${entry.category}</li>
    <li><strong>Access:</strong> ${entry.accessBy}</li>
    <li><strong>Activities:</strong> ${entry.activities}</li>
    <li><strong>Facilities:</strong> ${entry.facilities}</li>
    <li><strong>Landscape:</strong> ${entry.landscape}</li>
    <li><strong>Dogs:</strong> ${entry.dogs}</li>
    <li><strong>Bookable:</strong> ${entry.bookable}</li>
    <li><strong>Free:</strong> ${entry.free}</li>
    <li><strong>Unpowered Sites:</strong> ${entry.unpoweredSites}</li>
    <li><strong>Website:</strong> ${
      entry.url ? `<a href="${entry.url}" target="_blank">Open DOC page</a>` : "Not available"
    }</li>
  `;
}

function clearDetailPanel() {
  detailTitle.textContent = "Select a campsite";
  detailList.innerHTML = `
    <li>Use the filters on the left or hover over a campsite marker.</li>
  `;
}

function parseRouteNames(routeGroupsText) {
  return String(routeGroupsText)
    .split("|")
    .map((r) => r.trim())
    .filter(Boolean);
}

function getMarkerClassFromType(type) {
  if (type === "camping") return "camping";
  if (type === "hiking") return "hiking";
  if (type === "water-based") return "water-based";
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