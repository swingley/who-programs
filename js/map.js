var programs, programLookup = {}, highlight;

var config = {
  features: 'https://extranet.who.int/arcgis/rest/services/GIS/PAU_Programme_Activity_201510/MapServer/0',
  name: 'detailed_2011.CNTRY_TERR',
  programAll: '_v_PAU_Programme_Activity_2.Extra_Information',
  programCount: '_v_PAU_Programme_Activity_2.Programme_Count',
  // programMatcher is a regular expression to match things like:
  // _v_PAU_Programme_Activity_2.Programme_3_Description
  //  not:
  // _v_PAU_Programme_Activity_2.Programme_3_ShortDescription
  // _v_PAU_Programme_Activity_2.Programme_3_Activity
  programMatcher: /Programme\_\d\_Description/
};

var map = L.map('map').setView([30, 0], 2);
L.esri.basemapLayer("Gray", { hideLogo: true }).addTo(map);

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
    fillColor: getColor(feature.properties[config.programCount]),
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
    color: '#fff',
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
  if ( props && props.hasOwnProperty(config.name) && props.hasOwnProperty(config.programAll) ) {
    programInfo = '<h4>WHO Programs:  ' + props[config.name] + '</h4>';
    programInfo += props[config.programAll];
  } else {
    programInfo = '<h4>WHO Programs:</h4>Click a country.';
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
function createLegend(info) {
  var legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML = '<div class="heading">Program Count by Country</div>';
    var counts = [1, 2, 3, 4, 5];
    // Create swatches.
    for (var i = 0; i < counts.length; i++) {
      div.innerHTML += '<i style="background:' + getColor(counts[i]) + '"></i>';
    }
    // Add swatch labels.
    var labels = L.DomUtil.create('div', 'swatch-labels', div);
    for (var j = 0; j < counts.length; j++) {
      labels.innerHTML += '<span>' + (j+1) + '</span>';
    }
    // Add programs
    var filters = L.DomUtil.create('div', 'filters', div);
    filters.innerHTML = '<div class="heading">Show Countries with:</div>';
    for ( var k = 0; k < info.length; k++ ) {
      filters.innerHTML += '<div class="program">' +
        '<input type="checkbox" checked="checked" id="program' + k + 
        '"><label class="program" for="program' + k + '">' + info[k] + '</label></div';
    }
    filters.addEventListener('click', function(e) {
      if ( e.target.id ) {
        programs.getLayers().forEach(function(l) {
          var clicked = programLookup[e.target.id];
          if ( l.feature.properties[config.programAll].indexOf(clicked) === -1 ) {
            if ( l._map ) {
              map.removeLayer(l);
            } else {
              map.addLayer(l);
            }
          }
        });
      }
    }, false);
    return div;
  };
  legend.addTo(map);
}

function showPrograms(json) {
  var programsList = [];
  json.features.forEach(function(f) {
    for ( var p in f.properties ) {
      if ( config.programMatcher.test(p) ) {
        var gram = f.properties[p];
        if ( gram && gram.indexOf('Adviser') === -1 && programsList.indexOf(gram) === -1 ) {
          programsList.push(gram);
        }
      }
    }
    console.log('\nprogramsList', programsList);
  });
  console.log('programsList', programsList);
  createLegend(programsList);
}

// Get country data, add it to the map.
L.esri.Tasks.query({
  url: config.features
}).where("1=1").precision(6).run(function(error, countries) {
  console.log('got stuff', countries);
  showPrograms(countries);
  programs = L.geoJson(countries, {
    onEachFeature: onEachFeature, 
    style: style
  }).addTo(map);
});
