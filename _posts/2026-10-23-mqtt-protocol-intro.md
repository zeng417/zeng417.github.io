---
layout: post
title: "MQTT 协议入门：用「订阅报纸」的方式理解物联网通信"
date: 2026-10-23 10:00:00 +0800
categories: 物联网
description: "用订阅报纸的生活场景，把 Broker、Topic、QoS、Retained、Will 这些 MQTT 核心概念讲清楚，附最小动手示例。"
---

如果你做过物联网、智能家居，或者只是想让程序在弱网环境下也能稳定收发消息，那你大概率会碰到 MQTT。

很多人第一次看 MQTT 文档，会被一堆名词劝退：Broker、Topic、QoS、Retained、Will、Clean Session……其实它的核心思想非常简单，一句话就能说完：

> **设备不直接互相说话，而是把消息交给一个「中转站」，谁关心什么消息，就提前跟中转站打个招呼。**

这篇文章就用最少的术语，把这个协议讲清楚。

---

## 一、先看一个生活场景

假设你住在一个小区里，想订报纸。

- 你不用认识报社的印刷工人，也不用认识送报员；
- 你只需要去**物业前台**说一句：「我要订《体育日报》」；
- 之后每天报纸印出来，前台会把它放进你的信箱；
- 如果你哪天不想看了，去前台说一句「取消订阅」就行；
- 如果送报员发现你家信箱塞满了没人取，他也能知道你家可能出事了。

MQTT 就是这个模型：

| 生活里的角色 | MQTT 里的角色 |
| --- | --- |
| 物业前台 / 报社发行部 | **Broker（消息代理）** |
| 你（订报纸的人） | **Subscriber（订阅者）** |
| 报社（写报纸的人） | **Publisher（发布者）** |
| 《体育日报》这个栏目 | **Topic（主题）** |
| 每天送一次 / 挂号信 / 必须签收 | **QoS（服务质量等级）** |

所以 MQTT 的世界里只有三种角色：

1. **Publisher**：产生消息的一方，比如温度传感器；
2. **Subscriber**：关心消息的一方，比如手机 App；
3. **Broker**：中间那个「前台」，负责收消息、存消息、转发消息。

Publisher 和 Subscriber **互相不认识**，甚至不知道对方存在。它们只认识 Broker，也只知道 Topic 的名字。这种「解耦」是 MQTT 最大的价值：以后你加十个 App、换掉所有传感器，只要 Topic 不变，谁都不用改代码。

---

## 二、Topic：消息的「地址」

Topic 就是一个用 `/` 分隔的字符串，类似文件路径：

```text
home/livingroom/temperature
factory/line1/machine7/status
```

规则不多，但有几条必须记住：

1. **区分大小写**。`Home/Temp` 和 `home/temp` 是两个不同的 Topic。
2. **不需要提前创建**。直接往一个不存在的 Topic 发消息也行，Broker 不会报错（只是当时没人订阅的话，消息就丢了）。
3. **不能用 `+` 和 `#` 作为普通名字**，这两个符号是通配符，留给订阅时用。

### 订阅时的两个通配符

| 符号 | 含义 | 例子 |
| --- | --- | --- |
| `+` | 匹配**一层** | `home/+/temperature` 能匹配 `home/kitchen/temperature`，但匹配不了 `home/kitchen/floor1/temperature` |
| `#` | 匹配**后面所有层** | `home/#` 能匹配 `home/` 下面的一切 |

注意：`#` 只能放在最后，`home/#/temp` 是非法的。

还有一个容易被忽略的点：以 `$` 开头的 Topic（比如 `$SYS/broker/uptime`）是 Broker 自己用的系统主题，用 `#` 是匹配不到的，得单独写 `$SYS/#`。

---

## 三、QoS：消息到底要「多可靠」

这是 MQTT 最常被问的部分。很多人以为 QoS 是「安全等级」，其实它只回答一个问题：**这条消息允许丢、允许重复，还是必须不丢不重？**

