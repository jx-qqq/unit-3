//wrap everything in a self-executing anonymous function to move to local scope

//pseudo-global variables
//list of attributes
var attrArray = ["Corn(1000Bushels)", "Wheat(1000Bushels)", "Oat(1000Bushels)", "Soybean(1000Bushels)", "Barley(1000Bushels)", "Cotton(1000Bales)"];
var expressed = attrArray[0]; //initial attribute
//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //MAP, PROJECTION, PATH, AND QUEUE BLOCKS FROM MODULE 8
    //create new svg container for the map
    //map frame dimensions
    var width = 960,
        height = 500;
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    //create Albers equal area conic projection centered on US
    var projection =  d3.geoAlbers()
        .scale(1050)
        .translate([480, 250]);
    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/USCropDataCSV.csv")); //load attributes from csv
    promises.push(d3.json("data/US_continent_4326.topojson")); //load spatial data
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        usPolygon = data[1];
        //place graticule on the map
        setGraticule(map, path);
        //translate TopoJSON file
        var us = topojson.feature(usPolygon, usPolygon.objects.US_continent_4326).features;
        //join csv data to GeoJSON enumeration units
        us = joinData(us, csvData);
        //add enumeration units to the map
        setEnumerationUnits(us, map, path);

        //add US states to map
        var states = map.selectAll(".states")
            .data(us)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.NAME;
            })
            .attr("d", path);
    };

}; //end of setMap()


function setGraticule(map, path){
    //GRATICULE BLOCKS FROM MODULE 8
    //create graticule generator
    var graticule = d3.geoGraticule()
        .step([10, 10]); //place graticule lines every 10 degrees of longitude and latitude
    //create graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path); //project geoGraticule
    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
};


function joinData(us, csvData){
    //DATA JOIN LOOPS
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.States; //the CSV primary key
        //loop through geojson regions to find correct region
        for (var a=0; a<us.length; a++){
            var geojsonProps = us[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.NAME; //the geojson primary key
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
         };
    };
    return us;
};


function setEnumerationUnits(us, map, path){
    //...REGIONS BLOCK FROM MODULE 8
};
