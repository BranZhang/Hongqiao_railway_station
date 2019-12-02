class Train {
    
    constructor(raw_data) {
        this.raw_data = raw_data;
        this.name = raw_data['name'];
        this.path_code = raw_data['path_code'];
        this.route_type = raw_data['route_type'];
        this.station_number = raw_data['arrive_hongqiao_station_number'];
        this.train_type = raw_data['train_type'];
        this.arrive_hongqiao_time = new Date(2019, 0, 1, raw_data['arrive_hongqiao_time'][0], raw_data['arrive_hongqiao_time'][1], 0);
        this.departure_hongqiao_time = new Date(2019, 0, 1, raw_data['departure_hongqiao_time'][0], raw_data['departure_hongqiao_time'][1], 0);
        this.train_count = 16;

        //默认在可视范围内列车都保持加速度不变
        //默认加速度为1m/s2
        this.accelerate = 1;

        this.legal = this.isLegal();
    }

    isLegal() {
        if (!(this.path_code in Train.railway_path_data)) {
            return false;
        }

        if (!(this.station_number in Train.railway_path_data[this.path_code])) {
            return false;
        }

        this.route_path_coords = Train.railway_path_data[this.path_code][this.station_number];
        return true;
    }

    getRealTimeLocation(time) {
        var passed_distance = 0;
        var train_index = this.train_count+1;
        var result_coords = [];
        var results = [];

        if (this.route_type === 'pass_in' || this.route_type === 'first') {
            // 从虹桥出发的列车
            if (this.arrive_hongqiao_time > time) {
                //列车还没进站
                return [];
            }
            else if (this.departure_hongqiao_time > time) {
                //列车在站台上，还没出发
                passed_distance = 0;
            }
            else {
                //单位：米
                passed_distance = (time-this.departure_hongqiao_time)/1000 * (time-this.departure_hongqiao_time)/1000*this.accelerate / 2;
            }

            if (passed_distance > Train.visible_length) {
                return [];
            }

            for(var i=this.route_path_coords.length-1; i > 0; i--) {
                var coord1 = this.route_path_coords[i];
                var coord2 = this.route_path_coords[i-1];
                var tmp_distance = Train.calDistanceInM(coord1[0], coord1[1], coord2[0], coord2[1]);
                if(tmp_distance < passed_distance) {
                    passed_distance -= tmp_distance;
                }
                else {
                    result_coords.push(Train.getLocationByDistance(coord1, coord2, passed_distance/tmp_distance));
                    if (train_index > 0) {
                        train_index -= 1;
                        passed_distance += Train.single_length;
                        i += 1;
                    }
                }

                if (train_index == 0) {
                    break;
                }
            }

            for (var k=0; k<result_coords.length-1; k++) {
                var coord1 = result_coords[k];
                var coord2 = result_coords[k+1];
                var center = [(coord1[0]+coord2[0])/2, (coord1[1]+coord2[1])/2];
                var angle = Train.calAngle(coord1[0], coord1[1], coord2[0], coord2[1]);
                
                results.push(Train.buildGeoJSON(center, k, this.train_type, angle));
            }
        }
        else {
            passed_distance = 0;
            //进入虹桥的列车
            if (this.departure_hongqiao_time < time) {
                //列车已经离开虹桥
                return [];
            }
            else if (this.arrive_hongqiao_time < time) {
                //列车进站了，停在了站台上
            }
            else {
                
            }

            // todo
            return [];
        }

        return results;
    }
 
    static load_railway_data(data) {
        console.log("start.");

        //在进站或者出站的5000米内可间，且保持加速度不变
        Train.visible_length = 5000;

        // 单量车厢长度为223.45米
        Train.single_length = 22.345;

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
                    Train._concat_list(coordinates, Train.railway_data[ids[0]]["geometry"]["coordinates"], true, false);
                }
                else {
                    Train._concat_list(coordinates, Train.railway_data[ids[0]]["geometry"]["coordinates"], false, false);
                }

                for (var k=1; k<ids.length; k++) {
                    var total_last_index = coordinates.length - 1;

                    if (Train._coord_same(coordinates[total_last_index],Train.railway_data[ids[k]]["geometry"]["coordinates"][0])) {
                       Train._concat_list(coordinates, Train.railway_data[ids[k]]["geometry"]["coordinates"], false, true);
                    }
                    else {
                        Train._concat_list(coordinates, Train.railway_data[ids[k]]["geometry"]["coordinates"], true, true);
                    }
                    // if (Train._coord_same(coordinates[total_last_index],Train.railway_data[ids[k]]["geometry"]["coordinates"][0])
                    // || Train._coord_same(coordinates[total_last_index],Train.railway_data[ids[k]]["geometry"]["coordinates"][current_last_index])) {
                    //    Train._concat_list(coordinates, Train.railway_data[ids[k]]["geometry"]["coordinates"], true);
                    // }
                    // else {
                    //     Train._concat_list(coordinates, Train.railway_data[ids[k]]["geometry"]["coordinates"]);
                    // }
                }

                Train.railway_path_data[i][t["number"]] = coordinates;
            }
        }
    }

    static _coord_same(coord1, coord2) {
        return Math.abs(coord1[0]-coord2[0]<0.0000000000001) && Math.abs(coord1[1]-coord2[1]<0.0000000000001);
    }

    static _concat_list(list1, list2, reverse, removeFirst) {
        if (reverse) {
            var i = list2.length-1;
            if (removeFirst) {
                i -= 1;
            }
            for (; i>=0; i--) {
                list1.push(list2[i]);
            }
        }
        else {
            var i = 0;
            if (removeFirst) {
                i += 1;
            }
            for (; i<list2.length; i++) {
                list1.push(list2[i]);
            }
        }
    }

    // 以正东方向为0度
    static calAngle(lon1, lat1, lon2, lat2) {
        if (lat1 == lat2) {
            if (lon2 > lon1) {
                return 90 + 90;
            }
            else {
                return 270 + 90;
            }
        }

        var angle = Math.atan(Math.abs((lon2-lon1)/(lat2-lat1))) * 180 / Math.PI
        if (lon2 > lon1) {
            if (lat2 > lat1) {
                return angle + 90;
            }
            else {
                return 180 - angle + 90;
            }
        }
        else {
            if (lat2 > lat1) {
                return 360 - angle + 90;
            }
            else {
                return 180 + angle + 90;
            }
        }
    }

    static calDistanceInM(lon1, lat1, lon2, lat2) {
        var R = 6371; // Radius of the earth in km
        var dLat = Train.deg2rad(lat2-lat1);  // deg2rad below
        var dLon = Train.deg2rad(lon2-lon1); 
        var a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(Train.deg2rad(lat1)) * Math.cos(Train.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c * 1000; // Distance in m
        return d;
    }
    
    static deg2rad(deg) {
      return deg * (Math.PI/180)
    }

    static getLocationByDistance(startcoord, endcoord, d) {
        // todo
        return [startcoord[0]+d*(endcoord[0]-startcoord[0]), startcoord[1]+d*(endcoord[1]-startcoord[1])];
    }

    static buildGeoJSON(coord, train_index, train_type, angle) {
        var singe_type = "body";

        if (train_type == "动车组" && (train_index==0 || train_index==8)) {
            singe_type = "normal_head";
        }
        else if (train_type == "动车组" && (train_index==7 || train_index==15)) {
            singe_type = "normal_tail";
        }
        else if (train_type == "高速铁路" && (train_index==0 || train_index==8)) {
            singe_type = "high_head";
        }
        else if (train_type == "高速铁路" && (train_index==7 || train_index==15)) {
            singe_type = "high_tail";
        }

        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coord
            },
            "properties": {
                "train_type": singe_type,
                "icon_rotate": angle
            }
        };
    }
}