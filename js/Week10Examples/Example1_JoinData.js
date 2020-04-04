
//use Promise.all to parallelize asynchronous data loading
var promises = [];
promises.push(d3.csv("data/USCropDataCSV.csv")); //load attributes from csv
promises.push(d3.json("data/US_continent_4326.topojson")); //load spatial data
Promise.all(promises).then(callback);

function callback(data){
    csvData = data[0];
    usPolygon = data[1];
    //translate TopoJSON file
    var us = topojson.feature(usPolygon, usPolygon.objects.US_continent_4326).features;
    //variables for data join
    var attrArray = ["Corn(1000Bushels)", "Wheat(1000Bushels)", "Oat(1000Bushels)", "Soybean(1000Bushels)", "Barley(1000Bushels)", "Cotton(1000Bales)"];

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
    console.log(us);
}
