class Train {

    constructor(raw_data) {
        this.raw_data = raw_data;
        this.name = raw_data['name'];
        this.path_code = raw_data['path_code'];
        this.route_type = raw_data['route_type'];
        this.station_number = raw_data['arrive_hongqiao_station_number'];
        this.train_type = raw_data['train_type'];
        this.train_count = 16;
    }

    isLegal() {
        if (!(this.path_code in Train.railway_path_data)) {
            return false;
        }

        if (!(this.station_number in Train.railway_path_data[this.path_code])) {
            return false;
        }

        return true;
    }

    getRealTimeLocation(time) {
        
        return [{
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [121.315625, 31.196169]
            },
            "properties": {
                "train_type": "high_head",
                "icon_rotate": 0
            }
        }];
    }
 
    static load_railway_data(data) {
        Train.railway_data = {};
        Train.station_data = {};
        data['features'].forEach(f => {
            Train.railway_data[f["properties"]["id"]] = f;
            if ("station_number" in f["properties"]["detail"]) {
                Train.station_data[f["properties"]["detail"]["station_number"]] = f["properties"]["id"];
            }
        });

        Train.railway_data = data;
    }

    static load_railway_path_data(data) {
        Train.railway_path_data = {};
        for (var i in data) {
            Train.railway_path_data[i] = {}
            data[i]["station"].forEach(t => {Train.railway_path_data[i][t["number"]] = data[i]["preffix"]+t["route"]})
        }
    }
}