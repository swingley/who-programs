var programs, highlight;
var map = L.map('map').setView([30, 0], 2);
L.esri.basemapLayer("Gray").addTo(map);

// Styling info.
var colors = [
  { 'hex': '#19375C' },
  { 'hex': '#1072BD' },
  { 'hex': '#1EB1ED' },
  { 'hex': '#B7DDE7' },
  { 'hex': '#94CDDB' },
  { 'hex': '#96B4D6' }
];

function getColor(d) {
  return colors[d].hex;
}

function style(feature) {
  return {
    fillColor: getColor(feature.properties.program_count),
    weight: 1,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7
  };
}

// Feature interaction.
function resetHighlight() {
  if ( highlight ) {
    programs.resetStyle(highlight);
  }
}
function highlightFeature(e) {
  resetHighlight();
  var layer = e.target;
  layer.setStyle({
    weight: 2,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  });
  if (!L.Browser.ie && !L.Browser.opera) {
    layer.bringToFront();
  }
  highlight = e.target;
}

// Display feature info.
function buildInfo(props) {
  var programInfo = '';
  if ( props && props.hasOwnProperty('CNTRY_TERR') && props.hasOwnProperty('Extra_Info') ) {
    programInfo = '<h4>WHO Programs:  ' + props.CNTRY_TERR + '</h4>';
    programInfo += '<b>' + props.Extra_Info+ '</b><br>';
  } else {
    programInfo = '<h4>WHO Programs:</h4>Hover over a country.';
  }
  return programInfo;
}
function onEachFeature(feature, layer) {
  layer.on({
    click: highlightFeature
  });
  layer.bindPopup(buildInfo(feature.properties));
}

// Legend
var legend = L.control({ position: 'bottomright' });
legend.onAdd = function() {
  var div = L.DomUtil.create('div', 'info legend');
  div.innerHTML += "Count<br>";
  var counts = [1, 2, 3, 4, 5];
  for (var i = 0; i < counts.length; i++) {
    div.innerHTML += '<i style="background:' + getColor(counts[i]) + '"></i> ' + counts[i] + '<br>';
  }
  return div;
};
legend.addTo(map);

// https://gist.github.com/rclark/5779673/
L.TopoJSON = L.GeoJSON.extend({
  addData: function(jsonData) {    
    if (jsonData.type === "Topology") {
      for (var key in jsonData.objects) {
        var geojson = topojson.feature(jsonData, jsonData.objects[key]);
        L.GeoJSON.prototype.addData.call(this, geojson);
      }
    } else {
      L.GeoJSON.prototype.addData.call(this, jsonData);
    }
  }  
});

function showPrograms(json) {
  json.objects.Export_Output.geometries.forEach(function(f) {
    f.properties.program_count = f.properties.Extra_Info.split('<br>').filter(function(d) { return d; }).length;
    console.log('program count', f.properties.program_count);
  });
  programs = new L.TopoJSON(json, {
    onEachFeature: onEachFeature, 
    style: style
  }).addTo(map);
  console.log('programs', programs);
}

// Get country data, add it to the map.
fetch('data/who_programs.topojson')
  .then(function(response) {
    return response.json();
  }).then(function(json) {
    console.log('parsed json', json);
    showPrograms(json);
  }).catch(function(ex) {
    console.log('parsing failed', ex);
  });
