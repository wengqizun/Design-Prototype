## 项目说明
“原型项目”，里面是一个用VUE技术实现的原型项目，每个 `Prototype/src/pages/*/*.vue` 文件都是一个原型页面

## 运行方式
只启动当前项目：npm run dev

启动所有项目
- 格式：`node start-prototype.mjs --container-dir [容器项目地址] --prototype-dir [原型项目地址] --openapi-dir [OpenAPI项目地址]`
- 示例：在当前目录运行`node start-prototype.mjs --container-dir ../PrototypeContainer --prototype-dir . --openapi-dir ../OpenAPI`