---
layout: post
title: "ROS 2 中的节点与话题学习笔记"
date: 2026-10-10 10:00:00 +0800
categories: ROS2
description: "Ubuntu 22.04 + ROS 2 Humble 环境下，节点与话题的核心概念、常用命令和 Python 发布订阅实战示例。"
---

> 适用环境：Ubuntu 22.04 + ROS 2 Humble
> 适合读者：已经安装 ROS 2，正在学习节点、话题和 Python 发布/订阅通信的初学者。
> 本文结合 ROS 2 Humble 的常见使用场景，整理节点与话题的核心概念、命令和实践示例。

## 1. ROS 2 的基本通信结构

ROS 2 可以把机器人软件拆分成多个相互协作的模块。每个模块可以由一个或多个节点（Node）实现，节点通过话题、服务、动作等机制交换信息。

例如，一个移动机器人可以包含：

- **雷达驱动节点**：读取激光雷达数据。
- **感知节点**：处理雷达数据，识别障碍物。
- **导航节点**：根据地图、定位和障碍物信息计算路线。
- **底盘控制节点**：接收速度指令并控制电机。
- **可视化节点**：把机器人状态显示在 RViz 中。

节点的好处是职责清晰：修改一个模块时，通常不需要把整个机器人程序全部重写。

### 1.1 节点、话题和消息有什么区别？

| 概念 | 作用 | 类比 |
|------|------|------|
| Node（节点） | 执行某项功能的程序单元 | 一个负责特定工作的员工 |
| Topic（话题） | 节点之间传递数据的通信通道 | 一个大家约定好的频道 |
| Message（消息） | 通过话题传递的数据结构 | 频道里实际发送的内容 |
| Publisher（发布者） | 向话题发布消息的节点或节点中的对象 | 发送消息的一方 |
| Subscriber（订阅者） | 订阅话题并处理消息的节点或节点中的对象 | 接收消息的一方 |

举例：键盘控制节点向 `/turtle1/cmd_vel` 发布速度消息，`turtlesim` 节点订阅这个话题并据此移动小乌龟。

## 2. 什么是节点（Node）？

ROS 2 节点通常负责一个相对独立的功能。一个节点可以发布话题、订阅话题、提供服务、调用服务，或使用参数等机制。

### 2.1 启动一个示例节点

如果安装了 `turtlesim`，可在终端运行：

```bash
ros2 run turtlesim turtlesim_node
```

另开一个终端，启动键盘控制节点：

```bash
ros2 run turtlesim turtle_teleop_key
```

此示例中通常会出现两个节点：一个负责显示和控制小乌龟，一个负责读取键盘输入并发布速度指令。

> 如果提示找不到 `turtlesim`，说明当前环境可能未安装对应示例包。可先检查 ROS 2 环境和软件包安装情况；如果 ROS 2 运行在 Docker 容器里，请在对应容器中操作。

### 2.2 查看节点

列出当前发现的节点：

```bash
ros2 node list
```

查看某个节点的详细信息：

```bash
ros2 node info /turtlesim
```

`ros2 node info` 通常可以显示节点的发布话题、订阅话题、服务和动作等信息。节点名称要以 `ros2 node list` 的实际输出为准。

运行节点时也可以重映射名称，例如：

```bash
ros2 run turtlesim turtlesim_node --ros-args --remap __node:=my_turtle
```

此时节点名称会被重映射为 `my_turtle`（实际显示形式以当前环境为准）。

## 3. 什么是话题（Topic）？

话题使用**发布—订阅（Publish-Subscribe）**模型传递消息。发布者向某个话题发送消息，订阅者订阅该话题后接收消息。发布者通常不需要知道订阅者是谁，订阅者也不需要直接调用发布者。

话题通信具有松耦合的特点，适合不断更新的数据，例如：

- `/scan`：激光雷达扫描数据。
- `/odom`：里程计信息。
- `/camera/image_raw`：相机图像。
- `/cmd_vel`：常见的机器人速度指令话题（具体名称取决于项目）。
- `/turtle1/pose`：Turtlesim 中小乌龟的位姿信息。

### 3.1 话题的三个关键要素

1. **话题名称**：例如 `/scan` 或 `/turtle1/cmd_vel`。
2. **消息类型**：例如 `sensor_msgs/msg/LaserScan`、`geometry_msgs/msg/Twist`。
3. **发布与订阅关系**：哪些节点发布，哪些节点订阅。

通信双方需要使用兼容的消息类型；如果类型不一致，通常无法建立正常的消息通信。

### 3.2 常见通信拓扑

