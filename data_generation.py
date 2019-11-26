from multiprocessing import Pool
from multiprocessing.dummy import Pool as ThreadPool
from functools import reduce

import requests
import json

STATION_NAME = "上海虹桥"
START_TRAIN_INFO_URL = "https://g.xiuxiu365.cn/train_api/screen/msg/startTrainInfo2?station="
END_TRAIN_INFO_URL = "https://g.xiuxiu365.cn/train_api/screen/msg/endTrainInfo2?station="
TRAIN_INFO_URL = "https://g.xiuxiu365.cn/train_api/api/station/info?trainname="


def get_train_info_by_name(name):
    results = []
    r = requests.get(url=TRAIN_INFO_URL+name)
    if r.status_code != 200:
        return []
    
    result_json = json.loads(r.text)

    for i in range(len(result_json['stationList'])):
        if result_json['stationList'][i]['station'] != STATION_NAME:
            continue
        if i == 0:
            results.append({
                "name": name,
                "route_type": "first",
                "current_station": result_json['stationList'][i]['station'],
                "next_station": result_json['stationList'][i+1]['station'],
                "reach_hongqiao_time": result_json['stationList'][i+1]['dTime']-3,
                "leave_hongqiao_time": result_json['stationList'][i+1]['dTime'],
                "reach_hongqiao_station_number": result_json['stationList'][i+1]['exitStation'],
                "route_start_station": result_json['trainInfo']['startstation'],
                "route_end_station": result_json['trainInfo']['endstation'],
                "train_type": result_json['trainInfo']['traintype'],
            })
        elif i == len(result_json['stationList'])-1:
            results.append({
                "name": name,
                "route_type": "last",
                "current_station": result_json['stationList'][i-1]['station'],
                "next_station": result_json['stationList'][i]['station'],
                "reach_hongqiao_time": result_json['stationList'][i]['aTime'],
                "leave_hongqiao_time": result_json['stationList'][i]['aTime']+3,
                "reach_hongqiao_station_number": result_json['stationList'][i]['exitStation'],
                "park_hongqiao_time": "",
                "route_start_station": result_json['trainInfo']['startstation'],
                "route_end_station": result_json['trainInfo']['endstation'],
                "train_type": result_json['trainInfo']['traintype'],
            })
        else:
            results.append({
                "name": name,
                "route_type": "pass_in",
                "current_station": result_json['stationList'][i]['station'],
                "next_station": result_json['stationList'][i+1]['station'],
                "reach_hongqiao_time": result_json['stationList'][i]['aTime'],
                "leave_hongqiao_time": result_json['stationList'][i]['dTime'],
                "reach_hongqiao_station_number": result_json['stationList'][i]['exitStation'],
                "route_start_station": result_json['trainInfo']['startstation'],
                "route_end_station": result_json['trainInfo']['endstation'],
                "train_type": result_json['trainInfo']['traintype'],
            })
            results.append({
                "name": name,
                "route_type": "pass_out",
                "current_station": result_json['stationList'][i-1]['station'],
                "next_station": result_json['stationList'][i]['station'],
                "reach_hongqiao_time": result_json['stationList'][i]['aTime'],
                "leave_hongqiao_time": result_json['stationList'][i]['dTime'],
                "reach_hongqiao_station_number": result_json['stationList'][i+1]['exitStation'],
                "route_start_station": result_json['trainInfo']['startstation'],
                "route_end_station": result_json['trainInfo']['endstation'],
                "train_type": result_json['trainInfo']['traintype'],
            })
    return []


def get_all_trains_info():
    # 到达指定火车站的车次，从指定火车站出发和到达指定火车站的车次可能会有重复
    trains = set()

    # 获取从指定火车站出发的列车
    r = requests.get(url=START_TRAIN_INFO_URL+STATION_NAME)
    if r.status_code == 200:
        result_json = json.loads(r.text)

        if result_json['code'] == 200:
            for train_data in result_json['data']:
                trains.add(train_data['trainname'])

    # 获取到达指定火车站的列车
    r = requests.get(url=END_TRAIN_INFO_URL+STATION_NAME)
    if r.status_code == 200:
        result_json = json.loads(r.text)

        if result_json['code'] == 200:
            for train_data in result_json['data']:
                trains.add(train_data['trainname'])

    pool = ThreadPool(1)
    results = pool.map(get_train_info_by_name, list(trains))

    return reduce(lambda x,y:x+y, results)


def build_rail_data():
    pass


def save2local():
    pass


if __name__ == "__main__":
    get_all_trains_info()

