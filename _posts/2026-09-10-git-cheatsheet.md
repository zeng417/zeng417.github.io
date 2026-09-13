---
layout: post
title: "Git 常用命令速查"
date: 2026-09-10 10:00:00 +0800
categories: [技术]
description: "日常开发中最常用的 Git 命令整理，附实际使用场景。"
---

## 基础操作

```bash
# 初始化仓库
git init

# 克隆远程仓库
git clone <url>

# 查看状态
git status

# 添加文件到暂存区
git add .
git add specific-file.md

# 提交
git commit -m "提交信息"
```

## 分支管理

```bash
# 查看分支
git branch

# 创建并切换分支
git checkout -b feature/new-page

# 切换分支
git checkout main

# 合并分支
git merge feature/new-page

# 删除分支
git branch -d feature/new-page
```

## 远程操作

```bash
# 添加远程仓库
git remote add origin <url>

# 推送
git push origin main

# 拉取
git pull origin main

# 查看远程仓库
git remote -v
```

## 撤销操作

```bash
# 撤销工作区修改
git checkout -- file

# 撤销暂存区
git reset HEAD file

# 撤销最近一次提交（保留修改）
git reset --soft HEAD~1
```

> 记住：`reset --hard` 是危险操作，会丢弃所有修改，谨慎使用。
