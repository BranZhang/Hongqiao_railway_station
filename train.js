class Train {

    constructor(raw_data) {
        this.raw_data = raw_data;
        this.name = raw_data['name'];
        this.path_code = raw_data['path_code'];
        this.route_type = raw_data['route_type'];
        this.station_number = raw_data['arrive_hongqiao_station_number'];
        this.train_type = raw_data['train_type'];
    }

    isLegal() {
        if (!(this.path_code in Train.railway_path_data)) {
            return false;
        }

        if (!(this.station_number in Train.railway_path_data[this.path_code]["station"])) {
            return false;
        }

        return true;
    }

    showName(time) {
        
        return [];
    }
 
    static load_railway_data(data) {
        Train.railway_data = {};
        Train.station_data = {};
        
        for(var f in data['features']) {
            Train.railway_data[f["properties"]["id"]] = f;
            if ("station_number" in f["properties"]["detail"]) {
                Train.station_data[f["properties"]["detail"]["station_number"]] = f["properties"]["id"];
            }
        }
        Train.railway_data = data;
    }

    static load_railway_path_data(data) {
        Train.railway_path_data = data;
    }
}