# ☁️ 云服务器安全组配置指南

## 🔥 问题现象
- 服务器本地可以访问 `curl http://localhost:80`
- 外部无法访问服务器的80端口
- 防火墙已关闭或已开放端口

## 📋 解决方案

### 阿里云 ECS
1. **登录控制台**
   - 访问 https://ecs.console.aliyun.com/
   - 找到你的ECS实例

2. **配置安全组**
   ```
   实例详情页 -> 安全组 -> 配置规则 -> 入方向 -> 手动添加
   
   端口范围: 80/80
   协议类型: TCP
   授权对象: 0.0.0.0/0 (或指定IP)
   描述: HTTP访问
   ```

3. **保存并应用**

### 腾讯云 CVM
1. **登录控制台**
   - 访问 https://console.cloud.tencent.com/cvm/

2. **配置安全组**
   ```
   实例详情页 -> 安全组 -> 修改规则 -> 入站规则 -> 添加规则
   
   类型: HTTP(80)
   来源: 0.0.0.0/0
   协议端口: TCP:80
   策略: 允许
   ```

### 华为云 ECS
1. **登录控制台**
   - 访问 https://console.huaweicloud.com/ecs/

2. **配置安全组**
   ```
   实例详情页 -> 安全组 -> 配置规则 -> 入方向 -> 添加规则
   
   协议: TCP
   端口: 80
   源地址: 0.0.0.0/0
   操作: 允许
   ```

### AWS EC2
1. **登录控制台**
   - 访问 https://console.aws.amazon.com/ec2/

2. **配置安全组**
   ```
   Instances -> 选择实例 -> Security -> Security groups -> Edit inbound rules
   
   Type: HTTP
   Protocol: TCP
   Port: 80
   Source: 0.0.0.0/0
   ```

### Azure VM
1. **登录控制台**
   - 访问 https://portal.azure.com/

2. **配置网络安全组**
   ```
   VM -> Networking -> Add inbound port rule
   
   Destination port ranges: 80
   Protocol: TCP
   Source: Any
   Action: Allow
   ```

## 🧪 验证配置

### 在服务器上执行：
```bash
# 检查本地访问
curl -I http://localhost:80

# 检查公网IP
ip=$(curl -s ifconfig.me)
echo "公网IP: $ip"

# 从其他机器测试访问
echo "从本地执行: curl -I http://$ip:80"
```

### 从本地电脑测试：
```bash
# 测试HTTP访问
curl -I http://你的服务器公网IP:80

# 测试端口连通性
telnet 你的服务器公网IP 80
# 或
nc -vz 你的服务器公网IP 80
```

## ⚠️ 安全建议

### 端口开放建议：
```
必须开放：
- TCP 22 (SSH) - 用于远程管理
- TCP 80 (HTTP) - 用于Web访问
- TCP 8000 (API) - 用于后端API

可选开放：
- TCP 443 (HTTPS) - 用于HTTPS
- TCP 3000 (开发) - 开发环境
```

### 安全最佳实践：
1. **最小权限原则**：只开放必要的端口
2. **源地址限制**：生产环境建议限制源IP
3. **定期审查**：定期检查安全组规则
4. **使用HTTPS**：生产环境使用443端口

## 🔧 常见问题

### Q: 安全组已配置但仍无法访问？
**A: 检查以下几点：**
- 确认应用是否监听在0.0.0.0而非127.0.0.1
- 确认服务器本地防火墙已关闭或已开放端口
- 确认端口映射正确 (docker-compose中的ports配置)

### Q: 如何确认是安全组问题？
**A: 测试方法：**
```bash
# 服务器本地测试（应该成功）
curl -I http://localhost:80

# 从其他服务器测试（如果失败，可能是安全组问题）
curl -I http://你的公网IP:80
```

### Q: 安全组规则已保存但不生效？
**A: 尝试：**
- 重启云服务器实例
- 检查是否有其他安全组冲突
- 确认规则方向正确（入方向 vs 出方向）

## 📞 紧急联系方式

如果问题仍未解决：
1. **查看云服务商文档**
2. **联系云服务商技术支持**
3. **临时解决方案**：使用8000端口访问