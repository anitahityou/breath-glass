# 息 · Breath Glass

摄像头吹气起雾 / 空中手势擦玻璃 Demo。原生 JavaScript + Canvas 2D，无构建依赖。

## 运行

在本目录运行 `npm start`，用 Chrome / Edge 打开 http://127.0.0.1:4173 。不要直接双击 HTML。其他设备访问需要 HTTPS。

1. 点击“开启摄像头” 并允许摄像头。首次运行在线下载 MediaPipe 的 WASM 和两个模型。
2. 正对摄像头，自然放松嘴唇，再微张嘴、收拢嘴唇做吹气动作，保持约半秒。
3. 伸出食指或张开手掌，在镜头前移动，擦除对应区域的雾气。握拳暂停擦拭。
4. 设置中的“吹气灵敏度”越大越容易触发；擦拭半径可调，手掌使用更大的擦拭范围。
5. “重置雾气”清空雾气；再次吹气可重新起雾。“关闭摄像头”停止视频。
6. 没有摄像头时打开“设置”，点击“模拟吹气”，等待 3 秒后，用鼠标 / 触屏拖动擦拭。

## 实现

- MediaPipe Tasks Vision 0.10.21，Face Landmarker 输出嘴部关键点及 mouthPucker / mouthFunnel；Hand Landmarker 追踪食指尖 8 或掌心。
- 吹气规则：唇间距 / 嘴宽 + 嘴宽相对个人基线收窄或收唇 blendshape + 270–750ms 持续时间。它判断嘴型，不能测量真实气流；说话或某些表情可能误触发。
- 全屏镜像视频按 cover 裁切，手势坐标使用同一变换。单手追踪，低通平滑；丢失手势或跳变时中断轨迹。
- Canvas 遮罩随吹气逐渐积累；模糊视频、半透明雾色、颗粒、水珠以遮罩合成。柔边圆形笔刷用 destination-out 擦除，痕迹保留至再次起雾或重置。
- 推理限制约 15Hz，渲染独立使用 requestAnimationFrame。推理在主线程运行，低性能设备可能掉帧；生产版可迁移至 Worker。
- GPU 初始化失败自动尝试 CPU。摄像头拒绝、缺失、占用、模型下载失败和运行错误提供提示与重试。
- 视频仅在浏览器内处理，不上传；运行库及模型从 jsDelivr / Google Storage 下载，需可访问对应网络。

## 测试

`npm test`：验证吹气时长、普通张嘴过滤、丢失人脸、帧中断、灵敏度及镜像裁切映射。

## 参考

- [Face Landmarker 官方文档](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [Hand Landmarker 官方文档](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)

## 精简界面与擦拭动画

主界面保留开启摄像头、重置雾气、设置。灵敏度、半径、动画开关和识别状态收进设置，普通提示自动淡出，错误提示保留。

手指 / 手掌首次感应产生扩散圆环，移动带柔光圆形笔刷、短暂拖尾与散开的细小水珠；动画独立于雾气遮罩，淡出后擦除痕迹继续保留。鼠标 / 触屏使用相同效果。支持系统“减少动态效果”，也可在设置关闭动画。
