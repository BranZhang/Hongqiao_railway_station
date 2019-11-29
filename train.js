class Train {

    constructor(raw_data) {
        this.raw_data = raw_data;
        this.name = raw_data['name'];
        this.path_code = raw_data['path_code'];
        this.route_type = raw_data['route_type'];
        this.station_number = raw_data['arrive_hongqiao_station_number'];
        this.train_type = raw_data['train_type'];
        this.train_count = 16;

        this.legal = this.isLegal();
    }

    isLegal() {
        if (!(this.path_code in Train.railway_path_data)) {
            return false;
        }

        if (!(this.station_number in Train.railway_path_data[this.path_code])) {
            return false;
        }

        this.route_path_ids = Train.railway_path_data[this.path_code][this.station_number];
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
        // 单量车厢长度为223.45米
        Train.single_length = 223.45;

        Train.railway_data = {};
        Train.station_data = {};
        data['features'].forEach(f => {
            Train.railway_data[f["properties"]["id"]] = f;
            if ("station_number" in f["properties"]["detail"]) {
                Train.station_data[f["properties"]["detail"]["station_number"]] = f["properties"]["id"];
            }
        });
    }

    static load_railway_path_data(data) {
        Train.railway_path_data = {};
        for (var i in data) {
            Train.railway_path_data[i] = {};

            for (var j=0; j<data[i]["station"].length; j++) {

                var t = data[i]["station"][j];
                var ids = [];
                Train._concat_list(ids, data[i]["preffix"]);
                Train._concat_list(ids, t["route"]);

                var coordinates = [];

                if (ids.length < 2) {
                    continue;
                }

                var second_last_index = Train.railway_data[ids[1]]["geometry"]["coordinates"].length - 1;

                if (Train._coord_same(Train.railway_data[ids[0]]["geometry"]["coordinates"][0],Train.railway_data[ids[1]]["geometry"]["coordinates"][0])
                 || Train._coord_same(Train.railway_data[ids[0]]["geometry"]["coordinates"][0],Train.railway_data[ids[1]]["geometry"]["coordinates"][second_last_index])) {
                    Train._concat_list(coordinates, Train.railway_data[ids[0]]["geometry"]["coordinates"], true);
                }
                else {
                    Train._concat_list(coordinates, Train.railway_data[ids[0]]["geometry"]["coordinates"]);
                }

                for (var k=1; k<ids.length; k++) {
                    var total_last_index = coordinates.length - 1;
                    var current_last_index = Train.railway_data[ids[k]]["geometry"]["coordinates"].length - 1;

                    if (Train._coord_same(coordinates[total_last_index],Train.railway_data[ids[k]]["geometry"]["coordinates"][0])
                    || Train._coord_same(coordinates[total_last_index],Train.railway_data[ids[k]]["geometry"]["coordinates"][current_last_index])) {
                       Train._concat_list(coordinates, Train.railway_data[ids[k]]["geometry"]["coordinates"], true);
                   }
                   else {
                       Train._concat_list(coordinates, Train.railway_data[ids[k]]["geometry"]["coordinates"]);
                   }
                }

                Train.railway_path_data[i][t["number"]] = coordinates;
            }
        }
    }

    static _coord_same(coord1, coord2) {
        return (coord1[0] == coord2[0]) && (coord1[1] == coord2[1]);
    }

    static _concat_list(list1, list2, reverse=false) {
        if (reverse) {
            for (var i=0; i<list2.length; i++) {
                list1.push(list2[i]);
            }
        }
        else {
            for (var i=list2.length-1; i>=0; i--) {
                list1.push(list2[i]);
            }
        }
    }
}