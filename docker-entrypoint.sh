#!/bin/sh
# 把镜像内的初始数据复制到volume（只初始化，不覆盖已有文件）
for f in /app/data_init/*; do
    fname=$(basename "$f")
    if [ ! -f "/app/data/$fname" ]; then
        cp "$f" "/app/data/$fname"
        echo "初始化数据文件: $fname"
    fi
done

exec python app.py
