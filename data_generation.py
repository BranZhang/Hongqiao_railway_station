import json
import re
from functools import reduce
from multiprocessing import Pool
from multiprocessing.dummy import Pool as ThreadPool
from collections import Counter

import requests

STATION_NAME = "上海虹桥"
START_TRAIN_INFO_URL = "https://g.xiuxiu365.cn/train_api/screen/msg/startTrainInfo2?station="
END_TRAIN_INFO_URL = "https://g.xiuxiu365.cn/train_api/screen/msg/endTrainInfo2?station="
TRAIN_INFO_URL = "https://g.xiuxiu365.cn/train_api/api/station/info?trainname="


def string2time(timeString, minChange=0):
    hourStr,minStr = timeString.split(":")
    hour = int(hourStr)
    min = int(minStr) + minChange
    if min < 0:
        hour -= 1
        min += 60
    if min >= 60:
        hour += 1
        min -= 60
    return [hour, min]


def stationString2Number(stationString):
    match = re.search(r"\d+", stationString)
    if match:
        return int(match.group())
    else:
        return -1


def get_train_info_by_name(name):
    results = []
    r = requests.get(url=TRAIN_INFO_URL+name)
    if r.status_code != 200:
        return []
    
    result_json = json.loads(r.text)

    # first: 从虹桥站始发的车次
    # last: 以虹桥站为终点的车次
    # pass_in: 路过虹桥站，即将驶入的车次
    # pass_out: 路过虹桥站，即将驶出的车次
    for i in range(len(result_json['stationList'])):
        if result_json['stationList'][i]['station'] != STATION_NAME:
            continue
        if i == 0:
            results.append({
                "name": name,
                "route_type": "first",
                "current_station": result_json['stationList'][i]['station'],
                "next_station": result_json['stationList'][i+1]['station'],
                "arrive_hongqiao_time": string2time(result_json['stationList'][i+1]['dTime'],-3),
                "departure_hongqiao_time": string2time(result_json['stationList'][i+1]['dTime']),
                "arrive_hongqiao_station_number": stationString2Number(result_json['stationList'][i+1]['exitStation']),
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
                "arrive_hongqiao_time": string2time(result_json['stationList'][i]['aTime']),
                "departure_hongqiao_time": string2time(result_json['stationList'][i]['aTime'],3),
                "arrive_hongqiao_station_number": stationString2Number(result_json['stationList'][i]['exitStation']),
                "park_hongqiao_time": "",
                "route_start_station": result_json['trainInfo']['startstation'],
                "route_end_station": result_json['trainInfo']['endstation'],
                "train_type": result_json['trainInfo']['traintype'],
            })
        else:
            results.append({
                "name": name,
                "route_type": "pass_out",
                "current_station": result_json['stationList'][i]['station'],
                "next_station": result_json['stationList'][i+1]['station'],
                "arrive_hongqiao_time": string2time(result_json['stationList'][i]['aTime']),
                "departure_hongqiao_time": string2time(result_json['stationList'][i]['dTime']),
                "arrive_hongqiao_station_number": stationString2Number(result_json['stationList'][i]['exitStation']),
                "route_start_station": result_json['trainInfo']['startstation'],
                "route_end_station": result_json['trainInfo']['endstation'],
                "train_type": result_json['trainInfo']['traintype'],
            })
            results.append({
                "name": name,
                "route_type": "pass_in",
                "current_station": result_json['stationList'][i-1]['station'],
                "next_station": result_json['stationList'][i]['station'],
                "arrive_hongqiao_time": string2time(result_json['stationList'][i]['aTime']),
                "departure_hongqiao_time": string2time(result_json['stationList'][i]['dTime']),
                "arrive_hongqiao_station_number": stationString2Number(result_json['stationList'][i+1]['exitStation']),
                "route_start_station": result_json['trainInfo']['startstation'],
                "route_end_station": result_json['trainInfo']['endstation'],
                "train_type": result_json['trainInfo']['traintype'],
            })
    return results


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

    pool = ThreadPool(4)
    results = pool.map(get_train_info_by_name, list(trains))

    if len(results) < 0:
        return []
    trains_detail = reduce(lambda x,y:x+y, results)
    trains_detail.sort(key = lambda t:t['arrive_hongqiao_time'])
    return trains_detail


def build_rail_data(file_name):
    railway_path = {}


def save2local():
    pass


if __name__ == "__main__":
    trains = get_all_trains_info()
    trains = list(filter(lambda i:i['arrive_hongqiao_station_number']!=-1, trains))
    # '上海':1
    # '安亭北':1
    # '常州北':1
    # '*****':1
    # '上海南':4
    # '上海西':1
    # '南京南':6
    # '嘉兴南':51
    # '嘉善南':13
    # '无锡东':7
    # '昆山南':45
    # '杭州东':9
    # '松江南':13
    # '桐乡':2
    # '苏州':5
    # '苏州北':32
    # '金山北':7
    # '阳澄湖':1

    for t in filter(lambda i:i['arrive_hongqiao_station_number']!=-1, trains):
        print(
            t['arrive_hongqiao_station_number'], "\t", 
            t['next_station'] if t['route_type'] in ['pass_in', 'first'] else t['current_station'], "\t\t", 
            t['arrive_hongqiao_time'])
