import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

mapboxgl.accessToken =
  "pk.eyJ1IjoiZGV2ZWxvcHNnIiwiYSI6ImNsdmxpMnhwaDAwZTkya3FvcjV2NXdyeDcifQ.CZsX2VQBKzIBjvAETaRQuk";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
  center: [-71.0589, 42.3601], // Boston
  zoom: 11.2
});

// SVG overlay element inside #map
const svg = d3.select("#map").select("svg");

// Helper for projecting lat/lng → pixels
function getCoords(station) {
  const lngLat = new mapboxgl.LngLat(+station.Long, +station.Lat);
  const { x, y } = map.project(lngLat);
  return { cx: x, cy: y };
}

map.on("load", async () => {
  console.log("Map loaded!");

  map.addSource("boston_route", {
    type: "geojson",
    data:
      "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson"
  });

  map.addLayer({
    id: "boston-bike-lanes",
    type: "line",
    source: "boston_route",
    paint: {
      "line-color": "green",
      "line-width": 3,
      "line-opacity": 0.4
    }
  });

    map.addSource("cambridge_route", {
    type: "geojson",
    data: "https://dsc106.com/labs/lab07/data/cambridge-bike-lanes.geojson"
    });

  map.addLayer({
    id: "cambridge-bike-lanes",
    type: "line",
    source: "cambridge_route",
    paint: {
      "line-color": "#32D400",
      "line-width": 3,
      "line-opacity": 0.5
    }
  });

  const stationURL =
    "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";

  let stationData = await d3.json(stationURL);
  let stations = stationData.data.stations;

  console.log("Loaded stations:", stations);

  let trips = await d3.csv(
    "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv",
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    }
  );

  console.log("Loaded trips:", trips);

  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id
  );

  stations = stations.map((s) => {
    const id = s.short_name;
    s.arrivals = arrivals.get(id) ?? 0;
    s.departures = departures.get(id) ?? 0;
    s.totalTraffic = s.arrivals + s.departures;
    return s;
  });

  console.log("Stations with traffic:", stations);

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]); // adjust if needed

  const circles = svg
    .selectAll("circle")
    .data(stations, (d) => d.short_name)
    .enter()
    .append("circle")
    .attr("r", (d) => radiusScale(d.totalTraffic))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.6)
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .each(function (d) {
      d3.select(this)
        .append("title")
        .text(
          `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
        );
    });

  function updatePositions() {
    circles
      .attr("cx", (d) => getCoords(d).cx)
      .attr("cy", (d) => getCoords(d).cy);
  }

  updatePositions();
  map.on("move", updatePositions);
  map.on("zoom", updatePositions);
  map.on("moveend", updatePositions);
  map.on("resize", updatePositions);
});
