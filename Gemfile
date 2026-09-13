source "https://rubygems.org"

# 使用 GitHub Pages 官方 gem，确保本地与线上构建一致
gem "github-pages", group: :jekyll_plugins

# Windows 专用：时区支持
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Windows 专用：文件监听支持
gem "wdm", "~> 0.2.0", :install_if => Gem.win_platform?

# 性能优化
group :jekyll_plugins do
  gem "jekyll-paginate"
  gem "jekyll-seo-tag"
  gem "jekyll-feed"
end
