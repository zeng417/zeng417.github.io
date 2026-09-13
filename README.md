# 我的学习Vlog

基于 Jekyll + GitHub Pages 的个人博客。

## 本地预览

需要先安装 Ruby 和 Jekyll，详见 [jekyllrb.com](https://jekyllrb.com/)。

```bash
bundle install
bundle exec jekyll serve
```

访问 http://127.0.0.1:4000 预览。

## 写文章

在 `_posts` 目录下新建文件，命名格式 `YYYY-MM-DD-标题.md`。

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库，名称为 `zeng417.github.io`
2. 修改 `_config.yml` 中的 `url` 为你的实际地址
3. 推送代码：

```bash
git init
git add .
git commit -m "初始化博客"
git remote add origin https://github.com/zeng417/zeng417.github.io.git
git push -u origin main
```

4. 在仓库 Settings → Pages → Source 选择 main 分支
5. 等待几分钟，访问 https://zeng417.github.io

## 目录结构

```
├── _config.yml        # 站点配置
├── Gemfile            # Ruby 依赖
├── index.html         # 首页
├── about.md           # 关于页面
├── _posts/            # 博客文章
├── _layouts/          # 页面布局
├── _includes/         # 可复用组件
├── _sass/             # 样式变量
└── assets/css/        # 样式文件
```
