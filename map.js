import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiZW1jYWkiLCJhIjoiY21pMTU3OGd0MGdkYzJxb2U1cGFkZ2ZjcyJ9.xtCFjF5LQB8-x1lEvwgD9g';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.Long, +station.Lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

map.on('load', async () => {
  console.log("Map loaded!");
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    
  });
  
  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': 'green',
      'line-width': 3,
      'line-opacity': 0.4,
    },
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://opendata.cambridgema.gov/api/geospatial/49f776b4-6c49-4b63-bdfa-73fe2df3382f?format=GeoJSON'
  });

  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': '#32D400',
      'line-width': 3,
      'line-opacity': 0.5,
    },
  });

  console.log("Bike lane layers added");

  const svg = d3.select('#map').select('svg');

  const INPUT_BLUEBIKES_CSV_URL =
    'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

  let stations = [];

  try {
    const jsonData = await d3.json(INPUT_BLUEBIKES_CSV_URL);
    console.log("Loaded JSON:", jsonData);

    stations = jsonData.data.stations;
    console.log("Stations:", stations);

  } catch (err) {
    console.error("Error loading JSON:", err);
  }

  // Add station circles to SVG
  const circles = svg
    .selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r',d => radiusScale(d.totalTraffic))
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.9);

  function updatePositions() {
    circles
      .attr('cx', d => getCoords(d).cx)
      .attr('cy', d => getCoords(d).cy);
  }
  
  circles.each(function(d) {
  d3.select(this)
    .append("title")
    .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
});

  updatePositions(); // initial draw

  // When map moves, reposition markers
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

  const trips = await d3.csv("https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv");
  console.log("Loaded trips:", trips);

    const departures = d3.rollup(
    trips,
    v => v.length,
    d => d.start_station_id
    );

    const arrivals = d3.rollup(
    trips,
    v => v.length,
    d => d.end_station_id
    );

    stations = stations.map(station => {
    const id = station.short_name;

    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;

    return station;
    });

    console.log("Stations after traffic added:", stations);

    const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(stations, d => d.totalTraffic)])
    .range([0, 25]);
});