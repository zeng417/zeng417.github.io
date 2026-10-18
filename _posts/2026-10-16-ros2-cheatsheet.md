---
layout: post
title: "ROS 2 速查手册：节点、话题、服务与参数一次搞定"
date: 2026-10-16 10:00:00 +0800
categories: ROS2
description: "ROS 2 Humble 核心概念与实战速查：节点、话题、服务、参数、Launch 文件，附 Python 和 C++ 最简模板。"
---

学 ROS 2 的时候，最头疼的不是某个概念难，而是东西太散——节点、话题、服务、参数、Launch，每个都记一点，但真要写代码的时候，又想不起来完整的写法。

这篇笔记把 ROS 2 Humble 最常用的四块内容整合到一起：**节点、话题、服务、参数**。从概念到命令行，再到 Python 和 C++ 的最简模板，最后附上常见坑点排查。可以当速查手册用，需要的时候翻一翻。

> 适用环境：ROS 2 Humble（Ubuntu 22.04 / Docker 中的 Humble 均适用）

---

## 一、核心概念速记

先把名词都过一遍，建立整体认知。

| 名词 | 含义 |
|------|------|
| ROS Graph（计算图） | ROS 2 运行时的节点、话题、服务、动作等通信关系的集合；DDS 负责底层发现与通信。 |
| Node（节点） | 执行具体工作的程序单元，比如读传感器、算控制量、发状态。建议一个节点聚焦一个职责。 |
| Package（功能包） | ROS 2 的代码组织与构建单元，包含源码、`package.xml`，以及 C++ 的 `CMakeLists.txt` 或 Python 的 `setup.py`。 |
| Workspace（工作空间） | 放多个功能包并统一编译的目录，典型结构 `dev_ws/src/`。 |
| Topic（话题） | 发布/订阅通信通道，适合连续数据流，如传感器数据、位置、速度。 |
| Publisher（发布者） | 向指定话题发布某种消息类型的数据。 |
| Subscriber（订阅者） | 订阅话题；收到消息后执行回调函数。 |
| Message（消息） | 话题传输的结构化、强类型数据，如 `std_msgs/msg/String`。收发双方类型必须兼容。 |
| Service（服务） | 请求/响应式通信：客户端发请求，服务端处理后返回响应。适合查询或短操作。 |
| Client / Server | Service 的请求方叫客户端，提供处理逻辑的叫服务端。 |
| Parameter（参数） | 节点的可配置值，如速度上限、阈值、话题名；参数属于具体节点。 |
| Launch（启动文件） | 用一个文件统一启动多个节点，可传参数、设命名空间、做重映射。 |
| Callback（回调） | 订阅消息、服务请求、定时器等事件发生时执行的函数。 |
| Executor / `spin` | 执行器负责调度回调；`spin()` 持续等待并处理事件。 |

### Topic、Service、Parameter 怎么选？

- **Topic**：持续、异步的数据流。发布者不必知道订阅者是谁。
- **Service**：一次请求对应一次响应。适合"查一下""执行一个短操作并返回结果"。
- **Parameter**：保存节点运行配置。用来改阈值、速度、模式等，不是高频数据通道。
- **Launch**：负责组织启动过程，不是节点间的通信机制。

---

## 二、环境与工作空间

### 1. 加载 ROS 2 Humble

每次新开终端都要加载环境。如果用 Docker 容器，先进容器再执行。

```bash
source /opt/ros/humble/setup.bash
echo $ROS_DISTRO       # 预期输出 humble
```

### 2. 创建工作空间

```bash
mkdir -p ~/dev_ws/src
cd ~/dev_ws
colcon build
source install/setup.bash
```

### 3. 常用编译命令

```bash
# 在工作空间根目录执行
colcon build

# 只编译指定功能包
colcon build --packages-select py_node_demo

# 编译后加载工作空间
source install/setup.bash
```

> 💡 **排坑**：编译要在工作空间根目录执行，不是在 `src/` 里。改完代码通常要重新编译再 `source`。每个新终端都得重新 `source`。

---

