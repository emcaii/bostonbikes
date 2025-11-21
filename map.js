import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

mapboxgl.accessToken =
  "pk.eyJ1IjoiZGV2ZWxvcHNnIiwiYSI6ImNsdmxpMnhwaDAwZTkya3FvcjV2NXdyeDcifQ.CZsX2VQBKzIBjvAETaRQuk";

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

  // --- Bike lane sources / layers (Boston + Cambridge) ---
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

  // Use ONLY ONE Cambridge source (I switched to the dsc106 copy)
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://dsc106.com/labs/lab07/data/cambridge-bike-lanes.geojson',
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

  // --- SVG overlay selection ---
  const svg = d3.select('#map').select('svg');

  // --- Step 3: load station info ---
  const stationsURL = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

  let stations;
  try {
    const jsonData = await d3.json(stationsURL);
    stations = jsonData.data.stations;
    console.log('Stations:', stations);
  } catch (err) {
    console.error('Error loading stations JSON:', err);
    return;
  }

  // --- Step 4.1: load trips CSV ---
  let trips;
  try {
    trips = await d3.csv(
      'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
      trip => {
        // we’ll need these as Date objects later anyway
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        return trip;
      }
    );
    console.log('Loaded trips:', trips);
  } catch (err) {
    console.error('Error loading trips CSV:', err);
    return;
  }

  // --- Step 4.2: arrivals / departures / totalTraffic ---
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
    const id = station.short_name; // matches start_station_id / end_station_id
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });

  console.log('Stations with traffic:', stations);

  // --- Step 4.3: radius scale (√ scale) ---
  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(stations, d => d.totalTraffic)])
    .range([0, 25]);

  // --- Create circles AFTER we know totalTraffic & radiusScale ---
  const circles = svg
    .selectAll('circle')
    .data(stations, d => d.short_name)
    .enter()
    .append('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.6)
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .each(function (d) {
      d3.select(this)
        .append('title')
        .text(
          `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
        );
    });

  // --- Position circles on the map ---
  function updatePositions() {
    circles
      .attr('cx', d => getCoords(d).cx)
      .attr('cy', d => getCoords(d).cy);
  }

  updatePositions();
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

  updatePositions(); // initial draw

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