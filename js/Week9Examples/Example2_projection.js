//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on US
    var projection = d3.geoAlbers()
        .center([5.5, 40])
        .rotate([106.45, 4.5, 0])
        .parallels([29.5, 45.5])
        .scale(790)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/USCropDataCSV.csv")); //load attributes from csv
    promises.push(d3.json("data/US_continent_4326.topojson")); //load spatial data
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        us = data[1];
        //translate TopoJSON file
        var usPolygon = topojson.feature(us, us.objects.US_continent_4326);

        //add background to map
        var countries = map.append("path")
            .datum(usPolygon)
            .attr("class", "countries")
            .attr("d", path);
        console.log(countries);

        //add US states to map
        var states = map.selectAll(".states")
            .data(usPolygon)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.NAME;
            })
            .attr("d", path);
        console.log(states);

    };
};