## 三、节点 Node

### 1. 节点是什么

节点是运行中的功能单元。一个可执行文件技术上可以创建多个节点，但工程上建议**一个节点承担一个清晰职责**，方便调试、复用和维护。

### 2. 命令行速查

```bash
ros2 node list                 # 查看正在运行的节点
ros2 node info /talker         # 查看节点的发布、订阅、服务等信息
ros2 run <包名> <可执行文件名>  # 启动一个可执行节点
```

### 3. 创建功能包

```bash
# Python 包
cd ~/dev_ws/src
ros2 pkg create --build-type ament_python py_node_demo --dependencies rclpy std_msgs

# C++ 包
ros2 pkg create --build-type ament_cmake cpp_node_demo --dependencies rclcpp std_msgs
```

- Python 用 `rclpy`，C++ 用 `rclcpp`
- `package.xml` 声明功能包依赖
- Python 包通过 `setup.py` 的 `console_scripts` 注册可执行入口
- C++ 包通过 `CMakeLists.txt` 配置编译和安装目标

### 4. Python 最简节点

`py_node_demo/py_node_demo/hello_node.py`：

```python
import rclpy
from rclpy.node import Node

class HelloNode(Node):
    def __init__(self):
        super().__init__('hello_node')
        self.get_logger().info('Hello ROS 2 Humble')

def main(args=None):
    rclpy.init(args=args)
    node = HelloNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

在 `setup.py` 的 `entry_points` 中注册：

```python
entry_points={
    'console_scripts': [
        'hello_node = py_node_demo.hello_node:main',
    ],
},
```

### 5. C++ 最简节点

`cpp_node_demo/src/hello_node.cpp`：

```cpp
#include <memory>
#include "rclcpp/rclcpp.hpp"

class HelloNode : public rclcpp::Node
{
public:
  HelloNode() : Node("hello_node")
  {
    RCLCPP_INFO(this->get_logger(), "Hello ROS 2 Humble");
  }
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<HelloNode>());
  rclcpp::shutdown();
  return 0;
}
```

`CMakeLists.txt` 至少配置：

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)

add_executable(hello_node src/hello_node.cpp)
ament_target_dependencies(hello_node rclcpp)

install(TARGETS
  hello_node
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
```

### 6. 工程实践建议

- 把节点封装成类：构造函数里创建发布者、订阅者、定时器、参数；回调函数实现逻辑
- 工作空间可以有多个功能包，但每个包职责明确，依赖在 `package.xml` 中声明
- 别把所有功能塞进一个巨大节点，按职责拆分更清晰

---

## 四、话题 Topic

### 1. 话题通信怎么工作

发布者创建消息 → 发布到话题 → ROS 2 中间件传输 → 订阅者收到消息 → 执行回调。

话题是单向、异步的发布/订阅模式。一个发布者可以有多个订阅者，多个发布者也可以往同一话题发，但消息类型必须兼容。

### 2. 高频命令

```bash
ros2 topic list                         # 列出话题
ros2 topic list -t                      # 列出话题及消息类型
ros2 topic info /chatter                # 查看发布者、订阅者数量
ros2 topic echo /chatter                # 实时打印消息
ros2 topic hz /chatter                  # 估算发布频率
ros2 topic bw /chatter                  # 估算带宽
ros2 topic pub --once /chatter std_msgs/msg/String "{data: 'hello'}"
ros2 topic pub -r 5 /chatter std_msgs/msg/String "{data: 'hi'}"
ros2 interface show std_msgs/msg/String # 查看消息结构
```

> 💡 **队列深度**（比如 `10`）控制待处理消息的缓存数量。实时控制场景要结合数据时效性选择 QoS，不是所有话题都填 `10` 就完事了。

### 3. Python 发布者与订阅者模板

**发布者 `talker.py`**：

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class Talker(Node):
    def __init__(self):
        super().__init__('talker')
        self.pub = self.create_publisher(String, '/chatter', 10)
        self.count = 0
        self.timer = self.create_timer(0.5, self.publish_msg)  # 约 2 Hz

    def publish_msg(self):
        msg = String()
        msg.data = f'Hello {self.count}'
        self.pub.publish(msg)
        self.get_logger().info(f'Published: {msg.data}')
        self.count += 1