| 等级 | 名字 | 实际效果 | 代价 |
| --- | --- | --- | --- |
| **QoS 0** | 至多一次 | 发出去就不管了，可能丢 | 最快，一条报文就完 |
| **QoS 1** | 至少一次 | 一定送到，但可能重复 | 要等对方回 ACK，可能重发 |
| **QoS 2** | 恰好一次 | 不丢也不重 | 四次握手，最慢最占资源 |

用快递打比方：

- QoS 0 = 普通平信，扔进邮筒就不管了；
- QoS 1 = 挂号信，对方必须签收，但你没收到回执就会再寄一封（所以对方可能收到两封一样的）；
- QoS 2 = 双方反复确认「我收到了」「好，这单结了」，保证只算一次。

**怎么选？** 我的建议很直接：

- 传感器每秒上报的温度、湿度 → **QoS 0**，丢一两个点无所谓；
- 开关灯、下发指令 → **QoS 1**，宁可重复也不能不执行（程序里做好幂等就行）；
- 计费、扣款、关键配置 → **QoS 2**，或者干脆别用 MQTT 传，走 HTTP + 数据库事务更踏实。

顺带说一句：QoS 是**端到端协商**的结果，实际生效的是「发布时指定的 QoS」和「订阅时指定的 QoS」中**较小的那个**。你订阅时写 QoS 2，不代表发消息的人会用 QoS 2 发给你。

---

## 四、两个特别实用的小功能

### 1. Retained（保留消息）

普通消息是「发完就忘」，如果订阅者晚来一步，就什么都收不到。

Retained 消息不一样：Broker 会把这条 Topic 上**最后一条** retained 消息存起来。之后任何新订阅者一订阅，立刻就能收到它。

这特别适合「状态型」数据，比如：

```text
home/livingroom/light/state   →  "on"
```

灯现在到底是开是关，这是状态，不是事件。新来的 App 一订阅就该立刻知道答案，而不是傻等下一次有人开灯。

注意：没人订阅时，retained 消息会一直存在 Broker 里；发一条**空 payload 的 retained 消息**就能把它清掉。

### 2. Will（遗嘱消息）

客户端连上 Broker 时会先「留一句话」：如果我意外掉线了，你替我把这句话发出去。

```text
设备上线   → 设置遗嘱: topic = device/123/status, payload = "offline"
设备掉线   → Broker 自动发布 "offline"
设备正常断开 → 不会发遗嘱（除非你主动要求）
```

这是物联网里做「设备在线状态」的标准做法：上线发一条 `online`（retained），同时设置遗嘱 `offline`。这样别的系统永远能看到设备当前状态。

---

## 五、一次完整的连接过程

抛开细节，MQTT 的连接就四步：

```text
客户端                           Broker
  | ---- CONNECT（我是谁、账号密码、心跳间隔、遗嘱） ---> |
  | <--- CONNACK（欢迎 / 拒绝，附原因码） -------------- |
  | ---- SUBSCRIBE（我要订 home/+/temp，QoS 1） -------> |
  | <--- SUBACK（行，给你 QoS 1） --------------------- |
  |                                                     |
  | <=========== 之后就是 PUBLISH 来 PUBLISH 去 =======> |
```

几个关键点：

- **端口**：明文 1883，TLS 加密 8883，WebSocket 常见 8083 / 8084。生产环境请务必用 TLS，别裸奔。
- **Keep Alive（心跳）**：连接时约定一个秒数，比如 60 秒。客户端闲着没事就发 `PINGREQ`，Broker 回 `PINGRESP`。如果 Broker 在 **1.5 倍**心跳时间内没收到任何包，就判定客户端掉线，于是触发遗嘱消息。
- **Clean Session / Clean Start**：
  - 设为 `true`：每次连接都是全新开始，之前的订阅和离线消息全部清空；
  - 设为 `false`：Broker 帮你记住订阅关系，断线期间 QoS 1/2 的消息会帮你存着，重连后补发。
  - 做「设备偶尔断网但消息不能丢」的场景，这里必须设 `false`（MQTT 5 里改叫 Clean Start + Session Expiry Interval）。

---

## 六、动手试一下（5 分钟）

装好 Mosquitto 之后，开两个终端就能玩起来。

