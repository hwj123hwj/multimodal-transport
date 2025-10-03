# 百度地图API配置说明

## 获取百度地图API密钥

要使用地图功能，您需要获取百度地图API密钥（AK）。请按照以下步骤操作：

### 1. 注册百度账号
- 访问 [百度地图开放平台](http://lbsyun.baidu.com/)
- 注册或登录您的百度账号

### 2. 申请开发者认证
- 进入控制台，完成开发者认证
- 个人开发者可以免费申请

### 3. 创建应用获取AK
1. 进入 [控制台](http://lbsyun.baidu.com/apiconsole)
2. 点击"创建应用"
3. 填写应用信息：
   - 应用名称：运输管理系统
   - 应用类型：浏览器端
   - Referer白名单：`*`（开发环境）或您的具体域名
4. 提交后获取AK（API密钥）

### 4. 配置AK到项目
将获取到的AK替换到以下文件中：

**文件：`public/index.html`**
```html
<!-- 百度地图API - 使用异步加载避免初始化问题 -->
<script type="text/javascript" src="https://api.map.baidu.com/getscript?v=3.0&ak=您的密钥&services=&t=20230615"></script>
```

**文件：`src/config/mapConfig.js`**
```javascript
baiduMap: {
  apiKey: '您的密钥', // 替换为您的实际AK
  version: '3.0',
  url: 'https://api.map.baidu.com/api'
}
```

### 5. 验证地图功能
- 重新启动前端服务：`npm start`
- 访问系统各页面查看地图是否正常显示
- 检查浏览器控制台是否有地图相关错误

## 常见问题

### 地图显示空白
- 检查AK是否正确配置
- 检查网络连接是否正常
- 查看浏览器控制台错误信息

### API配额超限
- 百度地图API有免费调用额度限制
- 可以在百度地图控制台查看用量统计
- 需要更高配额可申请企业认证

### 地图加载慢
- 检查网络连接质量
- 考虑使用CDN加速
- 优化地图初始化和数据加载逻辑

## 技术支持
- [百度地图JavaScript API文档](http://lbsyun.baidu.com/index.php?title=jspopular3.0)
- [百度地图开放平台帮助中心](http://lbsyun.baidu.com/index.php?title=首页)