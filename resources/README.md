# 应用图标资源

`electron-builder` 在打包时从这里读取应用图标。本目录已提供 `icon.svg`(矢量源),需要在第一次打包前生成对应平台的位图。

## 一键生成

```bash
npm run icons:generate
```

会同时输出 `icon.png` / `icon.ico` / `icon.icns`。详细方法见 [BlueprintDebugApp/resources/README.md](../../BlueprintDebugApp/resources/README.md),两个 App 工艺完全一致。
