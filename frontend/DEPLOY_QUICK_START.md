# 🚀 Nginx部署快速指南

## 当前状态
✅ nginx已经在运行 (PID: 3268, 14292, 36436, 21116)

## 快速部署步骤

### 1. 构建前端项目
```bash
cd D:\develop\expe_backend\frontend
npm run build
```

### 2. 复制文件到nginx
```bash
# 创建目录
mkdir D:\develop\deploy\nginx-1.28.0\html\expe-frontend

# 复制构建文件
xcopy /E /Y D:\develop\expe_backend\frontend\build\* D:\develop\deploy\nginx-1.28.0\html\expe-frontend\
```

### 3. 重新加载nginx配置
```bash
cd D:\develop\deploy\nginx-1.28.0
nginx.exe -s reload
```

## 📝 一键部署
直接运行快速部署脚本：
```bash
cd D:\develop\expe_backend\frontend
quick-deploy.bat
```

## 🔍 验证部署
- 前端访问: http://localhost
- API测试: http://localhost/api/ (需要先启动后端服务)

## 🔧 常用命令
```bash
# 检查配置
nginx.exe -t

# 重新加载配置
nginx.exe -s reload

# 停止nginx
nginx.exe -s stop

# 查看进程
tasklist /FI "IMAGENAME eq nginx.exe"
```

## 📁 文件结构
```
D:\develop\expe_backend\frontend\
├── nginx.conf              # 原始nginx配置
├── nginx-simple.conf       # 简化版配置
├── nginx-complete.conf     # 完整版配置
├── deploy-nginx.bat        # 完整部署脚本
├── quick-deploy.bat        # 快速部署脚本
└── NGINX_DEPLOY_GUIDE.md   # 详细部署指南
```

## ⚠️ 注意事项
1. 确保后端服务运行在 localhost:8000
2. 如果端口冲突，可以修改nginx配置中的listen端口
3. 前端API请求应该使用相对路径，如 `/api/data` 而不是 `http://localhost:8000/api/data`