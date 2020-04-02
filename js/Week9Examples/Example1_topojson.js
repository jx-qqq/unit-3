//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/USCropDataCSV.csv"),
                    d3.json("data/US_continent_4326.topojson")
                   ];
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        us = data[1];
        console.log(us);
        //translate TopoJSON file
        var usPolygon = topojson.feature(us, us.objects.US_continent_4326);
        console.log(usPolygon);
    };
};
