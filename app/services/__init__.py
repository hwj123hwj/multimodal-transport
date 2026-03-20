"""
服务层单例
确保整个应用共享同一份 DataLoader / DataService / MatchingService 实例，
避免各路由模块各自持有独立缓存导致重复IO。
"""
from ..config import get_data_dir
from .data_loader import DataLoader
from .data_service import DataService
from .matching_service import MatchingService

data_loader = DataLoader(get_data_dir())
data_service = DataService(data_loader)
matching_service = MatchingService(data_loader)
