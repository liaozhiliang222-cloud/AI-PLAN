-- SourceMonitor 增加 kind 字段：page=官方页面哈希比对（默认，兼容存量行）；rss=媒体 RSS 条目采集
ALTER TABLE "SourceMonitor" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'page';
