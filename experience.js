const experienceData = {
  "Lake Rotoiti": {
    title: "Lake Rotoiti Campsite",
    image: "camp-placeholder.jpg",
    text: "A calm lakeside stop that feels slower and quieter than the official data suggests. The place is experienced through still water, soft light, and a sense of pause.",
    tags: ["quiet", "scenic", "easy access", "family friendly"],
    quote: "It didn’t just feel like a campsite. It felt like a pause in the journey.",
    reflection: "In official data this site is organised through category and facilities. In lived experience it becomes a place defined by atmosphere, tempo, and memory."
  },
  "Mavora Lakes": {
    title: "Mavora Lakes Campsite",
    image: "camp-placeholder.jpg",
    text: "A wide open campsite that feels remote and exposed. The physical effort of reaching it becomes part of the place itself.",
    tags: ["remote", "quiet", "open landscape", "long drive"],
    quote: "The journey there stayed in my memory as much as the place itself.",
    reflection: "The official data describes access and services, but the lived experience is shaped more by distance, emptiness, and weather."
  },
  "Routeburn Flats": {
    title: "Routeburn Flats Campsite",
    image: "camp-placeholder.jpg",
    text: "A campsite experienced through movement, anticipation, and the social rhythm of the track. It feels active, shared, and iconic.",
    tags: ["busy", "iconic", "track-based", "high demand"],
    quote: "It felt less like arriving somewhere and more like moving through a larger journey.",
    reflection: "The data lists it as a managed Great Walk campsite, but the experience is built through route, effort, and collective use."
  },
  "Pelorus Bridge": {
    title: "Pelorus Bridge Campsite",
    image: "camp-placeholder.jpg",
    text: "This place feels structured, accessible, and comfortable. It is shaped by family use and the closeness of facilities.",
    tags: ["family friendly", "accessible", "comfortable", "serviced"],
    quote: "It felt like a place designed to make nature easy to enter.",
    reflection: "The official layer foregrounds services and category, while the lived layer highlights comfort, social use, and accessibility."
  },
  "Mistletoe Bay": {
    title: "Mistletoe Bay Campsite",
    image: "camp-placeholder.jpg",
    text: "A place where entry feels meaningful because it is less immediate. Access changes the emotional character of the site.",
    tags: ["boat access", "remote", "scenic", "committed trip"],
    quote: "The route changed the place before I even arrived.",
    reflection: "The official data records access and facilities, but lived experience is shaped by effort, anticipation, and separation."
  }
};

const markers = document.querySelectorAll(".exp-marker");
const experienceTitle = document.getElementById("experienceTitle");
const experienceImage = document.getElementById("experienceImage");
const experienceText = document.getElementById("experienceText");
const experienceTags = document.getElementById("experienceTags");
const experienceQuote = document.getElementById("experienceQuote");
const experienceReflection = document.getElementById("experienceReflection");

markers.forEach((marker) => {
  marker.addEventListener("mouseenter", () => {
    const siteKey = marker.dataset.site;
    updateExperiencePanel(siteKey);
  });

  marker.addEventListener("click", () => {
    const siteKey = marker.dataset.site;
    updateExperiencePanel(siteKey);
  });
});

function updateExperiencePanel(siteKey) {
  const data = experienceData[siteKey];
  if (!data) return;

  experienceTitle.textContent = data.title;
  experienceImage.src = data.image;
  experienceText.textContent = data.text;
  experienceQuote.textContent = `“${data.quote}”`;
  experienceReflection.textContent = data.reflection;

  experienceTags.innerHTML = "";
  data.tags.forEach((tag) => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";
    tagEl.textContent = tag;
    experienceTags.appendChild(tagEl);
  });
}