- **一对一**：一个发布者向一个订阅者发送数据。
- **一对多**：一个发布者向多个订阅者发送数据，例如多个模块共同读取 `/odom`。
- **多对一**：多个发布者向同一话题发布数据，由订阅者接收。具体应用中要注意同一话题存在多个发布者时的数据语义。
- **多对多**：多个发布者和订阅者通过话题形成更复杂的通信关系。

话题主要用于单向的数据流；如果需要请求—响应，通常考虑服务；如果是持续时间较长、需要反馈或取消的任务，可以考虑动作。

## 4. 常用话题命令

请在已加载 ROS 2 环境的终端执行。若使用 Docker，应在运行仿真的相同 ROS 2 环境中执行。

### 4.1 列出话题

```bash
ros2 topic list
```

同时查看话题类型：

```bash
ros2 topic list -t
```

### 4.2 查看话题详情

```bash
ros2 topic info /turtle1/cmd_vel
```

查看更详细的发布者和订阅者信息：

```bash
ros2 topic info /turtle1/cmd_vel --verbose
```

输出中的 `Type` 表示消息类型；`Publisher count` 表示发布者数量；`Subscription count` 表示订阅者数量。

### 4.3 查看实时消息

```bash
ros2 topic echo /turtle1/pose
```

该命令会持续打印收到的消息。按 `Ctrl+C` 停止。

### 4.4 查看消息类型

```bash
ros2 topic type /turtle1/cmd_vel
```

查看消息类型的字段定义，例如：

```bash
ros2 interface show geometry_msgs/msg/Twist
```

`Twist` 消息包含 `linear` 和 `angular` 两部分，每部分都是三维向量。

### 4.5 查看发布频率

```bash
ros2 topic hz /turtle1/pose
```

它会根据收到的消息估算频率。结果受系统负载、网络、QoS 设置以及订阅端接收情况影响，不能简单地把测量值视为发布端的绝对准确频率。

### 4.6 手动发布一条消息

启动 Turtlesim 后，可在另一个终端执行：

```bash
ros2 topic pub --once /turtle1/cmd_vel geometry_msgs/msg/Twist \
"{linear: {x: 2.0, y: 0.0, z: 0.0}, angular: {x: 0.0, y: 0.0, z: 1.0}}"
```

若当前 ROS 2 版本不接受 `--once`，可先运行 `ros2 topic pub --help` 查看该版本支持的参数。部分版本支持 `-1` 表示只发布一次。

按固定频率持续发布：

```bash
ros2 topic pub --rate 1 /turtle1/cmd_vel geometry_msgs/msg/Twist \
"{linear: {x: 1.0}, angular: {z: 0.0}}"
```

以上命令会持续发布速度指令。测试结束时按 `Ctrl+C` 停止。

## 5. 使用 Python 编写发布者和订阅者

命令行工具适合观察和调试；要开发自己的机器人功能，就需要编写节点。下面给出一个简单的字符串发布—订阅示例，不依赖网络下载或语音合成。

### 5.1 创建工作空间和功能包

先确保 ROS 2 Humble 环境已加载，然后执行：

```bash
mkdir -p ~/topic_ws/src
cd ~/topic_ws/src

ros2 pkg create demo_python_topic \
  --build-type ament_python \
  --dependencies rclpy std_msgs
```

### 5.2 编写发布者

创建文件：

`~/topic_ws/src/demo_python_topic/demo_python_topic/talker.py`

写入：

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class Talker(Node):
    def __init__(self):
        super().__init__('talker')
        self.publisher_ = self.create_publisher(String, 'chatter', 10)
        self.timer_ = self.create_timer(1.0, self.publish_message)
        self.count = 0

    def publish_message(self):
        msg = String()
        msg.data = f'Hello ROS 2: {self.count}'
        self.publisher_.publish(msg)
        self.get_logger().info(f'发布: {msg.data}')
        self.count += 1


def main(args=None):
    rclpy.init(args=args)
    node = Talker()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

这个节点每秒向 `chatter` 话题发布一条 `String` 消息。`create_publisher()` 的三个参数依次是消息类型、话题名称和队列深度。

### 5.3 编写订阅者

创建文件：

`~/topic_ws/src/demo_python_topic/demo_python_topic/listener.py`

写入：

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class Listener(Node):
    def __init__(self):
        super().__init__('listener')
        self.subscription = self.create_subscription(
            String,
            'chatter',
            self.listener_callback,
            10
        )

    def listener_callback(self, msg):
        self.get_logger().info(f'收到: {msg.data}')


def main(args=None):
    rclpy.init(args=args)
    node = Listener()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

订阅者订阅同一个 `chatter` 话题；收到消息时，ROS 2 会调用 `listener_callback()`。

### 5.4 注册可执行入口