def main(args=None):
    rclpy.init(args=args)
    node = Talker()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

**订阅者 `listener.py`**：

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class Listener(Node):
    def __init__(self):
        super().__init__('listener')
        self.sub = self.create_subscription(
            String, '/chatter', self.callback, 10)

    def callback(self, msg):
        self.get_logger().info(f'Received: {msg.data}')

def main(args=None):
    rclpy.init(args=args)
    node = Listener()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### 4. C++ 发布者与订阅者模板

**发布者 `talker.cpp`**：

```cpp
#include <chrono>
#include <memory>
#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

using namespace std::chrono_literals;

class Talker : public rclcpp::Node
{
public:
  Talker() : Node("talker"), count_(0)
  {
    pub_ = create_publisher<std_msgs::msg::String>("/chatter", 10);
    timer_ = create_wall_timer(500ms, [this]() { publish_msg(); });
  }

private:
  void publish_msg()
  {
    std_msgs::msg::String msg;
    msg.data = "Hello " + std::to_string(count_++);
    RCLCPP_INFO(get_logger(), "Published: %s", msg.data.c_str());
    pub_->publish(msg);
  }

  rclcpp::Publisher<std_msgs::msg::String>::SharedPtr pub_;
  rclcpp::TimerBase::SharedPtr timer_;
  size_t count_;
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<Talker>());
  rclcpp::shutdown();
  return 0;
}
```

**订阅者 `listener.cpp`**：

```cpp
#include <memory>
#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

class Listener : public rclcpp::Node
{
public:
  Listener() : Node("listener")
  {
    sub_ = create_subscription<std_msgs::msg::String>(
      "/chatter", 10,
      [this](std_msgs::msg::String::SharedPtr msg) {
        RCLCPP_INFO(get_logger(), "Received: %s", msg->data.c_str());
      });
  }

private:
  rclcpp::Subscription<std_msgs::msg::String>::SharedPtr sub_;
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<Listener>());
  rclcpp::shutdown();
  return 0;
}
```

> 💡 C++ 包需要在 `CMakeLists.txt` 中对目标调用 `ament_target_dependencies(... rclcpp std_msgs)`，并用 `install(TARGETS ...)` 安装可执行文件。Python 包在 `setup.py` 注册入口即可。

---

## 五、服务 Service

### 1. 服务怎么工作

服务是请求/响应模式：

1. 客户端发送 Request
2. 服务端回调处理请求
3. 服务端返回 Response
4. 客户端收到响应后处理结果

服务适合查询、触发短操作、获取一次性结果。**耗时很长、需要持续反馈的任务，应该用 Action 而不是 Service。**

### 2. 常见内置服务类型

```bash
ros2 interface show std_srvs/srv/SetBool
ros2 interface show std_srvs/srv/Trigger
```

- `std_srvs/srv/SetBool`：请求带布尔值，响应含 `success` 和 `message`
- `std_srvs/srv/Trigger`：无额外参数，触发后返回是否成功

服务命令速查：

```bash
ros2 service list
ros2 service type /some_service
ros2 service info /some_service
ros2 service call /some_service std_srvs/srv/Trigger "{}"
ros2 interface show std_srvs/srv/Trigger
```

### 3. Python 服务端与客户端模板

**服务端 `set_bool_server.py`**：

```python
import rclpy
from rclpy.node import Node
from std_srvs.srv import SetBool

class SetBoolServer(Node):
    def __init__(self):
        super().__init__('set_bool_server')
        self.enabled = False
        self.srv = self.create_service(SetBool, '/set_enabled', self.handle)

    def handle(self, request, response):
        self.enabled = request.data
        response.success = True
        response.message = f'enabled={self.enabled}'
        self.get_logger().info(response.message)
        return response

def main(args=None):
    rclpy.init(args=args)
    node = SetBoolServer()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

**客户端 `set_bool_client.py`**：

```python
import rclpy
from rclpy.node import Node
from std_srvs.srv import SetBool

