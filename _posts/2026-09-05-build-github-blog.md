---
layout: post
title: "从零搭建 GitHub Pages 博客"
date: 2026-09-05 09:00:00 +0800
categories: [技术]
description: "手把手教你用 Jekyll + GitHub Pages 搭建免费个人博客。"
---

## 为什么选择 GitHub Pages

GitHub Pages 提供：

- **免费托管** —— 不花一分钱
- **自定义域名** —— 支持绑定自己的域名
- **自动 HTTPS** —— 安全证书自动配置
- **与 Git 集成** —— 推送即部署

## 搭建步骤

### 1. 创建仓库

仓库名必须是 `用户名.github.io`，例如 `zeng417.github.io`。

### 2. 初始化 Jekyll 项目

```bash
jekyll new myblog
cd myblog
```

### 3. 配置 _config.yml

设置标题、描述、作者等基本信息。

### 4. 写文章

在 `_posts` 目录下创建文件，命名格式 `YYYY-MM-DD-标题.md`。

### 5. 推送到 GitHub

```bash
git init
git add .
git commit -m "初始化博客"
git remote add origin https://github.com/用户名/用户名.github.io.git
git push -u origin main
```

### 6. 配置 Pages

在仓库 Settings → Pages 中选择部署方式即可。

## 总结

整个过程不到 30 分钟就能搞定。之后每次写新文章，只需要在 `_posts` 下新建文件，`git push` 即可自动上线。