**终端 A：订阅**

```bash
mosquitto_sub -h localhost -t 'home/+/temperature' -v
```

**终端 B：发布**

```bash
mosquitto_pub -h localhost -t 'home/kitchen/temperature' -m '23.5'
```

终端 A 立刻会打印：

```text
home/kitchen/temperature 23.5
```

试试把 Topic 改成 `home/kitchen/floor1/temperature`，因为 `+` 只匹配一层，A 就收不到了——这就是通配符的边界。

再用 Python 写个最小的订阅端（paho-mqtt 2.x）：

```python
import paho.mqtt.client as mqtt

def on_connect(client, userdata, flags, reason_code, properties):
    print("已连接:", reason_code)
    client.subscribe("home/+/temperature", qos=1)

def on_message(client, userdata, msg):
    print(f"{msg.topic} -> {msg.payload.decode()}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message
client.connect("localhost", 1883, keepalive=60)
client.loop_forever()
```

注意 `mqtt.Client()` 那个参数：paho-mqtt 2.x 必须显式指定 `CallbackAPIVersion.VERSION2`，这是从 1.x 升级过来最容易踩的坑。

---

## 七、几个常见误区

**1.「MQTT 很快，所以什么都能传。」**

MQTT 报文头最小只有 2 字节，确实轻。但它不是为传大文件设计的。图片、视频、大 JSON 请走对象存储或 HTTP，MQTT 里只传「去哪个地址拿」。

**2.「消息发出去，对方一定收得到。」**

只有 QoS 1/2 + 持久会话 + 对方真的在线（或 Broker 替你存了）才成立。QoS 0 就是会丢，这不是 bug。

**3.「一个 Topic 只能有一个订阅者。」**

不是。发布/订阅是**一对多**的，同一条消息会分发给所有匹配的订阅者。这也是它和消息队列（点对点消费）最大的区别。

**4.「Broker 挂了就全完了。」**

是的，所以 Broker 是单点，生产环境要么做集群（EMQX、HiveMQ 都支持），要么至少做好监控和重启策略。客户端要写自动重连 + 重新订阅的逻辑。

**5.「MQTT 5 和 3.1.1 随便混用。」**

Broker 通常两个版本都支持，但 MQTT 5 的很多能力（原因码、用户属性、共享订阅、消息过期、请求/响应模式）在 3.1.1 客户端上是拿不到的。新项目建议直接上 5.0，老设备兼容就留在 3.1.1。

---

## 八、什么时候该用 MQTT？

**适合：**

- 设备多、网络差、带宽小（NB-IoT、2G、WiFi 信号弱）；
- 需要服务端主动下发指令（比如远程开关）；
- 一对多的数据分发（一个传感器，多个系统都要看）；
- 长连接、低频小消息。

**不太适合：**

- 请求/响应式的业务接口（老老实实用 HTTP/REST 或 gRPC）；
- 大文件、大 payload；
- 强事务、强一致性的场景（MQTT 给你的是「送达」，不是「业务正确」）。

---

## 九、一句话总结

> MQTT = 一个中心 Broker + 一堆只会「发到某个 Topic」和「订阅某个 Topic」的客户端，加上可选的可靠性等级和一些贴心小功能（保留消息、遗嘱、持久会话）。

理解了「**发布者和订阅者互不认识，只认 Topic**」这一点，剩下的都只是细节。

---

## 附：最小记忆卡片

| 概念 | 一句话 |
| --- | --- |
| Broker | 消息中转站，唯一需要「中心化」的角色 |
| Topic | 消息地址，用 `/` 分层，`+` 一层、`#` 多层 |
| QoS 0/1/2 | 至多一次 / 至少一次 / 恰好一次 |
| Retained | 保存最后一条，新订阅者立刻收到 |
| Will | 掉线时由 Broker 代发的「遗言」 |
| Keep Alive | 心跳，1.5 倍超时判定掉线 |
| Clean Session=false | 断线期间消息帮你存着，重连补发 |
| 端口 | 1883 明文 / 8883 TLS / 8083、8084 WebSocket |