class SetBoolClient(Node):
    def __init__(self):
        super().__init__('set_bool_client')
        self.cli = self.create_client(SetBool, '/set_enabled')

    def send_request(self, value):
        while not self.cli.wait_for_service(timeout_sec=1.0):
            self.get_logger().info('Waiting for service...')
        request = SetBool.Request()
        request.data = value
        future = self.cli.call_async(request)
        future.add_done_callback(self.done)

    def done(self, future):
        try:
            response = future.result()
            self.get_logger().info(
                f'success={response.success}, message={response.message}')
        except Exception as exc:
            self.get_logger().error(str(exc))

def main(args=None):
    rclpy.init(args=args)
    node = SetBoolClient()
    node.send_request(True)
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### 4. C++ 服务端核心写法

```cpp
#include <memory>
#include "rclcpp/rclcpp.hpp"
#include "std_srvs/srv/set_bool.hpp"

class SetBoolServer : public rclcpp::Node
{
public:
  SetBoolServer() : Node("set_bool_server"), enabled_(false)
  {
    srv_ = create_service<std_srvs::srv::SetBool>(
      "/set_enabled",
      [this](const std::shared_ptr<std_srvs::srv::SetBool::Request> req,
             std::shared_ptr<std_srvs::srv::SetBool::Response> res) {
        enabled_ = req->data;
        res->success = true;
        res->message = enabled_ ? "enabled=true" : "enabled=false";
        RCLCPP_INFO(get_logger(), "%s", res->message.c_str());
      });
  }

private:
  bool enabled_;
  rclcpp::Service<std_srvs::srv::SetBool>::SharedPtr srv_;
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<SetBoolServer>());
  rclcpp::shutdown();
  return 0;
}
```

C++ 客户端的套路：`create_client<ServiceT>()` → `wait_for_service()` → 构造 Request → `async_send_request()` → 处理 Future。**用异步调用时，节点必须在 spin 中运行，响应回调才能执行。**

### 5. 自定义服务接口

自定义 `.srv` 文件用 `---` 分隔请求和响应：

```text
# srv/AddTwoInts.srv
int64 a
int64 b
---
int64 sum
```

接口包需要用 `rosidl_default_generators` 生成代码，在 `package.xml` / `CMakeLists.txt` 中声明依赖。实际项目中通常把自定义消息、服务、动作接口放在**单独的接口包**里，避免业务包耦合。

> 💡 **排坑**：服务端和客户端必须同名、类型兼容。服务没启动时客户端要等待或处理超时。不要在服务回调里做长时间阻塞操作。

---

## 六、参数 Parameter

### 1. 参数是干嘛的

参数是节点的运行配置。常见场景：速度上限、检测阈值、控制模式、功能开关。参数有名称和类型，要在节点中声明，然后读取或更新。

### 2. 命令行操作

```bash
ros2 param list /my_node
ros2 param get /my_node use_sim_time
ros2 param describe /my_node use_sim_time
ros2 param set /my_node use_sim_time false
ros2 param dump /my_node
ros2 param load /my_node params.yaml
```

节点必须正在运行、参数已声明，才能查询或设置。`ros2 param set` 改的是运行中的值；要持久保存，用 YAML 文件在启动时加载。

### 3. Python 参数示例

```python
import rclpy
from rclpy.node import Node

class ConfigNode(Node):
    def __init__(self):
        super().__init__('config_node')
        self.declare_parameter('speed_limit', 1.0)
        speed = self.get_parameter('speed_limit').value
        self.get_logger().info(f'speed_limit={speed}')

def main(args=None):
    rclpy.init(args=args)
    node = ConfigNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### 4. C++ 参数示例

```cpp
#include <memory>
#include "rclcpp/rclcpp.hpp"

