# Nginx部署指南 - Windows本地环境

## 快速开始

### 1. 构建前端项目
```bash
cd D:\develop\expe_backend\frontend
npm run build
```

### 2. 复制文件到nginx目录
```bash
# 创建前端目录
mkdir D:\develop\deploy\nginx-1.28.0\html\expe-frontend

# 复制构建文件
xcopy /E /Y D:\develop\expe_backend\frontend\build\* D:\develop\deploy\nginx-1.28.0\html\expe-frontend\
```

### 3. 备份原始配置并应用新配置
```bash
# 备份原始配置
copy D:\develop\deploy\nginx-1.28.0\conf\nginx.conf D:\develop\deploy\nginx-1.28.0\conf\nginx.conf.backup

# 复制新配置
copy D:\develop\expe_backend\frontend\nginx-complete.conf D:\develop\deploy\nginx-1.28.0\conf\nginx.conf
```

### 4. 启动nginx
```bash
cd D:\develop\deploy\nginx-1.28.0
nginx.exe
```

### 5. 验证部署
- 前端访问: http://localhost
- API测试: http://localhost/api/health (需要先启动后端服务)

## 常用命令

```bash
# 检查配置是否正确
nginx.exe -t

# 重新加载配置
nginx.exe -s reload

# 停止nginx
nginx.exe -s stop

# 查看nginx进程
tasklist /FI "IMAGENAME eq nginx.exe"
```

## 故障排除

### 端口被占用
如果80端口被占用，可以：
1. 关闭占用80端口的程序
2. 或者修改nginx.conf中的listen端口，如listen 8080;

### 路径问题
确保所有路径使用正斜杠 `/` 而不是反斜杠 `\`

### 权限问题
确保nginx有权限访问相关目录和文件

## 项目结构
```
D:\develop\deploy\nginx-1.28.0\
├── html\
│   └── expe-frontend\          # 前端文件
│       ├── index.html
│       ├── static\
│       └── ...
├── conf\
│   └── nginx.conf               # 配置文件
└── logs\
    ├── access.log               # 访问日志
    └── error.log                # 错误日志
```