"""
应用配置模块
从环境变量读取配置
"""
import os
from pathlib import Path
from typing import Optional

# 数据文件配置
DATA_DIR = os.getenv("DATA_DIR", "./data")
NETWORK_FILE = os.getenv("NETWORK_FILE", "network.csv")
SHIPMENT_FILE = os.getenv("SHIPMENT_FILE", "shipment.csv")
ROUTE_FILE = os.getenv("ROUTE_FILE", "route.csv")
MATCHING_FILE = os.getenv("MATCHING_FILE", "stable_matching.csv")
COOPERATION_FILE = os.getenv("COOPERATION_FILE", "cooperation_parameter.csv")

# 服务器配置
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# 数据文件路径
DATA_PATH = Path(DATA_DIR)
NETWORK_PATH = DATA_PATH / NETWORK_FILE
SHIPMENT_PATH = DATA_PATH / SHIPMENT_FILE
ROUTE_PATH = DATA_PATH / ROUTE_FILE
MATCHING_PATH = DATA_PATH / MATCHING_FILE
COOPERATION_PATH = DATA_PATH / COOPERATION_FILE

def get_data_dir() -> str:
    """获取数据目录路径"""
    return DATA_DIR

def get_network_file() -> str:
    """获取网络文件名"""
    return NETWORK_FILE

def get_shipment_file() -> str:
    """获取货物文件名"""
    return SHIPMENT_FILE

def get_route_file() -> str:
    """获取路线文件名"""
    return ROUTE_FILE

def get_matching_file() -> str:
    """获取匹配结果文件名"""
    return MATCHING_FILE

def get_cooperation_file() -> str:
    """获取合作参数文件名"""
    return COOPERATION_FILE