class ConfigNode : public rclcpp::Node
{
public:
  ConfigNode() : Node("config_node")
  {
    declare_parameter<double>("speed_limit", 1.0);
    const double speed = get_parameter("speed_limit").as_double();
    RCLCPP_INFO(get_logger(), "speed_limit=%.2f", speed);
  }
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<ConfigNode>());
  rclcpp::shutdown();
  return 0;
}
```

> 💡 **排坑**：ROS 2 参数一般要**先声明再访问**。设置的类型要和声明类型匹配。参数更新回调适合做校验，但别在回调里搞复杂阻塞操作。

---

## 七、Launch 启动文件

### 1. Launch 是干嘛的

Launch 可以一次启动多个节点、传递参数、设置命名空间和重映射，适合组织完整应用。Launch 文件本身不是通信方式。

### 2. 最简 Launch 模板

`launch/demo.launch.py`：

```python
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        Node(
            package='py_node_demo',
            executable='hello_node',
            name='hello_node',
            output='screen',
        ),
    ])
```

运行：

```bash
ros2 launch py_node_demo demo.launch.py
```

使用前需要在 Python 包中安装 `launch/` 文件（`setup.py` 配置 `data_files`），并确保包已编译和加载。

### 3. 通过 Launch 传参

```python
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        Node(
            package='py_node_demo',
            executable='hello_node',
            name='hello_node',
            parameters=[{'speed_limit': 1.5}],
            output='screen',
        ),
    ])
```

也可以从 YAML 文件加载：

```yaml
hello_node:
  ros__parameters:
    speed_limit: 1.5
```

启动多个节点时，往 `LaunchDescription` 里放多个 `Node(...)` 就行。节点名、命名空间、参数文件和重映射规则要和目标节点配置一致。

---

## 八、Spin、回调与多线程

- `rclpy.spin(node)` / `rclcpp::spin(node)` 让执行器持续处理节点事件
- **没有 spin 就没有回调**——订阅回调、定时器回调都不会执行
- 回调尽量短小；耗时计算考虑拆分或用异步流程
- 默认单线程执行器一次处理一个回调；多线程执行器允许并发，但是否并发还受 callback group 影响
- 多线程访问共享变量要加锁，别在锁内做长时间操作
- Python 的多线程还受 GIL 影响，不能简单等同于 C++ 多线程性能

---

## 九、常见问题排查清单

1. **`ros2 run` 找不到包或节点**：确认已 `source /opt/ros/humble/setup.bash`，并在工作空间编译后 `source install/setup.bash`
2. **改了代码运行的还是旧版本**：检查是否重新编译、是否 source 了正确工作空间、是不是在旧容器/旧终端里
3. **话题收不到消息**：先跑 `ros2 topic list -t`，检查话题名、消息类型、QoS、节点是否在同一 ROS 2 网络
4. **服务调用失败**：用 `ros2 service list` 和 `ros2 service type` 确认服务端在运行且类型一致
5. **参数查询失败**：检查节点是否在线、参数是否已声明、参数名拼写对不对
6. **Launch 找不到文件**：检查 Launch 文件是否安装到包中，文件名和命令是否一致
7. **回调不执行**：检查有没有调 `spin`、节点还在不在运行、事件有没有真正到达
8. **节点重名**：同名节点会让调试混乱；必要时设唯一名称或命名空间
9. **服务回调阻塞**：别在回调里无限等待另一个需要同一执行器处理的事件，可能死锁
10. **QoS 不兼容**：话题名和消息类型都对，但发布者与订阅者 QoS 不兼容也收不到数据

---

## 十、一句话总结

最后用几句话把核心概念串起来，方便记忆：

- **Node**：谁在做事
- **Topic**：持续把数据发给感兴趣的人
- **Service**：请求一次，响应一次
- **Parameter**：节点可配置的值
- **Launch**：统一启动和配置多个节点
- **Package**：代码与依赖的组织单元
- **Workspace**：多个功能包的编译工作区
- **Spin / Executor**：让回调有机会被执行

学 ROS 2 不用背所有命令，但要能回答三个问题：**谁在发数据？通过什么发？谁来收？** 搞清楚这三个问题，大部分场景都能搞定。