打开功能包的 `setup.py`，找到 `entry_points` 中的 `console_scripts`，配置为：

```python
entry_points={
    'console_scripts': [
        'talker = demo_python_topic.talker:main',
        'listener = demo_python_topic.listener:main',
    ],
},
```

保留 `setup.py` 中其他已有配置，不要把整个文件替换成这段片段。

### 5.5 编译并运行

```bash
cd ~/topic_ws
colcon build
source install/setup.bash
```

终端一运行发布者：

```bash
ros2 run demo_python_topic talker
```

终端二（同样加载 ROS 2 环境，并执行工作空间的 `source`）运行订阅者：

```bash
source ~/topic_ws/install/setup.bash
ros2 run demo_python_topic listener
```

终端三可以查看话题：

```bash
ros2 topic list
ros2 topic info /chatter
ros2 topic echo /chatter
```

预期现象：发布者持续打印发布日志，订阅者持续打印收到的字符串。若命令找不到可执行程序，检查 `setup.py`、文件名、包目录和构建输出。

## 6. 如何理解节点与话题的关系？

可以把关系概括成：

```text
talker 节点
    |
    | 发布 String 消息
    v
/chatter 话题
    |
    | 订阅并接收消息
    v
listener 节点
```

话题不是某个节点的"私有变量"，而是通信图中的命名通道。发布者和订阅者通过话题名称及消息类型匹配来进行通信。

在真实机器人中也可以用同样的思路分析：

```text
传感器驱动节点 --发布 /scan--> 感知/导航节点
导航节点       --发布 /cmd_vel--> 底盘控制节点
状态节点       --发布 /odom--> 可视化或定位相关节点
```

这只是常见示意，实际话题名称、消息类型和节点分工要以你的项目为准。

## 7. 常见问题排查

### 7.1 `ros2 topic list` 看不到预期话题

- 确认相关发布者或订阅者节点正在运行。
- 确认终端加载了正确的 ROS 2 环境。
- 如果使用 Docker，确认命令是在正确的容器中执行。
- 检查 ROS 2 Domain ID、网络和发现配置是否一致。

### 7.2 话题存在，但 `echo` 没有输出

- 可能当前没有节点发布消息。
- 可能发布频率较低，等待一会儿再观察。
- 检查话题名称和消息类型是否正确。
- 检查 QoS 是否兼容，尤其是传感器数据常用的 QoS 配置。

### 7.3 `ros2 topic pub` 报消息格式错误

- 先执行 `ros2 topic type <话题名>` 查看类型。
- 再用 `ros2 interface show <消息类型>` 查看字段。
- 检查命令中的 YAML 缩进、冒号、括号和引号。
- 查看当前发行版的 `ros2 topic pub --help`。

### 7.4 编译后运行提示找不到包或可执行程序

- 确认 `colcon build` 成功完成。
- 在当前终端执行 `source ~/topic_ws/install/setup.bash`。
- 检查 `setup.py` 中的 `console_scripts` 是否配置正确。
- 检查 Python 文件是否放在功能包内部的 Python 模块目录中。

## 8. 建议的学习顺序

1. 先运行 Turtlesim，练习 `ros2 node list` 和 `ros2 node info`。
2. 练习 `ros2 topic list -t`、`echo`、`info`、`type` 和 `hz`。
3. 使用 `ros2 topic pub` 手动发送速度指令，观察小乌龟的变化。
4. 自己创建 Python 发布者和订阅者，让它们通过 `chatter` 通信。
5. 回到自己的 Gazebo / RViz 仿真项目，用同样的命令检查实际节点和话题。

学习重点不是背住所有命令，而是能够回答三个问题：**哪个节点发布数据？数据通过哪个话题传递？哪个节点订阅并处理数据？**

## 9. 参考博客

本文为综合整理和重新编写，示例经过简化；具体实现细节请以自己的 ROS 2 Humble 环境测试结果为准。

1. 鱼香 ROS：《〖ROS2机器人入门到实战〗ROS2节点介绍》
   https://blog.csdn.net/qq_27865227/article/details/131365956
2. CSDN 博主：《ROS2教程 04 话题Topic》
   https://blog.csdn.net/m0_56661101/article/details/124863457
3. AtomGit / GitCode 页面：《ROS2 入门教程------理解话题（Topic）：从零到实战的完整指南》
   https://gitcode.csdn.net/6a28cc3e10ee7a33f279fb47.html
4. 博客园 ljbguanli：《〖ROS2学习笔记〗话题通信篇：python话题订阅与发布 - 详解》
   https://www.cnblogs.com/ljbguanli/p/19165276

其中，节点基础、常用话题命令和 Python 发布—订阅的内容进行了归纳整合；本文并非对原文的逐段复制。
